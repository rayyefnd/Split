'use client'

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  ReceiptText
} from 'lucide-react'

export default function Home() {

  const router = useRouter();

  return (
    <>
    <div className="w-full">
      <Button
        onClick={() => router.push('/split-bill')}
        className="bg-slate-300"
      >
        <ReceiptText className="h-4 w-4"/>
      </Button>
      <p>Split Bill</p>
    </div>
    </>
  );
}
