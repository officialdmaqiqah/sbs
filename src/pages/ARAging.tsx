 import {  useState  } from 'react';
import { useARAging } from '../hooks/useFinance';

export default function ARAging() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const { data: agingData, loading } = useARAging(reportDate);

  const getBucketTotal = (bucket: string) => {
    return agingData.filter((a: any) => a.bucket === bucket).reduce((s: number, a: any) => s + a.outstanding_amount, 0);
  };

  const totalOutstanding = agingData.reduce((s: number, a: any) => s + a.outstanding_amount, 0);

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  const exportCsv = () => {
    const csv = ['Invoice No,Customer,Due Date,Outstanding,Days Overdue,Bucket\n'];
    agingData.forEach((a: any) => {
      csv.push(`${a.invoice_number},${a.customer_name || a.customer_id},${a.due_date},${a.outstanding_amount},${a.days_overdue},${a.bucket}\n`);
    });
    const blob = new Blob([csv.join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar_aging_${reportDate}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Receivable Aging</h1>
          <p className="text-slate-500 mt-1">Track overdue customer invoices by age bucket.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <label className="text-sm font-medium text-slate-700 ml-2">As Of Date:</label>
          <input className="w-auto h-9 rounded border px-3 py-2" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
          <button className="px-4 py-2 border rounded" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col justify-center">
          <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total Outstanding</div>
          <div className="text-lg font-bold text-slate-900">{formatter.format(totalOutstanding)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center border-b-4 border-b-blue-500 flex flex-col justify-center">
          <div className="text-xs text-slate-500 font-bold uppercase mb-1">Current</div>
          <div className="text-lg font-bold text-blue-600">{formatter.format(getBucketTotal('Current'))}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center border-b-4 border-b-yellow-400 flex flex-col justify-center">
          <div className="text-xs text-slate-500 font-bold uppercase mb-1">1-30 Days</div>
          <div className="text-lg font-bold text-yellow-600">{formatter.format(getBucketTotal('1-30 Days'))}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center border-b-4 border-b-orange-400 flex flex-col justify-center">
          <div className="text-xs text-slate-500 font-bold uppercase mb-1">31-60 Days</div>
          <div className="text-lg font-bold text-orange-600">{formatter.format(getBucketTotal('31-60 Days'))}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center border-b-4 border-b-red-400 flex flex-col justify-center">
          <div className="text-xs text-slate-500 font-bold uppercase mb-1">61-90 Days</div>
          <div className="text-lg font-bold text-red-600">{formatter.format(getBucketTotal('61-90 Days'))}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 text-center border-b-4 border-b-red-600 flex flex-col justify-center">
          <div className="text-xs text-red-800 font-bold uppercase mb-1">&gt;90 Days</div>
          <div className="text-lg font-bold text-red-800">{formatter.format(getBucketTotal('>90 Days'))}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Outstanding</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Days Overdue</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Bucket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading aging data...</td></tr>
            ) : agingData.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No outstanding invoices.</td></tr>
            ) : (
              agingData.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{a.customer_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.invoice_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.due_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(a.outstanding_amount)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${a.days_overdue > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {a.days_overdue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      a.bucket === 'Current' ? 'bg-blue-100 text-blue-800' :
                      a.bucket === '>90 Days' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.bucket}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
