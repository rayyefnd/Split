'use server'

import { createClient } from "@/lib/supabase/server";

//Draft bill
export async function createDraftBill() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bills')
    .insert({ host_name: 'Host', title: 'Items', total_amount: 0, status: 'draft' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

//The host of the bill
export async function updateHostName(billId: string, hostSecret: string, hostName: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bills')
        .update({ host_name: hostName })
        .eq('id', billId)
        .eq('host_secret', hostSecret)
        .select()
        .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Not authorized to edit this bill')

    return data
}

//Update title
export async function updateBillTitle(billId: string, hostSecret: string, title: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bills')
        .update({ title })
        .eq('id', billId)
        .eq('host_secret', hostSecret)
        .select()
        .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Not authorized to edit this bill')

    return data
}

//Assignt item to a specific participants (Ex: Es teh - Ilham)
export async function assignItem(itemId: string, participantId: string, billId: string, hostSecret: string) {
    const supabase = await createClient()

    const { data: bill } = await supabase
        .from('bills')
        .select('id')
        .eq('id', billId)
        .eq('host_secret', hostSecret)
        .single()

    if (!bill) throw new Error('Not authorized to assign items on this bill')

    const { error } = await supabase
        .from('item_assignments')
        .insert({ item_id: itemId, participant_id: participantId })
    
    if (error) throw new Error(error.message)
}

//Add participant
export async function addParticipants(
    billId: string,
    hostSecret: string,
    participants: { name: string; phone: string }[]
) {
    const supabase = await createClient()

    // verify host owns this bill before inserting anything
    const { data: bill } = await supabase
        .from('bills')
        .select('id')
        .eq('id', billId)
        .eq('host_secret', hostSecret)
        .single()

    if (!bill) throw new Error('Not authorized to edit this bill')

    const { data, error } = await supabase
        .from('participants')
        .insert(
            participants.map((p) => ({
                bill_id: billId,
                name: p.name,
                phone_number: p.phone,
            }))
        )
        .select()

    if (error) throw new Error(error.message)
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