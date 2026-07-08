import type { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  CircleDollarSign, 
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { environment } from '../config/environment';

type MenuItem = {
  name: string;
  href?: string;
  icon?: any;
  children?: { name: string; href: string }[];
  roles?: string[];
};

const navigation: MenuItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Panduan Alur SBS', href: '/guide', icon: Package },
  {
    name: 'Project',
    icon: LayoutDashboard,
    roles: ['CEO_ADMIN', 'FINANCE', 'MARKETING', 'PRODUKSI'],
    children: [
      { name: 'Daftar Project', href: '/projects' },
      { name: 'Tutup Buku & Bagi Hasil', href: '/finance/project-closing' },
    ]
  },
  { 
    name: 'Operasional', 
    icon: Package,
    roles: ['CEO_ADMIN', 'PRODUKSI'],
    children: [
      { name: 'Master Barang', href: '/inventory' },
      { name: 'Pembelian (PO)', href: '/purchase' },
      { name: 'Produksi Kandang', href: '/operations/cage-production' },
      { name: 'Produksi Pakan', href: '/operations/feed-mixing' },
    ]
  },
  {
    name: 'Penjualan',
    icon: Receipt,
    roles: ['CEO_ADMIN', 'FINANCE', 'MARKETING'],
    children: [
      { name: 'Produk & Paket', href: '/products' },
      { name: 'Order Penjualan', href: '/sales/orders' },
      { name: 'Piutang Customer', href: '/finance/ar/aging' },
      { name: 'Terima Pembayaran', href: '/finance/ar/payments' },
    ]
  },
  {
    name: 'Distribusi',
    icon: ShoppingCart,
    roles: ['CEO_ADMIN', 'DISTRIBUSI', 'WAREHOUSE'],
    children: [
      { name: 'Pengiriman', href: '/distribution/shipments' },
      { name: 'Biaya Distribusi', href: '/finance/cash-transactions' },
    ]
  },
  {
    name: 'Keuangan',
    icon: CircleDollarSign,
    roles: ['CEO_ADMIN', 'FINANCE'],
    children: [
      { name: 'Kas/Bank', href: '/finance/cash-bank' },
      { name: 'Uang Masuk/Keluar', href: '/finance/cash-transactions' },
      { name: 'Hutang Supplier', href: '/finance/ap/aging' },
      { name: 'Bayar Supplier', href: '/finance/ap/payments' },
      { name: 'Biaya Operasional', href: '/finance/cash-transactions' },
    ]
  },
  {
    name: 'Laporan',
    icon: BarChart3,
    roles: ['CEO_ADMIN', 'FINANCE', 'INVESTOR'],
    children: [
      { name: 'Dashboard Project', href: '/reports/pl' },
      { name: 'Arus Kas', href: '/reports/cashflow' },
      { name: 'Laba Rugi', href: '/reports/pl' },
      { name: 'Neraca', href: '/reports/bs' },
      { name: 'Laporan Stok', href: '/reports/inventory' },
      { name: 'Laporan Penjualan', href: '/reports/sales' },
      { name: 'Laporan Pembelian', href: '/reports/purchase' },
      { name: 'Laporan Bagi Hasil', href: '/finance/profit-distributions' },
    ]
  },
  {
    name: 'Pengaturan',
    icon: Shield,
    roles: ['CEO_ADMIN'],
    children: [
      { name: 'User & Role', href: '/settings/users' },
      { name: 'Setup Saldo Awal', href: '/setup/initial-balance' },
      { name: 'Akuntansi Lanjutan', href: '/settings/advanced-features' },
    ]
  }
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { activeProject, availableProjects, setActiveProject } = useProject();

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-navy-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-20 shrink-0 items-center justify-between px-6 bg-navy-900/95 backdrop-blur-md border-b border-navy-800/50 sticky top-0 z-10">
          <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-3 w-full">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm p-0.5 border border-sbs-gold-500 overflow-hidden shrink-0">
              <img src="/logo.jpg" alt="SBS" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=SBS&background=eab308&color=1e293b'; }} />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm text-sbs-gold-400 font-extrabold uppercase tracking-widest leading-none">SBS</span>
              <span className="text-sm font-medium text-slate-300 truncate">System</span>
            </div>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-navy-800 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4 custom-scrollbar">
          <nav className="flex-1 space-y-1 px-4">
            {/* Main Navigation */}
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                // Role Visibility Logic
                if (item.roles && profile?.role && !item.roles.includes(profile.role)) {
                  // Fallback for missing roles mapping or owner access: CEO_ADMIN has all access
                  if (profile.role !== 'CEO_ADMIN') return null;
                }

                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isOpen = openMenus.includes(item.name);

                return (
                  <li key={item.name}>
                    {hasChildren ? (
                      <div className="flex flex-col">
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className="group flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-slate-300 hover:bg-navy-800 hover:text-white border-l-4 border-transparent"
                        >
                          <div className="flex items-center">
                            {Icon && <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />}
                            {item.name}
                          </div>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {isOpen && (
                          <ul className="mt-1 space-y-1 pl-10">
                            {item.children!.map((child) => (
                              <li key={child.name}>
                                <NavLink
                                  to={child.href}
                                  className={({ isActive }) =>
                                    `group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                      isActive
                                        ? 'bg-navy-800 text-sbs-gold-500'
                                        : 'text-slate-400 hover:bg-navy-800 hover:text-white'
                                    }`
                                  }
                                >
                                  {child.name}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <NavLink
                        to={item.href!}
                        className={({ isActive }) =>
                          `group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-navy-800 text-sbs-gold-500 border-l-4 border-sbs-gold-500'
                              : 'text-slate-300 hover:bg-navy-800 hover:text-white border-l-4 border-transparent'
                          }`
                        }
                      >
                        {Icon && <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />}
                        {item.name}
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="border-t border-navy-800/50 p-4 bg-navy-900/50">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0 group-hover:text-red-400 transition-colors" aria-hidden="true" />
            Keluar Sistem
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full relative">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 z-30 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg lg:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sultan Berkah Sejahtera</h1>
            </div>
            
            {/* Active Project Selector */}
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 hidden md:block whitespace-nowrap">Project Aktif:</span>
              <select
                className="block w-full max-w-[200px] rounded-md border-slate-300 py-1.5 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 bg-slate-50"
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const selected = availableProjects.find(p => p.id === e.target.value);
                  setActiveProject(selected || null);
                }}
              >
                <option value="">-- Pilih Project --</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 sm:gap-6">
            <div className="hidden xl:flex items-center gap-3">
              <div data-testid="provider-indicator" className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200/60 text-xs text-slate-600 font-medium shadow-sm">
                <span className={`flex h-2.5 w-2.5 rounded-full ${environment.dataProvider === 'supabase' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-brand-500'}`}></span>
                <span>{environment.dataProvider.toUpperCase()}</span>
              </div>
              
              {profile && (
                <div data-testid="role-indicator" className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 rounded-full border border-indigo-100 text-xs text-indigo-700 font-medium shadow-sm">
                  <span data-testid="role-badge" className="font-bold bg-indigo-100 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">{profile.role || 'GUEST'}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 pl-3 sm:pl-6 sm:border-l border-slate-200">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-slate-800 leading-tight">
                  {profile?.full_name || 'User'}
                </span>
                {profile?.role && (
                  <span className="text-xs text-sbs-gold-600 font-medium leading-tight uppercase mt-0.5">
                    {profile.role.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center text-white font-bold uppercase shadow-md ring-2 ring-white cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all">
                {profile?.full_name ? profile.full_name.charAt(0) : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Warning Banner if No Active Project */}
        {!activeProject && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 lg:px-8 text-sm text-amber-800 flex items-center justify-center">
            <span className="font-semibold mr-2">Peringatan:</span>
            Pilih atau buat project terlebih dahulu sebelum mencatat transaksi.
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
