import { supabase } from '../../lib/supabase';
import type { InventoryMovementRepository } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseInventoryMovementRepository implements InventoryMovementRepository {
  async listMovements(filters?: any): Promise<any[]> {
    let query = supabase.from('inventory_movements').select('*');
    
    if (filters) {
      if (filters.project_id === 'NULL') {
        query = query.is('project_id', null);
      } else if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.item_id) query = query.eq('item_id', filters.item_id);
      if (filters.direction) query = query.eq('direction', filters.direction);
    }

    // Order movement by movement_date asc, created_at asc
    query = query.order('movement_date', { ascending: true })
                 .order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) handleSupabaseError(error);
    return (data || []).map(this.mapToFrontend);
  }

  async getMovementById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return data ? this.mapToFrontend(data) : null;
  }

  async listKartuStok(itemId: string, projectId?: string, locationId?: string): Promise<any[]> {
    let query = supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_id', itemId)
      .order('movement_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (projectId === 'NULL') {
      query = query.is('project_id', null);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    return (data || []).map(this.mapToFrontend);
  }

  private mapToFrontend(dbRow: any): any {
    if (!dbRow) return dbRow;
    return {
      id: dbRow.id,
      organizationId: dbRow.organization_id,
      projectId: dbRow.project_id,
      locationId: dbRow.location_id,
      itemId: dbRow.item_id,
      movementDate: dbRow.movement_date,
      direction: dbRow.direction,
      quantity: Number(dbRow.quantity || 0),
      unitCost: dbRow.unit_cost !== null ? Number(dbRow.unit_cost) : undefined,
      referenceType: dbRow.reference_type,
      referenceId: dbRow.reference_id,
      referenceNumber: dbRow.reference_number,
      stockBefore: Number(dbRow.stock_before || 0),
      stockAfter: Number(dbRow.stock_after || 0),
      notes: dbRow.notes,
      transactionId: dbRow.transaction_id,
      createdAt: dbRow.created_at
    };
  }
}
