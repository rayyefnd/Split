'use client'

import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftBill } from "@/app/actions/bills";
import ReceiptScanner from "@/components/scanner";
import { toast } from "sonner";
import { motion } from "framer-motion"

//Icon
import {
  Upload,
  ChevronRight
} from 'lucide-react'

//Motion
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 12},
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
}

export default function SplitBill() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [creatingBill, setCreatingBill] = useState(false);
  const router = useRouter();

  //Draft bill
  async function ensureBillId(): Promise<string | null> {
    if (billId) return billId;

    setCreatingBill(true);

    try {
      const bill = await createDraftBill();
      setBillId(bill.id);
      localStorage.setItem(`bill_${bill.id}_secret`, bill.host_secret);
      return bill.id;
    } catch (err) {
      console.error('Failed to create draft bill:', err);
      toast.error('Could not start a new bill — try again');
      return null;
    } finally {
      setCreatingBill(false);
    }
  }

  async function handleUploadFile() {
    fileInputRef.current?.click()
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col w-full min-h-screen justify-between px-4 py-6">

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center w-full max-w-sm mx-auto">
        <motion.div variants={item} className="flex flex-col items-center gap-4">
          <img 
            src="icons/scan-bill.svg" 
            alt="Phone Bill" 
            width={80}
            height={80}
          />

          <div className="flex flex-col w-full gap-2">
            <h1 className="mx-auto text-3xl font-semibold w-[300]">Tired of doing math on the table?</h1>
            <p className="mx-auto text-md text-slate-400">
              Upload a receipt to get started, no manual calculating needed
            </p>
          </div> 
        </motion.div>

        {/* Button */}
        <motion.div variants={item} className="flex flex-col gap-4 justify-center w-full max-w-sm mx-auto">
          <Button
            variant="default"
            className="w-full"
            onClick={handleUploadFile}
            disabled={creatingBill}
          >
            <Upload className="mr-2 h-4 w-4"/>
            Upload file
          </Button>

          <ReceiptScanner
            ref={fileInputRef}
            billId={billId ?? ''}
            onExtracted={() => billId && router.push(`/split-bill/${billId}`)}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
