'use client'

import { forwardRef, useState } from "react"
import { extractedItems } from "@/app/actions/extract-bill"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ReceiptScannerProps {
  ensureBillId: () => Promise<string | null>
  onExtracted?: (billId: string) => void
}

const ReceiptScanner = forwardRef<HTMLInputElement, ReceiptScannerProps>(
  ({ ensureBillId, onExtracted }, ref) => {

    const [extracting, setExtracting] = useState(false)

    async function handleFile(file: File) {
      setExtracting(true)

      try {
        const billId = await ensureBillId()

        if(!billId) {
          toast.error('Could not start a new bill')
          return
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()

          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(",")[1])
          }

          reader.onerror = () => {
            reject(new Error("Could not read file"))
          }

          reader.readAsDataURL(file)
        })

        const item = await extractedItems(
          billId,
          base64,
          file.type
        )

        onExtracted?.(billId)

      } catch (err) {
        console.error(err)
        toast.error('Could not read receipt')
      } finally {
        setExtracting(false)
      }
    }

    return (
      <>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {extracting && (
          <div className="flex flex-col fixed inset-0 z-50 flex items-center justify-center bg-white gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="animate-pulse text-black">
              Reading your receipt...
            </p>
          </div>
        )}
      </>
    )
  }
)

ReceiptScanner.displayName = 'ReceiptScanner'
export default ReceiptScanner