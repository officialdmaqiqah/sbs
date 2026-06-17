import { supabase } from '../../lib/supabase';
import type { ProjectRepository } from '../../repositories/interfaces';
import { handleSupabaseError } from './utils';

export class SupabaseProjectRepository implements ProjectRepository {
  async listProjects(): Promise<any[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    
    return (data || []).map(this.mapToFrontend);
  }

  async getProjectById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) handleSupabaseError(error);
    return data ? this.mapToFrontend(data) : null;
  }

  async createProject(data: any): Promise<any> {
    if (!data.code) throw new Error('Code is required');
    if (!data.name) throw new Error('Name is required');

    // If organizationId not passed, get it from the current auth session profile
    if (!data.organizationId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.organization_id) {
          data = { ...data, organizationId: profile.organization_id };
        }
      }
    }

    const dbPayload = this.mapToDatabase(data);
    
    const { data: result, error } = await supabase
      .from('projects')
      .insert([dbPayload])
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return this.mapToFrontend(result);
  }

  async updateProject(id: string, data: any): Promise<any> {
    const dbPayload = this.mapToDatabase(data);
    delete dbPayload.id; // ensure we don't overwrite id
    delete dbPayload.created_at;

    const { data: result, error } = await supabase
      .from('projects')
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
      status: dbRow.status,
      startDate: dbRow.start_date,
      endDate: dbRow.end_date,
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
    if (feObj.status !== undefined) dbObj.status = feObj.status;
    if (feObj.startDate !== undefined) dbObj.start_date = feObj.startDate;
    if (feObj.endDate !== undefined) dbObj.end_date = feObj.endDate;
    return dbObj;
  }
}
