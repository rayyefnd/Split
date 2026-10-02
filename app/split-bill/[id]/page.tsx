'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import BillCard from "@/components/ui/bill-card" //Item list for #[id] bill
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirmation-dialog"
import PageLayout from "@/components/layout"
import PageLoading from "@/app/loading"

import { 
    CircleAlert 
} from "lucide-react"
 
interface Item {
    id: string
    name: string
    originalPrice: number | null
    price: number
    quantity: number
}

interface Participant {
    id:  string
    name: string
    // phoneNum: string
}

export default function BillDetails() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const billId = params.id
    const [title, setTitle] = useState("")
    const [items, setItems] = useState<Item[]>([])
    const [createdAt, setCreatedAt] = useState<string | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(true)
    const [subtotal, setSubtotal] = useState<number | null>(null)
    const [tax, setTax] = useState<number | null>(null)
    const [serviceCharge, setServiceCharge] = useState<number | null>(null)
    const [discount, setDiscount] = useState<number | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [cancelReceiptDialog, setCancelReceiptDialog] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    //Helper
    useEffect(() => {
        if (!billId) return

        const supabase = createClient()

        async function fetchBillDetails() {
            setLoading(true)

            const { data: bill, error: billError } = await supabase
                .from('bills')
                .select('*')
                .eq('id', billId)
                .single()

            if (billError) {
                console.error('Failed to fetch bill:', billError)
            } else if (bill) {
                setTitle(bill.title)
                setCreatedAt(bill.created_at)
                setSubtotal(bill.subtotal)
                setTax(bill.tax)
                setServiceCharge(bill.service_charge)
                setDiscount(bill.discount)
            }

            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .eq('bill_id', billId)

            if (itemsError) {
                console.error('Failed to fetch items:', itemsError)
            } else {
                setItems(itemsData || [])
            }

            const { data: participantsData, error: participantsError } = await supabase
                .from('participants')
                .select('*')
                .eq('bill_id', billId)

            if (participantsError) {
                console.error('Failed to fetch participants:', participantsError)
            } else {
                setParticipants(
                    (participantsData || []).map((p) => ({
                        id: p.id,
                        name: p.name,
                        phoneNum: p.phone_number,
                    }))
                )
            }

            setLoading(false)
        }

        fetchBillDetails()
    }, [billId])

    const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0) //Sebelum tax dan service charge
    const totalAmount = (subtotal ?? itemsSubtotal) - (discount ?? 0) + (tax ?? 0) + (serviceCharge ?? 0) //Sesudah tax dan service charge

    //Handle Open Dialog
    const handleOpenDialog = () => {
        setDialogOpen(true)
    }

    //Handle Close Dialog
    const handleCloseDialog = () => {
        setDialogOpen(false)
    }
    
    if(loading) {
        return (
            <PageLayout title="" onBack={() => router.back()}>
                <PageLoading rows={4} showSummary={false} showButton />
            </PageLayout>
        )
    }

    return (
        <PageLayout
            title={title}
            onBack={() => setCancelReceiptDialog(true)}
        >
            {createdAt && (
                <p className="flex justify-center gap-2 text-sm text-slate-400 -mt-2">
                    <span>
                        {new Date(createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                        })}
                    </span>

                    <span>
                        ({new Date(createdAt).toLocaleTimeString('en-GB')})
                    </span>
                </p>
            )}
            
            <div className="border border-slate-100 rounded-sm px-4">
                {items.map((item) => (
                    <BillCard
                        key={item.id}
                        name={item.name}
                        originalPrice={item.originalPrice}
                        price={item.price}
                        quantity={item.quantity}
                    />
                ))}
            </div>

            <div className="flex flex-col text-sm mt-2 gap-1">

                {/* Subtotal */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Subtotal:</span>
                    <span>{(subtotal ?? itemsSubtotal).toLocaleString('id-ID')}</span>
                </div>

                {/* Service */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Service Charge:</span>
                    <span>{(serviceCharge ?? 0).toLocaleString('id-ID')}</span>
                </div>
                
                {/* Tax */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Tax:</span>
                    <span>{(tax ?? 0).toLocaleString('id-ID')}</span>
                </div>

                {/* Total Amount */}
                <div className="flex justify-between mt-1">
                    <span className="text-black text-md font-bold">Total:</span>
                    <span className="font-semibold">
                        {totalAmount.toLocaleString('id-ID')}
                    </span>
                </div>

            </div>

            <div className="flex sticky bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 -mx-4">
                <Button
                    className="flex-1"
                    onClick={() => router.push(`/split-bill/${billId}/assign-participant`)}
                >
                    Confirm
                </Button>
            </div>

            <ConfirmDialog
                open={cancelReceiptDialog}
                onOpenChange={setCancelReceiptDialog}
                title={'Want to leave?'}
                description={`This receipt hasn't been saved and will be lost.`}
                icon={<CircleAlert className="h-6 w-6 text-black" />}
                confirmLabel={submitting ? 'Cancelling...' : 'Confirm'}
                cancelLabel="Cancel"
                confirmVariant="default"
                onConfirm={() => {
                    setCancelReceiptDialog(false)
                    router.back()
                }}
            />
        </PageLayout>
    )
}