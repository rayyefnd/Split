'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, ChevronRight, Hamburger, User, Utensils, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import PageLayout from "@/components/layout"
import PageLoading from "@/app/loading"
import { createClient } from "@/lib/supabase/client"
import { setItemAssignments } from "@/app/actions/assignments"
import { toast } from "sonner"

//Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

const getInitials = (username: string) =>
    username
        . trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')

export default function AssignItems() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const billId = params.id

    const [items, setItems] = useState<Item[]>([])
    const [participants, setParticipants] = useState<Participant[]>([])
    const [assignments, setAssignments] = useState<Record<string, Set<string>>>({})
    const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [viewParticipants, setViewParticipants] = useState<{
        name:string
        participants: {id:string; name: string; is_host: boolean}[]
    } | null>(null)

    useEffect(() => {
        if(!billId) return
        fetchData()

    }, [billId])

    async function fetchData() {
        setLoading(true)
        const supabase = createClient()

        //Fetch data item
        const { data: itemsData } = await supabase
            .from('items')
            .select('*')
            .eq('bill_id', billId)

        setItems(itemsData || [])

        //Fetch data partisipan
        const { data: participantsData } = await supabase
            .from('participants')
            .select('*')
            .eq('bill_id', billId)

        setParticipants(participantsData || [])

        if(participantsData && participantsData.length > 0) {
            setActiveParticipantId(participantsData[0].id)
        }

        const { data: assignmentsData } = await supabase
            .from('item_assignments')
            .select('item_id, participant_id')
            .in('item_id', (itemsData || []).map((i) => i.id))

        const grouped: Record<string, Set<string>> = {}
        for(const a of assignmentsData || []) {
            if(!grouped[a.item_id]) grouped[a.item_id] = new Set()
            grouped[a.item_id].add(a.participant_id)
        }
        setAssignments(grouped)

        setLoading(false)

    }

    function itemToggle(itemId: string) {
        if(!activeParticipantId) return

        setAssignments((prev) => {
            const current = new Set(prev[itemId] ?? [])
            if(current.has(activeParticipantId)) {
                current.delete(activeParticipantId)
            } else {
                current.add(activeParticipantId)
            }
            return { ...prev, [itemId]: current }
        })
    }

    //Handle save
    async function handleSave() {
        setSaving(true)

        try{
            for(const item of items) {
                const participantId = Array.from(assignments[item.id] ?? [])
                await setItemAssignments(item.id, participantId)
            }

            toast.success('Assignments saved')
            router.push(`/split-bill/${billId}/bill-summary`)
        } catch(err) {
            console.error(err)
            toast.error('Could not save assignments')
        } finally {
            setSaving(false)
        }
    }

    //Page loading dengan skeleton
    if(loading) {
        return (
            <PageLayout title="" onBack={() => router.back()}>
                <PageLoading rows={5} showSummary={false} showButton />
            </PageLayout>
        )
    }

    //Truncate
    const truncate = (input: string) => 
        input?.length > 20 ? `${input.substring(0, 20)}...` : input;

    return (
        <PageLayout
            title="Assign Items"
            onBack={() => router.back()}
        >
            <div className="flex flex-wrap gap-2 justify-center">
                {participants.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setActiveParticipantId(p.id)}
                        className={`flex flex-col items-center gap-1 transition-opacity ${
                            activeParticipantId === p.id ? 'opacity-100' : 'opacity-50'
                        }`}
                    >
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                activeParticipantId === p.id 
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                        >
                            {getInitials(p.name)}
                        </div>
                        <span className="text-xs text-slate-500 max-w-14 truncate">{p.name}</span>

                    </button>
                ))}
            </div>

            {activeParticipantId && (
                <p className="text-xs text-center text-slate-400">
                    Tap items to assign them to{' '}
                    <span className="font-medium text-slate-600">
                        {participants.find((p) => p.id === activeParticipantId)?.name}
                    </span>
                </p>
            )}

            <div className="flex flex-col fap-2 mt-2">
                {items.map((item) => {
                    const assignedIds = assignments[item.id] ?? new Set()
                    const isActiveAssigned = activeParticipantId ? assignedIds.has(activeParticipantId) : false
                    // const otherAssigned = participants.filter(
                    //     (p) => assignedIds.has(p.id) && p.id !== activeParticipantId
                    // )
                    const assignedParticipants = participants.filter((p) => assignedIds.has(p.id))


                    return (
                        <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => itemToggle(item.id)}
                            onKeyDown={(e) => e.key === 'Enter' && itemToggle(item.id)}
                            className={`text-left p-3 border flex flex-col gap-1 transition-colors hover:bg-slate-100 ${
                                isActiveAssigned
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                        >
                            <div className="flex items-center justify-between py-3 gap-3">
                                <div
                                    className={`flex items-center justify-center h-4 w-4 rounded-full border-2 shrink-0 transition-colors ${
                                        isActiveAssigned
                                            ? 'bg-primary border-primary'
                                            : 'border-slate-300 bg-white'
                                    }`}
                                >
                                    {isActiveAssigned && <Check className="h-2 w-2 text-primary-foreground" />}
                                </div>

                                <div className="flex flex-col flex-1 gap-1">
                                    <h3 className="font-bold text-sm">
                                        {truncate(item.name)}
                                    </h3>

                                    <p className="text-sm text-slate-400">
                                        <span>
                                            {item.price.toLocaleString('id-ID')}
                                        </span>

                                        {item.quantity > 1 && ` (x${item.quantity})`}
                                    </p>                            

                                   {assignedParticipants.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                            {assignedParticipants.slice(0, 2).map((p) => (
                                                <span
                                                    key={p.id}
                                                    className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full"
                                                >
                                                    {p.name}
                                                </span>
                                            ))}

                                            {assignedParticipants.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setViewParticipants({
                                                            name: item.name,
                                                            participants: assignedParticipants,
                                                        })
                                                    }}
                                                    className="flex text-[10px] bg-black justify-center text-white px-1.5 py-0.5 rounded-full hover:bg-black/80"
                                                >
                                                    +{assignedParticipants.length - 2} more
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <span className="text-sm text-slate-500 shrink-0">
                                    {(item.price * item.quantity).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>       
                    )
                })}
            </div>

            <div className="mt-4">
                <Button 
                    onClick={handleSave}
                    disabled={saving || items.some((item) => !assignments[item.id]?.size)}
                    className="w-full"
                >
                    {saving ? 'Saving..' : 'Confirm'}
                </Button>
            </div>

            <Dialog open={!!viewParticipants} onOpenChange={(open) => !open && setViewParticipants(null)}>
                <DialogContent className="w-[90vw] max-w-sm">
                    <DialogHeader className="flex justify-center mt-3">
                        <DialogTitle className="flex items-center flex-row gap-2">
                                <div className="flex h-8 w-8 justify-center items-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                                    <Utensils className="w-4 h-4"/>
                                </div>
                                <span className="flex text-sm">{viewParticipants?.name}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-wrap justify-center gap-2 p-2">
                        {viewParticipants?.participants.map((p) => (
                            <div key={p.id} className="flex flex-col items-center gap-1 w-14 text-xs">
                                {/* <div className="h-2 w-2 rounded-full bg-primary shrink-0"/> */}
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                                    {p.is_host ? <User className="h-6 w-6"/> : getInitials(p.name)}
                                </div>
                                {p.name}
                            </div>
                        ))}

                    </div>
                </DialogContent>
            </Dialog>
        </PageLayout>
    )
}