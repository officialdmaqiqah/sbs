 import { useState, useEffect } from 'react'; 
import { Card, CardContent } from '../components/ui/card';
import { db } from '../services/db';
import type { JournalEntry, JournalEntryLine, Account } from '../types';

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<Record<string, JournalEntry>>({});
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  const [lines, setLines] = useState<(JournalEntryLine & { journal: JournalEntry })[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
    
    if (isSupabase) {
      const { supabase } = await import('../lib/supabase');
      const [resAcc, resJ] = await Promise.all([
        supabase.from('chart_of_accounts').select('*').eq('allow_posting', true).order('account_code'),
        supabase.from('journal_entries').select('*').eq('status', 'Posted')
      ]);
      if (resAcc.data) setAccounts(resAcc.data);
      if (resJ.data) {
        const jMap: Record<string, JournalEntry> = {};
        resJ.data.forEach((j: any) => jMap[j.id] = j);
        setJournals(jMap);
      }
    } else {
      const accs = (db as any).getAll('accounts').filter((a: any) => a.allow_posting).sort((a: any, b: any) => a.account_code.localeCompare(b.account_code));
      setAccounts(accs);

      const js = (db as any).getAll('journal_entries').filter((j: any) => j.status === 'Posted');
      const jMap: Record<string, JournalEntry> = {};
      js.forEach((j: any) => jMap[j.id] = j);
      setJournals(jMap);
    }
  };

  useEffect(() => {
    if (!selectedAccountId) {
      setLines([]);
      return;
    }

    const fetchLines = async () => {
      const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
      let ls = [];
      if (isSupabase) {
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase.from('journal_entry_lines').select('*').eq('account_id', selectedAccountId);
        if (data) ls = data;
      } else {
        ls = (db as any).query('journal_entry_lines', (l: any) => l.account_id === selectedAccountId);
      }

      const enriched = ls.map((l: any) => ({ ...l, journal: journals[l.journal_entry_id!] })).filter((l: any) => !!l.journal);
      
      // Sort chronologically
      enriched.sort((a: any, b: any) => new Date(a.journal.journal_date).getTime() - new Date(b.journal.journal_date).getTime());
      
      setLines(enriched);
    };

    fetchLines();
  }, [selectedAccountId, journals]);

  const acc = accounts.find(a => a.id === selectedAccountId);

  // Calculate opening balance
  let openingBalance = 0;
  let periodDebit = 0;
  let periodCredit = 0;

  const filteredLines = lines.filter(l => {
    const d = l.journal.journal_date;
    if (dateFrom && d < dateFrom) {
      // It contributes to opening balance
      if (acc) {
        const isDebitNormal = ['Asset', 'Expense', 'Cost of Goods Sold'].includes(acc.account_type);
        if (isDebitNormal) {
          openingBalance += l.debit - l.credit;
        } else {
          openingBalance += l.credit - l.debit;
        }
      }
      return false;
    }
    if (dateTo && d > dateTo) return false;
    
    periodDebit += l.debit;
    periodCredit += l.credit;
    return true;
  });

  const isDebitNormal = acc ? ['Asset', 'Expense', 'Cost of Goods Sold'].includes(acc.account_type) : true;
  const endingBalance = isDebitNormal ? (openingBalance + periodDebit - periodCredit) : (openingBalance + periodCredit - periodDebit);

  let runningBalance = openingBalance;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">General Ledger</h1>

      <div className="flex gap-4">
        <select className="border p-2 rounded flex-1" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
          <option value="">-- Select Account --</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
        </select>
        <input type="date" className="border p-2 rounded" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="border p-2 rounded" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {selectedAccountId ? (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Opening Balance</p>
                <p className="text-xl font-bold">Rp{openingBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Debit (Period)</p>
                <p className="text-xl font-bold text-green-600">Rp{periodDebit.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Credit (Period)</p>
                <p className="text-xl font-bold text-red-600">Rp{periodCredit.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Ending Balance</p>
                <p className="text-xl font-bold text-blue-600">Rp{endingBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-medium text-gray-600">Date</th>
                  <th className="p-4 font-medium text-gray-600">Journal #</th>
                  <th className="p-4 font-medium text-gray-600">Source</th>
                  <th className="p-4 font-medium text-gray-600">Description</th>
                  <th className="p-4 font-medium text-gray-600 text-right">Debit</th>
                  <th className="p-4 font-medium text-gray-600 text-right">Credit</th>
                  <th className="p-4 font-medium text-gray-600 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-gray-50 italic">
                  <td colSpan={4} className="p-4 text-right">Opening Balance</td>
                  <td colSpan={2}></td>
                  <td className="p-4 text-right font-bold">Rp{openingBalance.toLocaleString()}</td>
                </tr>
                {filteredLines.map((l, i) => {
                  if (isDebitNormal) {
                    runningBalance += l.debit - l.credit;
                  } else {
                    runningBalance += l.credit - l.debit;
                  }
                  
                  return (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-4">{l.journal.journal_date}</td>
                      <td className="p-4 font-mono text-blue-600"><a href={`/finance/journals?search=${l.journal.journal_number}`}>{l.journal.journal_number}</a></td>
                      <td className="p-4 text-xs"><span className="bg-gray-100 px-2 py-1 rounded">{l.journal.source_type}</span></td>
                      <td className="p-4">{l.description || l.journal.description}</td>
                      <td className="p-4 text-right text-green-700">{l.debit > 0 ? `Rp${l.debit.toLocaleString()}` : '-'}</td>
                      <td className="p-4 text-right text-red-700">{l.credit > 0 ? `Rp${l.credit.toLocaleString()}` : '-'}</td>
                      <td className="p-4 text-right font-medium">Rp{runningBalance.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center border border-dashed">
          <p className="text-gray-500">Select an account to view General Ledger</p>
        </div>
      )}
    </div>
  );
}
