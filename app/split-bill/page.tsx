'use client'

import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftBill } from "@/app/actions/bills";
import ReceiptScanner from "@/components/scanner";
import { toast } from "sonner";
import PageLayout from "@/components/layout";

//Icon
import {
  Upload,
  ChevronRight
} from 'lucide-react'

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
    const id = await ensureBillId();
    if (id) fileInputRef.current?.click();
  }

  return (
    <PageLayout
      title="Split Bill"
      onBack={() => router.back()}
    >
      {/* Content */}
      <div className="flex flex-col gap-4 mt-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="icons/scan-bill.svg" 
            alt="Phone Bill" 
            width={80}
            height={80}
          />
          <div className="flex flex-col w-[300]">
            <h1 className="text-xl font-bold">Let's split the bill!</h1>
            <p className="mx-auto text-sm text-slate-400">
              Upload a receipt to get started, no manual calculating needed
            </p>
          </div>  
        </div>

        {/* Button */}
        <div className="flex flex-col gap-4 justify-center">
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

          {/* <div className="flex flex-row justify-center">
            <a
              className="relative flex items-center text-slate-300 text-sm"
              href="/tutorial"
            >
              See tutorial
              <ChevronRight className="absolute -right-5 h-4 w-4" />
            </a>
          </div> */}
        </div>
      </div>
    </PageLayout>
  )
}
