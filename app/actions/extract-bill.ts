'use server'

import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { error } from "console"

// const ai = new GoogleGenAI ({ apiKey: process.env.GEMINI_API_KEY })

const OCR_URL = process.env.OCR_SERVICE_URL ?? 'http://localhost:8000'
// const USE_GEMINI_FALLBACK = process.env.GEMINNI_FALLBACK !== 'off'

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

//Tesseract CODE
interface OcrAdjustment {
  label: string
  kind: 'charge' | 'discount' | 'rounding'
  amount: number
}

interface OcrResponse {
  bill: {
    items: { qty: number; name: string; line_total: number; unit_price: number }[]
    subtotal: number | null
    adjustments: OcrAdjustment[]
    total: number | null
  }
  validation: { ok: boolean; issues: string[]; fixes: string[] }
  debug?: { raw_text: string; preprocess: string; psm: number }
}

function toExtractedReceipt(ocr: OcrResponse): ExtractedReceipt {
  const sum = (rows: OcrAdjustment[]) =>
    rows.length ? rows.reduce((s, r) => s + Math.abs(r.amount), 0) : null

  const isService = (a: OcrAdjustment) => /service|servis|svc/i.test(a.label)
  const charges = ocr.bill.adjustments.filter((a) => a.kind === 'charge')

  return {
    items: ocr.bill.items.map((i) => ({
      name: i.name,
      quantity: i.qty,
      price: i.unit_price,
      original_price: null,
    })),
    subtotal: ocr.bill.subtotal,
    tax: sum(charges.filter((a) => !isService(a))),
    service_charge: sum(charges.filter(isService)),
    discount: sum(ocr.bill.adjustments.filter((a) => a.kind === 'discount')),
    total: ocr.bill.total,
  }
}

async function scanWithTesseract(imageBase64: string, mediaType: string) {
  const form = new FormData()
  form.append(
    'file',
    new Blob([Buffer.from(imageBase64, 'base64')], { type: mediaType }),
    'receipt.jpg'
  )

  const res = await fetch(`${OCR_URL}/ocr`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000), // OCR can take up to ~30s
  })
  if (!res.ok) throw new Error(`OCR service returned ${res.status}`)

  const ocr = (await res.json()) as OcrResponse
  const receipt = toExtractedReceipt(ocr)
  return {
    receipt,
    ok: ocr.validation.ok && receipt.items.length > 0,
    issues: ocr.validation.issues,
  }
}

// Gemini CODE
// async function scanWithGemini(imageBase64: string, mediaType: string): Promise<ExtractedReceipt> {
//   const response = await ai.models.generateContent({
//     model: 'gemini-3.6-flash',
//     contents: [
//       {
//         role: 'user',
//         parts: [
//           {
//             text: `You are reading a photo of a restaurant/store receipt, possibly in Indonesian or English, possibly slightly blurry or at an angle.

//           Extract receipt data into a single JSON object with this exact shape:

//           {
//             "items": [{ "name": string, "price": number, "quantity": number, "original_price": number || null, }],
//             "subtotal": number | null,
//             "tax": number | null,
//             "service_charge": number | null,
//             "total": number | null
//           }

//           Rules for "items":
//           1. Include only actual purchased items (food, drinks, goods).
//           2. EXCLUDE from items: subtotal, tax (PPN/pajak), service charge, discount lines, rounding, "total", "kembalian" (change), and payment method lines — these go in the summary fields instead, not in items.
//           3. If a line shows a quantity and a total price, divide to get the per-unit price, and set "quantity" to the actual count.
//           4. If an item shows BOTH an original price and a discounted price (e.g. a crossed-out price next to a lower one, or "was X now Y"), set "price" to the final discounted price actually charged, and "original_price" to the pre-discount price. If there's no visible discount on that item, set "original_price" to null.
//           5. If text is unclear, make your best reasonable guess rather than skipping the item.
//           6. If the image contains no readable receipt/items at all, return items: [] and null for every summary field.

//           Rules for the summary fields:
//           7. "subtotal" = the pre-tax, pre-service-charge sum of items, if shown on the receipt. If not shown, set null (don't calculate it yourself).
//           8. "discount" = total discount amount, if shown (e.g. "Diskon", "Disc", promo deductions). Otherwise null. Always return as a positive number representing the amount subtracted, not negative.
//           9. "tax" = PPN/pajak amount, if shown. Otherwise null.
//           10. "service_charge" = service charge amount, if shown. Otherwise null.
//           11. "total" = the final total actually paid, if shown. Otherwise null.

//           Respond with ONLY the JSON object described above, no markdown code fences, no explanation, no extra text before or after.`,
//           },
          
//           {
//             inlineData: {
//               mimeType: mediaType,
//               data: imageBase64,
//             }
//           }
//         ]
//       }
//     ],
//   })

//   const content = response.text

//   if(!content) {
//     throw new Error ('No response from API')
//   }

//   const cleaned = content.replace(/```json|```/g, '').trim()
//   try {
//     return JSON.parse(cleaned) as ExtractedReceipt
//   } catch {
//     throw new Error('Could not parse receipt data')
//   }
// }

//Main CODE
export async function extractedItems(billId: string, imageBase64: string, mediaType: string) {
  // let receipt: ExtractedReceipt | null = null
  // let tesseractDraft: ExtractedReceipt | null = null
  let scan

  try {
    // const t = await scanWithTesseract(imageBase64, mediaType)
    // if (t.ok) {
    //   receipt = t.receipt
    // } else {
    //   tesseractDraft = t.receipt // keep as a last resort, the user can edit it
    //   console.warn('Tesseract result needs review:', t.issues)
    // }

    scan = await scanWithTesseract(imageBase64, mediaType)

  } catch (e) {
    console.error('OCR service error: ', e)
    throw new Error('OCR service is not running or not reachable')
  }

  // if (!receipt && USE_GEMINI_FALLBACK) {
  //   try {
  //     receipt = await scanWithGemini(imageBase64, mediaType)
  //   } catch (e) {
  //     console.warn('Gemini fallback failed:', e)
  //   }
  // }

  // if (!receipt) receipt = tesseractDraft
  // if (!receipt) throw new Error('Could not read the receipt')

  const receipt = scan.receipt

  if(receipt.items.length === 0) {
    throw new Error('No items found on the receipt')
  }

  if (!scan.ok) {
    console.warn('Receipt needs review:', scan.issues)
  }

  console.log('Parsed receipt:', JSON.stringify(receipt, null, 2))

  const supabase = await createClient()

  const itemsSum = receipt.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const subtotal = receipt.subtotal ?? itemsSum
  const total = 
    receipt.total ??
    subtotal + (receipt.tax ?? 0) + (receipt.service_charge ?? 0) - (receipt.discount ?? 0)

  const { data: savedItems, error: itemsError } = await supabase
    .from('items')
    .insert(receipt.items.map((item) => ({ bill_id: billId, ...item })))
    .select()

  if (itemsError) throw new Error (itemsError.message)

  const { error: billError } = await supabase
    .from('bills')
    .update({
      subtotal,
      tax: receipt.tax,
      service_charge: receipt.service_charge,
      discount: receipt.discount,
      total_amount: receipt.total,
    })
    .eq('id', billId)
  
  if (billError) throw new Error(billError.message)

  return savedItems
}