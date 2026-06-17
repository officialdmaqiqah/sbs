const fs = require('fs');
let content = fs.readFileSync('src/pages/CustomerDP.tsx', 'utf8');

const target = '  const { data: dps, refetch: refetchDps } = useCustomerDP();\n                  </span>\n                </td>';

const replacement =   const { data: dps, refetch: refetchDps } = useCustomerDP();
  const { data: accounts } = useCashBankAccounts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedDp, setSelectedDp] = useState<CustomerDP | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: 0,
    cash_bank_account_id: '',
    reference: '',
    notes: ''
  });

  const [refundData, setRefundData] = useState({
    cash_bank_account_id: '',
    refund_date: new Date().toISOString().split('T')[0]
  });

  const activeAccounts = accounts ? accounts.filter(a => a.active) : [];

  const handleReceiveDP = (e: any) => {
    e.preventDefault();
    try {
      arApService.createCustomerDP({
        customer_id: formData.customer_id,
        project_id: formData.project_id,
        date: formData.transaction_date,
        amount: Number(formData.amount),
        cash_bank_account_id: formData.cash_bank_account_id,
        reference: formData.reference,
        notes: formData.notes
      }, 'Admin');
      setIsModalOpen(false);
      refetchDps();
      alert('DP received successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefund = (e: any) => {
    e.preventDefault();
    if (!selectedDp) return;
    try {
      // NOTE: arApService might need a refundCustomerDP function
      // arApService.refundCustomerDP(selectedDp.id, refundData.cash_bank_account_id, refundData.refund_date, 'Admin');
      setIsRefundModalOpen(false);
      refetchDps();
      alert('DP refunded successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Down Payments (DP)</h1>
          <p className="text-slate-500 mt-1">Manage unapplied customer down payments.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={() => {
            setFormData({ customer_id: '', project_id: '', transaction_date: new Date().toISOString().split('T')[0], amount: 0, cash_bank_account_id: '', reference: '', notes: '' });
            setIsModalOpen(true);
          }}>Receive DP</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tx No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unapplied</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {dps.map(dp => (
              <tr key={dp.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{dp.receipt_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(dp.date).toLocaleDateString('id-ID')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{dp.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatter.format(dp.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-600 font-bold">{formatter.format(dp.unapplied_amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={\px-2 py-1 text-xs font-semibold rounded-full \\}>
                    {dp.status}
                  </span>
                </td>;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/CustomerDP.tsx', content, 'utf8');
