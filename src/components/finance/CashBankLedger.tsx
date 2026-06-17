 import {  useState, useMemo  } from 'react';
import { useAccountLedger } from '../../hooks/useFinance';
import type { CashBankAccount } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Props {
  account: CashBankAccount;
  onClose: () => void;
}

export default function CashBankLedger({ account, onClose }: Props) {
  const { data: ledgerLines, loading } = useAccountLedger(account.gl_account_id);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchRef, setSearchRef] = useState('');

  // Calculate opening balance based on lines before dateFrom
  const { filteredLines, startBalance, totalReceipt, totalPayment, endBalance } = useMemo(() => {
    let currentBal = 0;
    let startBal = 0;
    let tReceipt = 0;
    let tPayment = 0;
    
    // In asset accounts, debit increases, credit decreases
    const processedLines = ledgerLines.map((line: any) => {
      const receipt = line.debit || 0;
      const payment = line.credit || 0;
      currentBal += (receipt - payment);
      return {
        ...line,
        receipt,
        payment,
        running_balance: currentBal
      };
    });

    let filtered = processedLines;

    if (dateFrom) {
      // Find the balance right before dateFrom
      const beforeLines = processedLines.filter((l: any) => l.transaction_date < dateFrom);
      startBal = beforeLines.length > 0 ? beforeLines[beforeLines.length - 1].running_balance : 0;
      filtered = filtered.filter((l: any) => l.transaction_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((l: any) => l.transaction_date <= dateTo);
    }

    if (searchRef) {
      const lowerSearch = searchRef.toLowerCase();
      filtered = filtered.filter((l: any) => 
        (l.reference || '').toLowerCase().includes(lowerSearch) || 
        (l.description || '').toLowerCase().includes(lowerSearch) ||
        (l.transaction_number || '').toLowerCase().includes(lowerSearch)
      );
    }

    filtered.forEach((l: any) => {
      tReceipt += l.receipt;
      tPayment += l.payment;
    });

    const finalBal = filtered.length > 0 ? filtered[filtered.length - 1].running_balance : startBal;

    return { filteredLines: filtered, startBalance: startBal, totalReceipt: tReceipt, totalPayment: tPayment, endBalance: finalBal };
  }, [ledgerLines, dateFrom, dateTo, searchRef]);

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ledger View: {account.account_name} ({account.account_code})</h2>
            <p className="text-sm text-slate-500 mt-1">Based on posted GL entries for account {account.gl_account_id}</p>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <Label>Date From</Label>
            <Input type="date" value={dateFrom} onChange={(e: any) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date To</Label>
            <Input type="date" value={dateTo} onChange={(e: any) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label>Search Ref / Desc</Label>
            <Input placeholder="Search..." value={searchRef} onChange={(e: any) => setSearchRef(e.target.value)} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="text-sm text-slate-500 font-medium">Opening Balance</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{formatter.format(startBalance)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 font-medium">Total Receipt</div>
            <div className="text-lg font-bold text-green-900 mt-1">{formatter.format(totalReceipt)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 font-medium">Total Payment</div>
            <div className="text-lg font-bold text-red-900 mt-1">{formatter.format(totalPayment)}</div>
          </div>
          <div className="bg-brand-50 p-4 rounded-lg border border-brand-200">
            <div className="text-sm text-brand-700 font-medium">Ending Balance</div>
            <div className="text-lg font-bold text-brand-900 mt-1">{formatter.format(endBalance)}</div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tx No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description & Ref</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Receipt</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Running Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Journal No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading ledger data...</td>
                </tr>
              ) : filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No ledger entries found.</td>
                </tr>
              ) : (
                filteredLines.map((line: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{line.transaction_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{line.transaction_number || line.source_document_id}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>{line.description}</div>
                      {line.reference && <div className="text-xs text-slate-500 mt-0.5">Ref: {line.reference}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {line.receipt > 0 ? formatter.format(line.receipt) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {line.payment > 0 ? formatter.format(line.payment) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900 bg-slate-50/50">
                      {formatter.format(line.running_balance)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-slate-500 font-mono text-xs">
                      {line.journal_entry_id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
