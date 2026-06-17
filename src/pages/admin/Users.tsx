import React, { useState } from 'react';
import { Users as UsersIcon, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useUsers, useUpdateUserRole, useUpdateUserStatus, useCreateUser } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  'CEO_ADMIN': 'Owner/Admin',
  'FINANCE': 'Finance',
  'WAREHOUSE': 'Gudang',
  'SALES': 'Sales',
  'INVESTOR': 'Investor',
  'WORKER': 'Staff/Pekerja',
  'GUEST': 'Tamu'
};

export default function Users() {
  const { profile } = useAuth();
  const { data: users, isLoading, error, refetch } = useUsers();
  const updateRoleMutation = useUpdateUserRole(() => refetch());
  const updateStatusMutation = useUpdateUserStatus(() => refetch());
  const createUserMutation = useCreateUser(() => refetch());

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'WORKER', status: true });
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createUserMutation.mutateAsync(inviteForm);
      if (res.requireDashboard) {
        setInviteMessage(res.message);
      } else {
        setShowInvite(false);
        setInviteForm({ name: '', email: '', role: 'WORKER', status: true });
      }
    } catch (err: any) {
      alert(`Gagal menambah user: ${err.message}`);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    if (userId === profile?.id && newRole !== 'CEO_ADMIN') {
      if (!window.confirm("Anda akan mengubah role Anda sendiri menjadi lebih rendah. Anda akan kehilangan akses Pengaturan. Lanjutkan?")) return;
    }
    updateRoleMutation.mutate({ userId, roleCode: newRole });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    if (userId === profile?.id) {
      alert("Anda tidak dapat menonaktifkan akun Anda sendiri.");
      return;
    }
    updateStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  if (profile?.role !== 'CEO_ADMIN') {
    return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak. Anda bukan Owner/Admin.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Pengaturan User & Role
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Kelola akses pengguna internal SBS, atur wewenang (Role), dan status aktif.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-x-2 rounded-md bg-sbs-gold-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sbs-gold-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sbs-gold-600"
          >
            <UserPlus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Tambah / Invite User
          </button>
        </div>
      </div>

      {showInvite && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Tambah Pengguna Baru</h3>
          
          {inviteMessage && (
            <div className="mb-4 rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">{inviteMessage}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">Alamat Email</label>
              <div className="mt-2">
                <input type="email" id="email" required value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
              </div>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Nama Lengkap (Opsional untuk Local)</label>
              <div className="mt-2">
                <input type="text" id="name" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
              </div>
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900">Pilih Role</label>
              <div className="mt-2">
                <select id="role" value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6">
                  {Object.entries(ROLE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createUserMutation.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500">
                {createUserMutation.isPending ? 'Memproses...' : 'Simpan / Invite'}
              </button>
              <button type="button" onClick={() => {setShowInvite(false); setInviteMessage(null);}} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Tutup</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Memuat daftar user...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">Gagal memuat user: {(error as any).message}</div>
      ) : (
        <div className="table-wrapper overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="table-header">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left sm:pl-6">Nama & Email</th>
                <th scope="col" className="px-3 py-3.5 text-left">Role Akses</th>
                <th scope="col" className="px-3 py-3.5 text-left">Status</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {users?.map((user: any) => (
                <tr key={user.id} className="table-row-hover">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{user.name || 'User'}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updateRoleMutation.isPending}
                      className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
                    >
                      {Object.entries(ROLE_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {user.active ? (
                      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-green-700 bg-green-50 ring-1 ring-inset ring-green-600/20">
                        <CheckCircle className="h-4 w-4" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-700 bg-red-50 ring-1 ring-inset ring-red-600/20">
                        <XCircle className="h-4 w-4" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.active)}
                      disabled={updateStatusMutation.isPending || user.id === profile?.id}
                      className={`${
                        user.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      } disabled:opacity-50`}
                    >
                      {user.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500">Belum ada user tambahan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
