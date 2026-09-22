'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import BillCard from "@/components/ui/bill-card" //Item list for #[id] bill
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Item {
    id: string
    name: string
    price: number
    quantity: number
}

interface Participant {
    id:  string
    name: string
    phoneNum: string
}

export default function BillDetails() {
    const params = useParams<{ id: string }>()
    const billId = params.id

    const [title, setTitle] = useState("")
    const [hostName, setHostName] = useState("Host")
    const [items, setItems] = useState<Item[]>([])
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(true)
    
    const router = useRouter();


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
                setHostName(bill.host_name)
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

    

    //Total Price
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return (
        <div className="flex flex-col items-center justify-center gap-6 px-4 py-12">
            <div className="w-full max-w-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        {/* HostName */}
                        <p className="text-md text-black font-bold">{title}</p>
                    </div>
                    {/* AddParticipant */}
                </div>

                <div className="border border-slate-100 rounded-sm px-4">
                    {items.map((item) => (
                        <BillCard
                            key={item.id}
                            name={item.name}
                            price={item.price}
                            quantity={item.quantity}
                        />
                    ))}
                </div>

                <div className="flex justify-between text-sm mt-2">
                    <span className="text-black text-md font-bold">Grand total:</span>
                    <span className="font-semibold">{totalAmount.toLocaleString('id-ID')}</span>
                </div>
                
                <Button
                    onClick={() => router.push(`/`)}
                >
                    Add Participants
                </Button>

            </div>
        </div>
    )
}