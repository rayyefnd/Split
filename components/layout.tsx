'use client'

import { ChevronLeft } from "lucide-react"
import { ReactNode } from "react"

interface PageProps {
  title: string
  subtitle?: ReactNode
  onBack: () => void
  children: ReactNode
}

export default function PageLayout({ title, subtitle, onBack, children }: PageProps) {
    return (
        <div className="flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-sm flex flex-col gap-4">

                {/* Header */}
                <div className="sticky top-0 z-40 bg-white pt-5 -mt-6 flex flex-col text-center">
                    <div className="relative flex items-center justify-center">
                        <button
                        type="button"
                        onClick={onBack}
                        className="absolute left-0 flex items-center justify-center w-7 h-7 hover:bg-slate-100 rounded-lg"
                        >
                        <ChevronLeft className="h-5 w-5" />
                        </button>

                        <p className="px-9 text-lg text-black font-bold truncate">{title}</p>
                    </div>
                {subtitle}
                </div>
                {children}
            </div>
        </div>
    )
}