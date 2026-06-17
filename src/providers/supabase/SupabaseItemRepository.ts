import { supabase } from '../../lib/supabase';
import type { ItemRepository } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseItemRepository implements ItemRepository {
  async listItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return (data || []).map(this.mapToFrontend);
  }

  async getItemById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return data ? this.mapToFrontend(data) : null;
  }

  async createItem(data: any): Promise<any> {
    if (!data.code) throw new Error('Code is required');
    if (!data.name) throw new Error('Name is required');

    const dbPayload = this.mapToDatabase(data);
    
    const { data: result, error } = await supabase
      .from('items')
      .insert([dbPayload])
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return this.mapToFrontend(result);
  }

  async updateItem(id: string, data: any): Promise<any> {
    const dbPayload = this.mapToDatabase(data);
    delete dbPayload.id; 
    delete dbPayload.created_at;

    const { data: result, error } = await supabase
      .from('items')
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
      itemType: dbRow.item_type,
      unit: dbRow.uom,
      category: dbRow.category,
      active: dbRow.active,
      standardCost: Number(dbRow.standard_cost || 0),
      sellingPrice: Number(dbRow.selling_price || 0),
      packagePrice: dbRow.package_price !== null ? Number(dbRow.package_price) : undefined,
      chickenCapacity: dbRow.chicken_capacity !== null ? Number(dbRow.chicken_capacity) : undefined,
      cageSize: dbRow.cage_size,
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
    if (feObj.itemType !== undefined) dbObj.item_type = feObj.itemType;
    if (feObj.unit !== undefined) dbObj.uom = feObj.unit;
    if (feObj.category !== undefined) dbObj.category = feObj.category;
    if (feObj.active !== undefined) dbObj.active = feObj.active;
    if (feObj.standardCost !== undefined) dbObj.standard_cost = feObj.standardCost;
    if (feObj.sellingPrice !== undefined) dbObj.selling_price = feObj.sellingPrice;
    if (feObj.packagePrice !== undefined) dbObj.package_price = feObj.packagePrice;
    if (feObj.chickenCapacity !== undefined) dbObj.chicken_capacity = feObj.chickenCapacity;
    if (feObj.cageSize !== undefined) dbObj.cage_size = feObj.cageSize;
    return dbObj;
  }
}
