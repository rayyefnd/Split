'use client'

import { useEffect, useState } from "react"
import PageLayout from "@/components/layout"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// icon
import { 
    ArrowRight,
    ChevronLeft, 
    Plus, 
    User, 
    UserPlus,
    X
} from "lucide-react"

//Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Participant {
    id: string
    name: string
    is_host: boolean
}

const getInitials = (username: string) => 
    username
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')

export default function AssignParticipants() {
    const router = useRouter()
    const [openDialog, setOpenDialog] = useState(false)
    const [participants, setParticipants]= useState<Participant[]>([])
    const [name, setName] = useState('')
    const params = useParams<{id: string}>()
    const billId = params.id
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if(!billId) return
        
        async function fetchParticipants() {
            setLoading(true)
            const supabase = createClient()

            const { data, error } = await supabase
                .from('participants')
                .select('id, name, is_host')
                .eq('bill_id', billId)

            if(error) {
                console.error('Failed to fetch participants:', error)
                setLoading(false)
                return
            }

            const hasHost = (data || []).some((p) => p.is_host)

            if(!hasHost) {
                const { data: hostRow, error: hostError } = await supabase
                    .from('participants')
                    .insert({ bill_id: billId, name: 'You', is_host: true })
                    .select()
                    .single()

                if (hostError) {
                    console.error('Failed to create host participant:', hostError)
                    setParticipants(data || [])
                } else {
                    setParticipants([hostRow, ...(data || [])])
                }
            } else {
                setParticipants(data || [])
            }

            setLoading(false)
        }

        fetchParticipants()
    }, [billId])

    //Handle open dialog
    const handleOpenAddDialog = () => {
        setName('')
        setOpenDialog(true)
    }

    //Handle submit
    const handleSubmit = async () => {
        if (!name.trim()) return

        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('participants')
                .insert({ bill_id: billId, name: name.trim(), is_host: false })
                .select()
                .single()
            
            if(error) throw error

            setParticipants((prev) => [...prev, data])
            setOpenDialog(false)
            setName('')
        } catch(err) {
            console.error('Failed to add participant:', err)
            toast.error('Could not add participant')
        }
    }

    //Handle remove
    const handleRemove = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase.from('participants').delete().eq('id', id)

        if (error) {
            toast.error('Could not remove participant')
            return
        }

        setParticipants((prev) => prev.filter((p) => p.id !== id))
    }

    //Handle confirm
    const handleConfirm = () => {
        router.push(`/split-bill/${billId}/assign-items`)
    }

    return (
        <PageLayout
            title="Register Participants"
            onBack={() => router.back()}
        >
            <div className="flex flex-row justify-center flex-wrap gap-y-4">

                {/* Add participants */}
                {participants.map((p) => (
                    <div key={p.id} className="flex w-16 shrink-0 flex-col items-center gap-1">
                        <div className="relative">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                                {p.is_host ? <User className="h-6 w-6"/> : getInitials(p.name)}
                            </div>
                            {!p.is_host && (
                                <button
                                    type="button"
                                    aria-label={`Remove ${p.name}`}
                                    onClick={() => handleRemove(p.id)}
                                    className="absolute -right-1 -top-1 flex 
                                                h-4 w-4 items-center justify-center 
                                                rounded-full bg-slate-400 text-white 
                                                hover:bg-slate-300
                                            "
                                >
                                    <X className="h-2 w-2"/>
                                </button>
                            )}
                        </div>

                        <span className="w-full truncate text-center text-xs text-slate-500">
                            {p.name}
                        </span>
                    </div>
                ))}

                <div className="flex w-16 shrink-0 flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        onClick={handleOpenAddDialog}
                        className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300 p-0"
                    >
                        <Plus className="text-slate-400 h-5 w-5" />
                    </Button>

                    <span className="text-center text-xs text-slate-500">Add new</span>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
                <Button 
                    className="flex-1"
                    onClick={handleConfirm}
                    disabled={participants.length === 0}
                >   
                    {saving ? 'Saving...': 'Next'}                
                </Button>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="w-[90vw] max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Add participant
                        </DialogTitle>

                        <Input
                            placeholder="Enter name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-2"
                        />

                        <div className="flex flex-row gap-3 w-full mt-2">
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                            >
                                Add
                            </Button>
                        </div>

                    </DialogHeader>
                    
                </DialogContent>
            </Dialog>
        </PageLayout>
        
    )
}