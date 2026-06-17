import { supabase } from '../../lib/supabase';
import type { InventoryBalanceRepository } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseInventoryBalanceRepository implements InventoryBalanceRepository {
  async listBalances(filters?: any): Promise<any[]> {
    let query = supabase.from('inventory_balances').select('*');
    
    if (filters) {
      if (filters.project_id === 'NULL') {
        query = query.is('project_id', null);
      } else if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.item_id) query = query.eq('item_id', filters.item_id);
    }

    const { data, error } = await query;

    if (error) handleSupabaseError(error);
    return (data || []).map(this.mapToFrontend);
  }

  async getBalance(projectId: string, locationId: string, itemId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('inventory_balances')
      .select('*')
      .eq('project_id', projectId)
      .eq('location_id', locationId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return data ? this.mapToFrontend(data) : null;
  }

  private mapToFrontend(dbRow: any): any {
    if (!dbRow) return dbRow;
    return {
      id: dbRow.id,
      organizationId: dbRow.organization_id,
      projectId: dbRow.project_id,
      locationId: dbRow.location_id,
      itemId: dbRow.item_id,
      quantity: Number(dbRow.physical_quantity || 0),
      physicalQuantity: Number(dbRow.physical_quantity || 0),
      reservedQuantity: Number(dbRow.reserved_quantity || 0),
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }
}
