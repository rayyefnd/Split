'use client'

import {
    Plus,
} from 'lucide-react'

export default function BillCard({
    name,
    price,
    originalPrice,
    quantity,
    onMenu,
}: {
    name: string
    originalPrice: number | null
    price: number
    quantity: number
    onMenu?: () => void
}) {

    const total = price * quantity
    const hasDiscount = originalPrice != null && originalPrice > price
    const truncate = (input: string) => 
        input?.length > 20 ? `${input.substring(0, 20)}...` : input;

    return (
        <div className="flex items-end justify-between py-3 border-b last:border-b-0">
        <div className='min-w-0'>
            <h3 className="font-bold text-sm">{truncate(name)}</h3>
            <p className="text-sm text-slate-400">
                {hasDiscount && (
                    <span className='line-through text-slate-300'>
                        {originalPrice!.toLocaleString('id-ID')}
                    </span>
                )}

                <span className={hasDiscount ? "text-red-500 font-medium" : ""}>
                    {price.toLocaleString('id-ID')}
                </span>

                {quantity > 1 && ` (x${quantity})`}
            </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right flex flex-col">
            {/* <span className="text-sm text-slate-500 font-medium">Total: </span> */}
                <span className="text-sm text-slate-400">{total.toLocaleString('id-ID')}</span>
            </div>
            {/* <button className="text-slate-400" onClick={onMenu}><Plus className='mr-2 h-4 w-4'/></button> */}
        </div>
        </div>
    )
}