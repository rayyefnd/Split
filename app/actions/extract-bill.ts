'use server'

import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"

const ai = new GoogleGenAI ({ apiKey: process.env.GEMINI_API_KEY })

interface ExtractedItem {
  name: string
  price: number
  quantity: number
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

          Extract every purchased line item into a JSON array. Follow these rules exactly:

          1. Include only actual purchased items (food, drinks, goods).
          2. EXCLUDE: subtotal, tax (PPN/pajak), service charge, discount lines, rounding, "total", "kembalian" (change), and payment method lines.
          3. If a line shows a quantity and a total price (e.g. "2x Nasi Goreng   50.000"), divide to get the per-unit price, and set "quantity" to the actual count.
          4. Numbers may use "." or "," as thousands separators (e.g. "25.000" = 25000, not 25.0). Convert all prices to plain numbers with no separators.
          5. If text is unclear, make your best reasonable guess rather than skipping the item.
          6. If the image contains no readable receipt/items at all, return an empty array: []

          Respond with ONLY the JSON array, no markdown code fences, no explanation, no extra text before or after. Format:
          [{"name": "Nasi Goreng", "price": 25000, "quantity": 2}]`,
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
  let items: ExtractedItem[]

  try {
    items = JSON.parse(cleaned)

  } catch {
    throw new Error('Could not parse receipt data')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .insert(items.map((item) => ({ bill_id: billId, ...item })))
    .select()

  if (error) throw new Error (error.message)
  return data
}