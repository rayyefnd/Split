'use client'

import { forwardRef } from "react"
import { extractedItems } from "@/app/actions/extract-bill"
import { toast } from "sonner"

interface ReceiptScannerProps {
  billId: string
  onExtracted?: () => void
}

const ReceiptScanner = forwardRef<HTMLInputElement, ReceiptScannerProps>(
  ({ billId, onExtracted }, ref) => {
    async function handleFile(file: File) {
      const reader = new FileReader()

      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const toastId = toast.loading('Reading receipt...')

        try {
          const items = await extractedItems(billId, base64, file.type)
          toast.success(`Found ${items.length} items`, { id: toastId })
          onExtracted?.()
        } catch (err) {
          console.error(err)
          toast.error('Could not read receipt', { id: toastId })
        }
      }

      reader.onerror = () => {
        toast.error('Could not read the selected file')
      }

      reader.readAsDataURL(file)
    }

    return (
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
    )
  }
)

ReceiptScanner.displayName = 'ReceiptScanner'
export default ReceiptScanner