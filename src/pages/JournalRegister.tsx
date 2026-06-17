 import { useState, useEffect } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { db } from '../services/db';
import type { JournalEntry, JournalEntryLine, Account } from '../types';
import { Search } from 'lucide-react';

export default function JournalRegister() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [lines, setLines] = useState<JournalEntryLine[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const isSupabase = localStorage.getItem('VITE_DATA_PROVIDER') === 'supabase' || import.meta.env.VITE_DATA_PROVIDER === 'supabase';
    
    let js: JournalEntry[] = [];
    let ls: JournalEntryLine[] = [];
    let accs: Account[] = [];

    if (isSupabase) {
      const { supabase } = await import('../lib/supabase');
      const [resJ, resL, resA] = await Promise.all([
        supabase.from('journal_entries').select('*').order('journal_date', { ascending: false }),
        supabase.from('journal_entry_lines').select('*'),
        supabase.from('chart_of_accounts').select('*')
      ]);
      if (resJ.data) js = resJ.data;
      if (resL.data) ls = resL.data;
      if (resA.data) accs = resA.data as any;
    } else {
      js = (db as any).getAll('journal_entries').sort((a: any, b: any) => new Date(b.journal_date).getTime() - new Date(a.journal_date).getTime());
      ls = (db as any).getAll('journal_entry_lines');
      accs = (db as any).getAll('accounts');
    }
    
    const accMap: Record<string, Account> = {};
    accs.forEach((a: any) => accMap[a.id] = a);

    setJournals(js);
    setLines(ls);
    setAccounts(accMap);
  };

  const filtered = journals.filter(j => {
    if (dateFrom && j.journal_date < dateFrom) return false;
    if (dateTo && j.journal_date > dateTo) return false;
    if (sourceType !== 'All' && j.source_type !== sourceType) return false;
    if (search && !(j.journal_number.toLowerCase().includes(search.toLowerCase()) || j.description?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const uniqueSources = Array.from(new Set(journals.map(j => j.source_type)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Journal Register</h1>

      <div className="flex gap-4">
        <input type="date" className="border p-2 rounded" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="border p-2 rounded" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <select className="border p-2 rounded" value={sourceType} onChange={e => setSourceType(e.target.value)}>
          <option value="All">All Sources</option>
          {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search journal number or description..." className="pl-10 pr-4 py-2 w-full border rounded" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-600">Date</th>
                <th className="p-4 font-medium text-gray-600">Journal #</th>
                <th className="p-4 font-medium text-gray-600">Source</th>
                <th className="p-4 font-medium text-gray-600">Description</th>
                <th className="p-4 font-medium text-gray-600 text-right">Debit</th>
                <th className="p-4 font-medium text-gray-600 text-right">Credit</th>
                <th className="p-4 font-medium text-gray-600 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.id} className={`border-b hover:bg-blue-50 cursor-pointer ${selectedJournal === j.id ? 'bg-blue-50' : ''} ${j.status === 'Reversed' ? 'opacity-50 line-through' : ''}`} onClick={() => setSelectedJournal(j.id)}>
                  <td className="p-4">{j.journal_date}</td>
                  <td className="p-4 font-mono font-medium text-blue-600">{j.journal_number}</td>
                  <td className="p-4 text-xs">
                    <span className="bg-gray-100 px-2 py-1 rounded">{j.source_type}</span>
                  </td>
                  <td className="p-4 truncate max-w-xs">{j.description}</td>
                  <td className="p-4 text-right">Rp{j.total_debit.toLocaleString()}</td>
                  <td className="p-4 text-right">Rp{j.total_credit.toLocaleString()}</td>
                  <td className="p-4 text-center text-xs font-bold">{j.status}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No journals found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          {selectedJournal ? (() => {
            const j = journals.find(x => x.id === selectedJournal)!;
            const jLines = lines.filter(l => l.journal_entry_id === selectedJournal);
            return (
              <Card className="sticky top-6">
                <CardHeader className="bg-gray-50 border-b pb-4">
                  <CardTitle className="text-lg">Journal Details</CardTitle>
                  <p className="text-sm font-mono text-gray-500">{j.journal_number}</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 text-sm space-y-2 border-b">
                    <p><strong>Date:</strong> {j.journal_date}</p>
                    <p><strong>Source:</strong> {j.source_type} {j.source_id && `(${j.source_id})`}</p>
                    <p><strong>Desc:</strong> {j.description}</p>
                    <p><strong>Posted By:</strong> {j.posted_by}</p>
                    <p><strong>Posted At:</strong> {new Date(j.posted_at!).toLocaleString()}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3">Account</th>
                          <th className="p-3 text-right">Debit</th>
                          <th className="p-3 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jLines.map((l, i) => {
                          const acc = accounts[l.account_id!];
                          return (
                            <tr key={i} className="border-t">
                              <td className="p-3">
                                <div className="font-mono">{acc?.account_code}</div>
                                <div className="font-medium">{acc?.account_name}</div>
                                {l.description && <div className="text-gray-500 mt-1 italic">{l.description}</div>}
                              </td>
                              <td className="p-3 text-right text-green-700">{l.debit > 0 ? `Rp${l.debit.toLocaleString()}` : '-'}</td>
                              <td className="p-3 text-right text-red-700">{l.credit > 0 ? `Rp${l.credit.toLocaleString()}` : '-'}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t bg-gray-50 font-bold">
                          <td className="p-3 text-right">Total</td>
                          <td className="p-3 text-right">Rp{j.total_debit.toLocaleString()}</td>
                          <td className="p-3 text-right">Rp{j.total_credit.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })() : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-400 border border-dashed">
              Select a journal to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
