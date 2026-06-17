import { useState } from 'react'; 
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Menu,
  X,
  PieChart,
  Wallet,
  ArrowRightLeft,
  FileText,
  Receipt
} from 'lucide-react';

const financeMenus = [
  { name: 'Dashboard Keuangan', href: '/finance', icon: PieChart, exact: true },
  { name: 'Pos Kas & Bank', href: '/finance/cash-bank', icon: Wallet },
  { name: 'Uang Masuk / Keluar / Mutasi', href: '/finance/cash-transactions', icon: ArrowRightLeft },
  { name: 'Piutang Customer', href: '/finance/ar/invoices', icon: FileText },
  // { name: 'Customer DP', href: '/finance/ar/customer-dp', icon: CreditCard }, // UMKM: Hidden
  { name: 'Terima Pembayaran', href: '/finance/ar/payments', icon: Receipt },
  // { name: 'AR Aging', href: '/finance/ar/aging', icon: TrendingDown }, // UMKM: Hidden
  { name: 'Hutang Supplier', href: '/finance/ap/bills', icon: FileText },
  { name: 'Bayar Supplier', href: '/finance/ap/payments', icon: Receipt },
  // { name: 'AP Aging', href: '/finance/ap/aging', icon: TrendingUp }, // UMKM: Hidden
  // { name: 'Customer Refunds', href: '/finance/refunds/customer', icon: RotateCcw }, // UMKM: Hidden
  // { name: 'Supplier Refunds', href: '/finance/refunds/supplier', icon: RotateCcw }, // UMKM: Hidden
  // { name: 'Journal Register', href: '/finance/journals', icon: BookOpen }, // UMKM: Hidden
  // { name: 'General Ledger', href: '/finance/gl', icon: Book }, // UMKM: Hidden
  // { name: 'Trial Balance', href: '/finance/tb', icon: Scale }, // UMKM: Hidden
  // { name: 'Accounting Periods', href: '/finance/periods', icon: Calendar }, // UMKM: Hidden
  // { name: 'Project Closing', href: '/finance/project-closing', icon: CheckSquare }, // UMKM: Hidden
  // { name: 'Profit Distributions', href: '/finance/profit-distributions', icon: Coins }, // UMKM: Hidden
  // { name: 'Chart of Accounts', href: '/finance/coa', icon: List }, // UMKM: Hidden
  // { name: 'Accounting Mapping', href: '/finance/mapping', icon: GitMerge }, // UMKM: Hidden
];

export default function FinanceLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-slate-50 flex-col md:flex-row">
      {/* Mobile menu toggle */}
      <div className="md:hidden p-4 bg-white border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Finance Menu</h2>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-500 hover:text-slate-700"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        ${mobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0
      `}>
        <div className="h-full overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {financeMenus.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    // we can't easily check isActive inside here without re-evaluating, but React Router NavLink passes it to className
                    // so we just use group-hover for the icon
                    'text-slate-400 group-hover:text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
}
