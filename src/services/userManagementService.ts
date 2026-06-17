import { db } from './db';
import { supabase } from '../lib/supabase';
import { environment } from '../config/environment';

export interface UserManagementService {
  listUsers(): Promise<any[]>;
  createUser(input: any): Promise<any>;
  updateUserRole(userId: string, roleCode: string): Promise<any>;
  updateUserStatus(userId: string, isActive: boolean): Promise<any>;
}

class LocalUserManagementService implements UserManagementService {
  async listUsers() {
    const profiles = (db as any).getAll('profiles') || [];
    const roles = (db as any).getAll('user_roles') || [];
    
    if (profiles.length === 0) {
      return [
        { id: 'dummy-user-id', name: 'Local Admin', email: 'admin@sbs.local', role: 'CEO_ADMIN', active: true, created_at: new Date().toISOString() }
      ];
    }
    
    return profiles.map((p: any) => {
      const userRole = roles.find((r: any) => r.user_id === p.id);
      return {
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        role: userRole ? userRole.role_code : 'WORKER',
        active: userRole ? userRole.active : true,
        created_at: p.created_at
      };
    });
  }

  async createUser(input: any) {
    const userId = crypto.randomUUID();
    (db as any).insert('profiles', {
      id: userId,
      email: input.email,
      full_name: input.name,
      created_at: new Date().toISOString()
    });
    
    (db as any).insert('user_roles', {
      id: crypto.randomUUID(),
      user_id: userId,
      role_code: input.role,
      active: input.status,
      created_at: new Date().toISOString()
    });
    
    return { success: true, message: 'User added to local db.' };
  }

  async updateUserRole(userId: string, roleCode: string) {
    const roles = (db as any).getAll('user_roles') || [];
    const userRole = roles.find((r: any) => r.user_id === userId);
    if (userRole) {
      (db as any).update('user_roles', userRole.id, { role_code: roleCode });
    }
    return { success: true };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const roles = (db as any).getAll('user_roles') || [];
    const userRole = roles.find((r: any) => r.user_id === userId);
    if (userRole) {
      (db as any).update('user_roles', userRole.id, { active: isActive });
    }
    return { success: true };
  }
}

class SupabaseUserManagementService implements UserManagementService {
  async listUsers() {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) throw pErr;
    
    const { data: roles, error: rErr } = await supabase.from('user_roles').select('user_id, active, roles(code)');
    if (rErr) throw rErr;

    return profiles.map((p: any) => {
      const userRole = roles?.find((r: any) => r.user_id === p.id);
      return {
        id: p.id,
        name: p.full_name,
        email: p.email || 'N/A', // Assuming we rely on profile.email
        role: (userRole as any)?.roles?.code || 'GUEST',
        active: userRole ? userRole.active : false,
        created_at: p.created_at
      };
    });
  }

  async createUser(_input: any) {
    return { 
      success: true, 
      message: 'Karena alasan keamanan, penambahan user baru harus melalui fitur Invite di Dashboard Supabase. Setelah user diundang dan login pertama kali, profilnya akan muncul di sini dan Anda dapat mengatur role-nya.',
      requireDashboard: true 
    };
  }

  async updateUserRole(userId: string, roleCode: string) {
    const { data: roleData, error: roleErr } = await supabase.from('roles').select('id').eq('code', roleCode).single();
    if (roleErr || !roleData) throw new Error('Role not found');

    const { error } = await supabase.from('user_roles').update({ role_id: roleData.id }).eq('user_id', userId);
    if (error) throw error;
    return { success: true };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const { error } = await supabase.from('user_roles').update({ active: isActive }).eq('user_id', userId);
    if (error) throw error;
    return { success: true };
  }
}

export const userManagementService: UserManagementService = 
  environment.dataProvider === 'local' ? new LocalUserManagementService() : new SupabaseUserManagementService();
