'use server'

import { createClient } from "@/lib/supabase/server";

//Draft bill
export async function createDraftBill() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bills')
    .insert({ host_name: 'Host', title: 'Recognized Items', total_amount: 0, status: 'draft' })
    .select()
    .single()

  if (error) {
    console.error('RAW SUPABASE ERROR:', JSON.stringify(error, null, 2))
    console.error('ERROR CAUSE:', error.cause)
    throw new Error(error.message)
  }
  return data
}

//Get bill with items
export async function getBillWithItems(billId: string) {
    const supabase = await createClient()

    const { data: bill, error: billError } = await supabase
        .from('bills')
        .select('id, title, host_name, status')
        .eq('id', billId)
        .single()

    if (billError) throw new Error(billError.message)

    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, name, price, quantity')
        .eq('bill_id', billId)

    if (itemsError) throw new Error(itemsError.message)

    const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, name, phone_number')
        .eq('bill_id', billId)

    if (participantsError) throw new Error(participantsError.message)

    return { bill, items: items ?? [], participants: participants ?? [] }
}

//Add Participants
export async function addParticipants(
  billId: string,
  participants: { name: string, phone: string }[]
) {

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participants')
    .insert(
      participants.map((p) => ({
        bill_di: billId,
        name: p.name,
        phone_number: p.phone,
      }))
    )
    .select()

    if (error) throw new Error(error.message)
    return data
}