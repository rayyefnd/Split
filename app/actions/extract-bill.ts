'use server'

import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"

const ai = new GoogleGenAI ({ apiKey: process.env.GEMINI_API_KEY })

interface ExtractedItem {
  name: string
  original_price: number | null
  price: number
  quantity: number
}

interface ExtractedReceipt {
  items: ExtractedItem[]
  subtotal: number | null
  tax: number | null
  service_charge: number | null
  discount: number | null
  total: number | null
}

export async function extractedItems(billId: string, imageBase64: string, mediaType: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are reading a photo of a restaurant/store receipt, possibly in Indonesian or English, possibly slightly blurry or at an angle.

          Extract receipt data into a single JSON object with this exact shape:

          {
            "items": [{ "name": string, "price": number, "quantity": number, "original_price": number || null, }],
            "subtotal": number | null,
            "tax": number | null,
            "service_charge": number | null,
            "total": number | null
          }

          Rules for "items":
          1. Include only actual purchased items (food, drinks, goods).
          2. EXCLUDE from items: subtotal, tax (PPN/pajak), service charge, discount lines, rounding, "total", "kembalian" (change), and payment method lines — these go in the summary fields instead, not in items.
          3. If a line shows a quantity and a total price, divide to get the per-unit price, and set "quantity" to the actual count.
          4. If an item shows BOTH an original price and a discounted price (e.g. a crossed-out price next to a lower one, or "was X now Y"), set "price" to the final discounted price actually charged, and "original_price" to the pre-discount price. If there's no visible discount on that item, set "original_price" to null.
          5. If text is unclear, make your best reasonable guess rather than skipping the item.
          6. If the image contains no readable receipt/items at all, return items: [] and null for every summary field.

          Rules for the summary fields:
          7. "subtotal" = the pre-tax, pre-service-charge sum of items, if shown on the receipt. If not shown, set null (don't calculate it yourself).
          8. "discount" = total discount amount, if shown (e.g. "Diskon", "Disc", promo deductions). Otherwise null. Always return as a positive number representing the amount subtracted, not negative.
          9. "tax" = PPN/pajak amount, if shown. Otherwise null.
          10. "service_charge" = service charge amount, if shown. Otherwise null.
          11. "total" = the final total actually paid, if shown. Otherwise null.

          Respond with ONLY the JSON object described above, no markdown code fences, no explanation, no extra text before or after.`,
          },
          
          {
            inlineData: {
              mimeType: mediaType,
              data: imageBase64,
            }
          }
        ]
      }
    ],
  })

  const content = response.text

  if(!content) {
    throw new Error ('No response from API')
  }

  const cleaned = content.replace(/```json|```/g, '').trim()
  let parsed: ExtractedReceipt

  try {
    parsed = JSON.parse(cleaned)
    console.log('Parsed receipt:', JSON.stringify(parsed, null, 2))
  } catch {
    throw new Error('Could not parse receipt data')
  }

  const supabase = await createClient()

  const { data: savedItems, error: itemsError } = await supabase
    .from('items')
    .insert(parsed.items.map((item) => ({ bill_id: billId, ...item })))
    .select()

  if (itemsError) throw new Error (itemsError.message)

  const { error: billError } = await supabase
    .from('bills')
    .update({
      subtotal: parsed.subtotal,
      tax: parsed.tax,
      service_charge: parsed.service_charge,
      discount: parsed.discount,
      total_amount: parsed.total,
    })
    .eq('id', billId)
  
  
  
  if (billError) throw new Error(billError.message)

  return savedItems
}