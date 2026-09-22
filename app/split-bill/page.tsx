'use client'

import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/camera-capture";
import { createDraftBill } from "@/app/actions/bills";
import ReceiptScanner from "@/components/scanner";
import { toast } from "sonner";

//Icon
import {
  Camera,
  ReceiptText,
  Upload,
  ChevronLeft
} from 'lucide-react'

export default function SplitBill() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
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

  async function handleTakePhoto() {
    const id = await ensureBillId();
    if (id) setShowCamera(true);
  }

  // useEffect(() => {
  //   if (hasCreatedDraft.current) return;
  //   hasCreatedDraft.current = true;
    
  //   createDraftBill()
  //     .then((bill) => {
  //       console.log('Draft bill created:', bill)
  //       setBillId(bill.id)
  //       localStorage.setItem(`bill_${bill.id}_secret`, bill.host_secret);

  //     })
  //     .catch((err) => console.error('Failed to create draft bill:', err))
  // }, [])

  return (
    <>
    <div className="flex flex-col items-center justify-center gap-8 p-4 text-start">
      

      {/* Header */}

      <div className="flex flex-col gap-2 w-full  max-w-sm text-center">
        <div className="grid grid-cols-[auto_1fr_auto] items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center w-7 h-7 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h1 className="text-xl font-bold">Split Bill</h1>

          <div className="w-9 h-9" />
        </div>

        <p className="text-sm text-slate-400">
          Solve your split bill problems easily!
        </p>
      </div>

      {/* Content */}
      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Upload Card */}
        <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex flex-col items-center gap-2 cursor-pointer"
        >
            <ReceiptText  className="h-8 w-8 text-slate-400" />
            <h2 className="text-md font-semibold text-slate-400">Drop file here</h2>
            {/* {billId && ( */}
            <ReceiptScanner
              ref={fileInputRef}
              billId={billId ?? ''}
              onExtracted={() => billId && router.push(`/split-bill/${billId}`)}
            />
            {/* )} */}

        </div>

        {/* Button */}
        <div className="flex flex-row gap-4 justify-center mt-4">
            <Button
              variant="default"
              className="w-full"
              onClick={handleUploadFile}
              disabled={creatingBill}
            >
              <Upload className="mr-2 h-4 w-4"/>
              Upload File
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTakePhoto}
              disabled={creatingBill}
            >
              <Camera className="mr-2 h-4 w-4"/>
              Take Photo
            </Button>
        </div>
      </div>

      {showCamera && billId && <CameraCapture onClose={() => setShowCamera(false)}/>}

    </div>
    </>
  );
}
