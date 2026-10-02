'use server'

import { createClient } from "@/lib/supabase/server"

export async function setItemAssignments(itemId: string, participantIds: string[]) {
    const supabase = await createClient()

    const { error: deleteError } = await supabase
        .from('item_assignments')
        .delete()
        .eq('item_id', itemId)
    
    if(deleteError) throw new Error(deleteError.message)
    
    if(participantIds.length === 0) return[]

    const share = 1 / participantIds.length

    const { data, error } = await supabase
        .from('item_assignments')
        .insert(
            participantIds.map((participantIds) => ({
                item_id: itemId,
                participant_id: participantIds,
                share, 
            }))
        )

        .select()
    
    if(error) throw new Error(error.message)
    return data
}