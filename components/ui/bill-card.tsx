'use client'

//Icon
import {
    EllipsisVertical,
    Pencil,
    Trash2,
} from 'lucide-react'

//Dropdown
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function BillCard({
    name,
    price,
    originalPrice,
    quantity,
    onMenu,
    onDelete,
}: {
    name: string
    originalPrice: number | null
    price: number
    quantity: number
    onMenu?: () => void
    onDelete?: () => void
}) {

    const total = price * quantity
    const hasDiscount = originalPrice != null && originalPrice > price
    const truncate = (input: string) => 
        input?.length > 20 ? `${input.substring(0, 20)}...` : input;

    return (
        <div className="flex items-end justify-between py-3 border-b last:border-b-0">
            <div className='min-w-0 flex-1'>
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

            <span className="text-sm text-slate-400">{total.toLocaleString('id-ID')}</span>
            
            {/* Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className='flex h-5 w-5 rounded-md items-center justify-center self-center hover:bg-slate-200 shrink-0 ml-2'
                    >
                        <EllipsisVertical className='w-4 h-4 text-slate-400'/>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                    {onMenu && (
                        <DropdownMenuItem onClick={onMenu}>
                            <Pencil className='mr-2 w-4 h-4'/>
                            Edit
                        </DropdownMenuItem>
                    )}

                    {onDelete && (
                        <DropdownMenuItem onClick={onDelete}>
                            <Trash2 className='mr-2 w-4 h-4'/>
                            Delete
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            
        </div>
    )
}