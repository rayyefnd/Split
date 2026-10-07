'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { FormState, useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import BillCard from "@/components/ui/bill-card" //Item list for #[id] bill
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirmation-dialog"
import PageLayout from "@/components/layout"
import PageLoading from "@/app/loading"
import { addItem, deleteItem } from "@/app/actions/bills"
import {z} from "zod"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { editItem } from "@/app/actions/bills"

import { 
    CircleAlert, 
    Plus
} from "lucide-react"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'

import { 
    Dialog, 
    DialogContent, 
    DialogDescription,
    DialogFooter, 
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
 
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
}

const addItemSchema = z.object({
    name: z.string().trim().min(1, "Item name is required"),
    price: z.coerce.number().positive("Price must be greather than 0"),
    quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be at least 1")
})

type AddItemInput = z.input<typeof addItemSchema>
type AddItemOutput = z.output<typeof addItemSchema> 

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
    const [cancelReceiptDialog, setCancelReceiptDialog] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [openAddDialog, setOpenAddDialog]= useState(false)
    const [newItemName, setNewItemName] = useState("")
    const [newItemPrice, setNewItemPrice] = useState("")
    const [newItemQuantitiy, setNewItemQuantity] = useState("1")
    const [addingItem, setAddingItem] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
    const [editingItem, setEditingItem] = useState<Item | null>(null)

    const form = useForm<AddItemInput, any, AddItemOutput>({
        resolver: zodResolver(addItemSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            price: 1,
            quantity: 1,
        }
    })

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

    const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0) //Kalkulasi manual
    const originalSubtotal = subtotal ?? 0 //Subtotal yang didapat dari extracted bill
    const taxRate = originalSubtotal > 0 ? (tax ?? 0) / originalSubtotal : 0
    const calculatedTax = itemsSubtotal * taxRate
    const totalAmount = itemsSubtotal - (discount ?? 0) + calculatedTax + (serviceCharge ?? 0) //Sesudah tax dan service charge

    //Submit
    async function onSubmit(values: AddItemOutput) {
        try {
            if(editingItem) {
                const updated = await editItem(editingItem.id, values.name, values.price, values.quantity)
                setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                toast.success("Item updated")
            } else {
                const newItem = await addItem(billId, values.name, values.price, values.quantity)
                setItems((prev) => [...prev, newItem])
                toast.success("Item added")
            }

            setOpenAddDialog(false)
            setEditingItem(null)
            form.reset({name: '', price: 1, quantity: 1})
            
        } catch(err) {
            console.error(err)
            toast.error("Could not add item")
        }
    }

    //Add New Item
    async function handleAddItem() {
        const result = addItemSchema.safeParse({
            name: newItemName,
            price: newItemPrice,
            quantity: newItemQuantitiy,
        })

        if(!result.success) {
            const firstError = result.error.issues[0]
            toast.error(firstError.message)
            return
        }

        setAddingItem(true)

        try {
            const newItem = await addItem(
                billId,
                result.data.name,
                result.data.price,
                result.data.quantity,
            )

            setItems((prev) => [...prev, newItem])
            setOpenAddDialog(false)
            setNewItemName("")
            setNewItemPrice("")
            setNewItemQuantity("1")
            toast.success("Item added")

        } catch(err) {
            console.error(err)
            toast.error("Could not add item")
        } finally {
            setAddingItem(false)
        }

    }

    //Edit item
    function handleEditItem(item: Item) {
        setEditingItem(item)
        form.reset({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })
        setOpenAddDialog(true)

    }

    //Handle delete confirmation
    function handleDeleteConfirmation(item: Item) {
        setItemToDelete(item)
        setConfirmDelete(true)
    }

    //Handle delete item
    async function handleDelete(itemId: string) {
        const previousItems = items
        setItems((prev) =>prev.filter((item) => item.id !== itemId))

        try {
            await deleteItem(itemId)
            toast.success("Item removed")
        } catch(err) {
            console.error(err)
            setItems(previousItems)
            toast.error("Could not remove item")
        }
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
                        onDelete={() => handleDeleteConfirmation(item)}
                        onMenu={() => handleEditItem(item)}
                    />
                ))}
            </div>

            <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                    setEditingItem(null)
                    form.reset({ name: '', price: 1, quantity: 1 })
                    setOpenAddDialog(true)
                }}
            >
                <Plus className="mr-2 w-4 h-4"/>
                Add other items
            </Button>

            <div className="flex flex-col text-sm mt-2 gap-1">

                {/* Subtotal */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Subtotal:</span>
                    <span>{itemsSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {/* Service */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Service Charge:</span>
                    <span>{(serviceCharge ?? 0).toLocaleString('id-ID')}</span>
                </div>
                
                {/* Tax */}
                <div className="flex justify-between text-slate-400">
                    <span className="text-md">Tax:</span>
                    <span>{Math.round(calculatedTax).toLocaleString('id-ID')}</span>
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

            {/* Cancel Receipt */}
            <ConfirmDialog
                open={cancelReceiptDialog}
                onOpenChange={setCancelReceiptDialog}
                title={'Want to leave?'}
                description={`This receipt hasn't been saved and will be lost.`}
                icon={<CircleAlert className="h-6 w-6 text-destructive" />}
                confirmLabel={submitting ? 'Cancelling...' : 'Confirm'}
                cancelLabel="Cancel"
                confirmVariant="destructive"
                onConfirm={() => {
                    setCancelReceiptDialog(false)
                    router.back()
                }}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={'Want to delete this item?'}
                description={`This item will be removed from this bill`}
                icon={<CircleAlert className="h-6 w-6 text-destructive"/>}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmVariant="destructive"
                onConfirm={() => {
                    if(itemToDelete) handleDelete(itemToDelete.id)
                    setConfirmDelete(false)
                    setItemToDelete(null)
                }}
            />

            <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                <DialogContent className="w-[90vw] max-w-sm">
                    <DialogTitle>
                        {editingItem ? 'Edit item' : 'Add item'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingItem
                            ? 'Update the item information below.'
                            : 'Manually add an item to this bill.'
                        }
                    </DialogDescription>
                    <Form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid grid-cols-1 md:grid gap-3 p-2"
                    >
                        
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Nasi Goreng" {...field}></Input>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="25000" {...field} 
                                                value={field.value as string | number}/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="1" 
                                                {...field} 
                                                value={field.value as string | number}/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                             <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="w-full mt-2"
                             >
                                {form.formState.isSubmitting ? 
                                    "Adding..."
                                    : editingItem
                                        ? 'Saving change'
                                        : 'Add'}
                            </Button>                    
                    </Form>              
                </DialogContent>
            </Dialog>
        </PageLayout>
    )
}