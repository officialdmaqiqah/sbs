import { supabase } from '../../lib/supabase';
import type { InventoryLocationRepository } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseInventoryLocationRepository implements InventoryLocationRepository {
  async listLocations(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return (data || []).map(this.mapToFrontend);
  }

  async getLocationById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return data ? this.mapToFrontend(data) : null;
  }

  async createLocation(data: any): Promise<any> {
    if (!data.code) throw new Error('Code is required');
    if (!data.name) throw new Error('Name is required');

    const dbPayload = this.mapToDatabase(data);
    
    const { data: result, error } = await supabase
      .from('inventory_locations')
      .insert([dbPayload])
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return this.mapToFrontend(result);
  }

  async updateLocation(id: string, data: any): Promise<any> {
    const dbPayload = this.mapToDatabase(data);
    delete dbPayload.id; 
    delete dbPayload.created_at;

    const { data: result, error } = await supabase
      .from('inventory_locations')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return this.mapToFrontend(result);
  }

  // --- Mappers ---
  private mapToFrontend(dbRow: any): any {
    if (!dbRow) return dbRow;
    return {
      id: dbRow.id,
      organizationId: dbRow.organization_id,
      code: dbRow.code,
      name: dbRow.name,
      locationType: dbRow.location_type,
      active: dbRow.active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private mapToDatabase(feObj: any): any {
    const dbObj: any = {};
    if (feObj.id !== undefined) dbObj.id = feObj.id;
    if (feObj.organizationId !== undefined) dbObj.organization_id = feObj.organizationId;
    if (feObj.code !== undefined) dbObj.code = feObj.code;
    if (feObj.name !== undefined) dbObj.name = feObj.name;
    if (feObj.locationType !== undefined) dbObj.location_type = feObj.locationType;
    if (feObj.active !== undefined) dbObj.active = feObj.active;
    return dbObj;
  }
}
