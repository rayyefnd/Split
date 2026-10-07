'use client'

import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import PageLayout from "@/components/layout"
import PageLoading from "@/app/loading"
import { Button } from "@/components/ui/button"

import { 
    User 
} from "lucide-react"

import { toast } from "sonner"

interface Item {
    id: string
    name: string
    price: number
    quantity: number
}

interface Participant {
    id: string
    name: string
    is_host: boolean
}

interface Assignment {
    item_id: string
    participant_id: string
    share: number
}

interface ParticipantSummary {
    id: string
    name: string
    is_host: boolean
    lineItems: {name: string; amount: number}[]
    subtotal: number
    taxShare: number
    serviceChargeShare: number
    // discountShare: number
    total: number
}

const getInitials = (username: string) => 
    username
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')

export default function BillSummary() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const billId = params.id

    const [loading, setLoading] = useState(true)
    const[billTax, setBillTax] = useState<number | null>(null)
    const [billServiceCharge, setbillServiceCharge] = useState<number | null>(null)
    const [grandTotal, setGrandTotal] = useState<number | null>(null)
    const [summaries, setSummaries] = useState<ParticipantSummary[]>([])
    const [participants, setParticipants]= useState<Participant[]>([])
    const [copied, setCopied] = useState(false)
    
    useEffect(() => {
        if(!billId) return
        fetchSummary()
    }, [billId])

    async function fetchSummary() {
        setLoading(true)
        const supabase = createClient()

        const { data: bill } = await supabase
            .from('bills')
            .select('subtotal,tax, service_charge, discount, total_amount')
            .eq('id', billId)
            .single()

        const { data: itemsData } = await supabase
            .from('items')
            .select('*')
            .eq('bill_id', billId)

        const { data: participantData } = await supabase
            .from('participants')
            .select('id, name, is_host')
            .eq('bill_id', billId)
        
        const items: Item[] = itemsData || []
        const participants: Participant[] = participantData || []

        const { data: assignmentsData } = await supabase
            .from('item_assignments')
            .select('item_id, participant_id, share')
            .in('item_id', items.map((i) => i.id))
        
        const assignments: Assignment[] = assignmentsData || []

        const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const originalSubtotal = bill?.subtotal ?? 0 //Subtotal yang didapat dari extracted bill
        const tax = bill?.tax ?? 0
        const taxRate = originalSubtotal > 0 ? tax / originalSubtotal : 0
        const calculatedTax = itemsSubtotal * taxRate
        const serviceCharge = bill?.service_charge ?? 0
        const discount = bill?.discount ?? 0

        const result: ParticipantSummary[] = participants.map((p) => {
            const myAssignments = assignments.filter((a) => a.participant_id === p.id)

            const lineItems = myAssignments.map((a) => {
                const item = items.find((i) => i.id === a.item_id)
                if(!item) return null
                const amount = item.price * item.quantity * a.share
                return { name: item.name, amount }
            }).filter((x): x is { name: string; amount: number } => x !== null)

            const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0)
            const proportion = itemsSubtotal > 0 ? subtotal / itemsSubtotal : 0

            const taxShare = tax * proportion
            const serviceChargeShare = serviceCharge * proportion
            const discountShare = discount * proportion

            const total = subtotal + taxShare + serviceChargeShare - discountShare

            return {
                id: p.id,
                name: p.name,
                is_host: p.is_host,
                lineItems,
                subtotal,
                taxShare,
                serviceChargeShare,
                // discountShare,
                total,
            }
        })

        setSummaries(result)
        setBillTax(tax)
        setbillServiceCharge(serviceCharge)
        setGrandTotal(itemsSubtotal - discount + calculatedTax + serviceCharge)
        setLoading(false)
    }

    //Copy link to share the invoice
    async function handleShare() {
        const url = `${window.location.origin}/split-bill/${billId}/bill-summary`

        if(navigator.share) {

            try {
                await navigator.share({
                    title: 'Split Bill Summary',
                    text: 'Here\'s your share of the bill:',
                    url,
                })
            } catch(err) {

            }
        } else {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            toast.success('Link copied')
            setTimeout(() => setCopied(false), 2000)
        }

    }

    if(loading) {
        return (
            <PageLayout title="Summary" onBack={() => router.back()}>
                <PageLoading rows={3} showSummary={false} showButton={false}/>                
            </PageLayout>
        )
    }


    return (
        <PageLayout
            title="Summary" onBack={() => router.back()}
        >
            <div className="flex flex-col gap-3">
                {summaries.map((s) => {

                    const participant = participants.find((p) => p.id === s.id)

                    return(
                        <div key={s.id} className="border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700 shrink-0">
                                    {participant?.is_host ? <User className="h-5 w-5" /> : getInitials(s.name)}
                                </div>

                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">{s.name}</span>
                                    <span className="text-xs text-slate-400">
                                        {s.is_host ? 'Host' : 'Participant'}
                                    </span>
                                </div>
                            </div>

                            {s.lineItems.length > 0 ? (
                                <div className="flex flex-col gap-1 mt-2">
                                    {s.lineItems.map((li, i) => (
                                    <div key={i} className="flex justify-between text-sm text-slate-400">
                                        <span className="truncate">{li.name}</span>
                                        <span className="shrink-0 ml-2">
                                            {Math.round(li.amount).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    ))}
                                </div>

                            ) : (
                                <p className="text-xs text-slate-300">No items assigned</p>
                            )}
                            <>
                            <hr className="border-slate-200 my-1" />

                            {(s.taxShare > 0 || s.serviceChargeShare > 0) && (
                                <div className="flex flex-col gap-1">
                                    {s.taxShare > 0 && (
                                        <div className="flex justify-between text-sm text-slate-400">
                                            <span>Tax:</span>
                                            <span>{Math.round(s.taxShare).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}

                                    {s.serviceChargeShare > 0 && (
                                    <div className="flex justify-between text-sm text-slate-400">
                                        <span>Service charge:</span>
                                        <span>{Math.round(s.serviceChargeShare).toLocaleString('id-ID')}</span>
                                    </div>
                                    )}

                                    {s.total > 0 && (
                                        <div className="flex justify-between font-bold text-sm text-black">
                                            <span>Total:</span>
                                            <span className="font-semibold text-sm">
                                                {Math.round(s.total).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}

                                    {/* {s.discountShare > 0 && (
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Discount</span>
                                        <span>-{Math.round(s.discountShare).toLocaleString('id-ID')}</span>
                                    </div>
                                    )} */}
                                </div>
                            )}
                            </>
                        </div>
                    )
                })}
            </div>

            <div className="border-b border-slate-200 mt-4"></div>

            <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-sm">Grand Total:</span>
                <span className="font-bold text-sm">
                    {Math.round(grandTotal ?? 0).toLocaleString('id-ID')}
                </span>
            </div>

            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 -mx-4">
                <Button 
                    onClick={handleShare}
                    className="w-full"
                >
                    Share summary
                </Button>
            </div>
        </PageLayout>
    )
}