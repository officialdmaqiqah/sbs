import { supabase } from '../../lib/supabase';
import type { InventoryCommandService } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseInventoryCommandService implements InventoryCommandService {
  async postInventoryTransaction(input: any): Promise<any> {
    const rpcPayload = {
      p_project_id: input.projectId,
      p_location_id: input.locationId,
      p_item_id: input.itemId,
      p_movement_date: input.date || input.movementDate,
      p_direction: input.direction,
      p_quantity: input.quantity,
      p_unit_cost: input.unitCost !== undefined ? input.unitCost : null,
      p_reference_type: input.referenceType || 'MANUAL',
      p_reference_id: input.referenceId || null,
      p_reference_number: input.referenceNumber || input.reference || null,
      p_notes: input.notes || null,
      p_transaction_id: input.transactionId || crypto.randomUUID(),
    };

    const { data, error } = await supabase.rpc('post_inventory_transaction', rpcPayload);

    if (error) handleSupabaseError(error);

    // data is a JSONB containing { movement_id, balance_id, stock_before, stock_after, transaction_id }
    return data;
  }
}
