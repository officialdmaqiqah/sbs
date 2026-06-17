 import { useMemo } from 'react'; 
import { Link } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Building2, 
  FileText, 
  AlertCircle,
  Receipt,
  ArrowRightLeft,
  CreditCard
} from 'lucide-react';
import { useCashBankAccounts, useCustomerInvoices, useCustomerDP, useSupplierAdvances } from '../hooks/useFinance';
import { useCashBankMutations } from '../hooks/useCashBankMutations';
import { useSupplierBills } from '../hooks/useSupplierBills';
import { periodService } from '../services/periodService';
import { projectClosingService } from '../services/projectClosingService';

export default function FinanceOverview() {
  const { data: accounts } = useCashBankAccounts();
  const { data: invoices } = useCustomerInvoices();
  const { data: customerDPs } = useCustomerDP();
  const { bills } = useSupplierBills();
  const { data: supplierAdvances } = useSupplierAdvances();
  const { data: mutations, accountBalances } = useCashBankMutations();

  // Metrics calculation
  const totalCash = useMemo(() => accounts.filter(a => a.account_type === 'Cash').reduce((sum, a) => sum + (accountBalances[a.id] || 0), 0), [accounts, accountBalances]);
  const totalBank = useMemo(() => accounts.filter(a => a.account_type === 'Bank').reduce((sum, a) => sum + (accountBalances[a.id] || 0), 0), [accounts, accountBalances]);
  const totalCashBank = totalCash + totalBank;

  const totalAR = useMemo(() => invoices.reduce((sum: number, inv: any) => sum + (inv.outstanding_amount || 0), 0), [invoices]);
  const overdueAR = useMemo(() => invoices.filter(inv => inv.outstanding_amount > 0 && new Date(inv.due_date) < new Date()).reduce((sum: number, inv: any) => sum + inv.outstanding_amount, 0), [invoices]);

  const totalAP = useMemo(() => bills.filter(b => b.status !== 'Paid').reduce((sum: number, bill: any) => sum + (bill.outstanding_amount || 0), 0), [bills]);
  const overdueAP = useMemo(() => bills.filter(b => new Date(b.due_date) < new Date() && b.status !== 'Paid').reduce((sum: number, bill: any) => sum + (bill.outstanding_amount || 0), 0), [bills]);

  const totalCustomerDP = useMemo(() => customerDPs.reduce((sum: number, dp: any) => sum + (dp.unapplied_amount || 0), 0), [customerDPs]);
  const totalSupplierAdvance = useMemo(() => supplierAdvances.reduce((sum: number, adv: any) => sum + (adv.unapplied_amount || 0), 0), [supplierAdvances]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const cashIn = useMemo(() => mutations.filter(tx => tx.mutation_type === 'IN' && tx.mutation_date?.startsWith(currentMonth)).reduce((sum, tx) => sum + tx.amount, 0), [mutations, currentMonth]);
  const cashOut = useMemo(() => mutations.filter(tx => tx.mutation_type === 'OUT' && tx.mutation_date?.startsWith(currentMonth)).reduce((sum, tx) => sum + tx.amount, 0), [mutations, currentMonth]);

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  // Accounting Sprint 3 Overview Metrics
  const activePeriods = useMemo(() => periodService.getPeriods().filter(p => p.status === 'Open' || p.status === 'Soft Closed'), []);
  const activePeriod = activePeriods.length > 0 ? activePeriods[0] : null;
  const reviewProjects = useMemo(() => projectClosingService.getProjects().filter(p => p.status === 'Accounting Review' || p.status === 'Ready to Close'), []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your financial health</p>
        </div>
      </div>

      {/* Accounting Sprint 3 Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-brand-50 border border-brand-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-800 uppercase tracking-wider">Current Accounting Period</h3>
            <p className="text-xl font-bold text-brand-900 mt-1">{activePeriod ? activePeriod.period_name : 'No Active Period'}</p>
          </div>
          <Link to="/finance/periods" className="text-sm font-medium text-brand-600 hover:text-brand-800">Manage Periods &rarr;</Link>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wider">Projects in Closing Review</h3>
            <p className="text-xl font-bold text-purple-900 mt-1">{reviewProjects.length} Projects Pending</p>
          </div>
          <Link to="/finance/project-closing" className="text-sm font-medium text-purple-600 hover:text-purple-800">Review Now &rarr;</Link>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {overdueAR > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Overdue Invoices</h3>
              <p className="text-sm text-red-700 mt-1">You have {formatter.format(overdueAR)} in overdue customer invoices.</p>
            </div>
          </div>
        )}
        {overdueAP > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Overdue Bills</h3>
              <p className="text-sm text-amber-700 mt-1">You have {formatter.format(overdueAP)} in overdue supplier bills.</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Link to="/finance/cash-transactions" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <ArrowDownRight className="h-6 w-6 text-green-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Record Receipt</span>
        </Link>
        <Link to="/finance/cash-transactions" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <ArrowUpRight className="h-6 w-6 text-red-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Record Payment</span>
        </Link>
        <Link to="/finance/cash-transactions" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <ArrowRightLeft className="h-6 w-6 text-blue-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Bank Transfer</span>
        </Link>
        <Link to="/finance/ar/invoices" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <FileText className="h-6 w-6 text-indigo-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Create Invoice</span>
        </Link>
        <Link to="/finance/ar/payments" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <Receipt className="h-6 w-6 text-teal-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Receive Payment</span>
        </Link>
        <Link to="/finance/ap/bills" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <FileText className="h-6 w-6 text-orange-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Create Bill</span>
        </Link>
        <Link to="/finance/ap/payments" className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand-300 transition-all text-center">
          <CreditCard className="h-6 w-6 text-rose-500 mb-2" />
          <span className="text-xs font-medium text-slate-700">Pay Supplier</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Cash & Bank</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter.format(totalCashBank)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Wallet className="h-5 w-5 text-blue-600" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500 mr-4">Cash: <span className="font-medium text-slate-700">{formatter.format(totalCash)}</span></span>
            <span className="text-slate-500">Bank: <span className="font-medium text-slate-700">{formatter.format(totalBank)}</span></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Account Receivables</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter.format(totalAR)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><Building2 className="h-5 w-5 text-green-600" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500 mr-4">Overdue: <span className="font-medium text-red-600">{formatter.format(overdueAR)}</span></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Account Payables</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter.format(totalAP)}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg"><Building2 className="h-5 w-5 text-orange-600" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500 mr-4">Overdue: <span className="font-medium text-red-600">{formatter.format(overdueAP)}</span></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Cash Flow (This Month)</p>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center"><ArrowDownRight className="h-4 w-4 text-green-500 mr-1" /> In</span>
                <span className="font-medium text-slate-900">{formatter.format(cashIn)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center"><ArrowUpRight className="h-4 w-4 text-red-500 mr-1" /> Out</span>
                <span className="font-medium text-slate-900">{formatter.format(cashOut)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Customer DP (Unapplied)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter.format(totalCustomerDP)}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Supplier Advances</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatter.format(totalSupplierAdvance)}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
