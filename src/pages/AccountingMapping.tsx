 import {  useState, useEffect  } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { accountingService } from '../services/accountingService';
import { accountingMappingService } from '../services/accountingMappingService';
import type { Account } from '../types';
import { Save, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function AccountingMappingUI() {
  const [activeTab, setActiveTab] = useState(1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // compositeKey -> accountId
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    accountingMappingService.seedDefaultMappings();
    const accs = accountingService.getAccounts().filter(a => a.is_active && a.allow_posting);
    setAccounts(accs);
    
    const allMappings = accountingMappingService.getAllMappings();
    const mapDict: Record<string, string> = {};
    allMappings.forEach(m => {
      mapDict[`${m.mapping_type}::${m.source_id || ''}`] = m.account_id;
    });
    setMappings(mapDict);
    setUnsavedChanges(false);
  };

  const handleMapChange = (mappingType: string, sourceId: string, accountId: string) => {
    setMappings(prev => ({ ...prev, [`${mappingType}::${sourceId}`]: accountId }));
    setUnsavedChanges(true);
  };

  const handleSaveAll = () => {
    try {
      Object.entries(mappings).forEach(([key, accId]) => {
        if (!accId) return;
        const [mappingType, sourceId] = key.split('::');
        accountingMappingService.setMapping({ mapping_type: mappingType as any, source_id: sourceId, account_id: accId });
      });
      setUnsavedChanges(false);
      alert('All mappings saved successfully!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default seed? This will overwrite your custom mappings.')) {
      accountingMappingService.resetDefaultMappings();
      loadData();
    }
  };

  // Predefined required mapping sources
  const inventoryCats = ['Ayam', 'Bahan Kandang', 'Kandang Jadi', 'Bahan Pakan', 'Pakan Jadi', 'Telur', 'Vitamin/Obat', 'Peralatan'];
  const productCats = ['Paket', 'Ayam', 'Kandang', 'Pakan', 'Telur', 'Lainnya'];
  const expenseCats = ['Produksi', 'Pengiriman', 'Promosi', 'Operasional', 'Gaji'];
  const eventCats = ['Ayam Mati', 'Ayam Hilang', 'Ayam Afkir', 'Telur Rusak', 'Konsumsi Pakan', 'Stock Opname Shortage', 'Stock Opname Surplus', 'Retur Rusak', 'Distribusi Write-off'];
  const profitCats = ['Company Reserve Payable', 'Worker Profit Payable', 'Investor Profit Payable', 'CSR Payable', 'Retained Earnings', 'Rounding'];

  const renderSelect = (type: string, source: string, validTypes: string[]) => {
    const key = `${type}::${source}`;
    const currentAccId = mappings[key] || '';
    const validAccounts = accounts.filter(a => validTypes.includes(a.account_type));
    
    // Check validation status
    let status = 'Incomplete';
    let statusColor = 'text-red-500';
    let Icon = AlertCircle;
    
    if (currentAccId) {
      const acc = validAccounts.find(a => a.id === currentAccId);
      if (acc) {
        status = 'Complete';
        statusColor = 'text-green-500';
        Icon = CheckCircle2;
      } else {
        status = 'Invalid Account';
        statusColor = 'text-orange-500';
        Icon = AlertCircle;
      }
    }

    return (
      <div className="flex items-center gap-4 py-2 border-b last:border-0" key={key}>
        <div className="w-1/3 font-medium text-sm text-gray-700">{source}</div>
        <select 
          className="flex-1 border p-2 rounded text-sm"
          value={currentAccId}
          onChange={e => handleMapChange(type, source, e.target.value)}
        >
          <option value="">-- Select {validTypes.join('/')} Account --</option>
          {validAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>
          ))}
        </select>
        <div className={`flex items-center gap-1 text-sm w-32 ${statusColor}`}>
          <Icon className="w-4 h-4" /> {status}
        </div>
      </div>
    );
  };

  const getMissingMappings = () => {
    const missing: string[] = [];
    inventoryCats.forEach(c => {
      if (!mappings[`Inventory Category::${c}`]) missing.push(`Inventory: ${c}`);
      if (!mappings[`Inventory Gain::${c}`]) missing.push(`Inv Gain: ${c}`);
      if (!mappings[`Inventory Loss::${c}`]) missing.push(`Inv Loss: ${c}`);
      if (!mappings[`Inventory Write-off::${c}`]) missing.push(`Inv Write-off: ${c}`);
    });
    productCats.forEach(c => {
      if (!mappings[`Product Revenue::${c}`]) missing.push(`Revenue: ${c}`);
      if (!mappings[`Product Return::${c}`]) missing.push(`Return: ${c}`);
      if (!mappings[`Product COGS::${c}`]) missing.push(`COGS: ${c}`);
      if (!mappings[`Product COGS Inventory::${c}`]) missing.push(`COGS Inv: ${c}`);
    });
    return missing;
  };

  const missing = getMissingMappings();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Accounting Mapping</h1>
        <div className="space-x-2">
          <button className="px-4 py-2 border rounded" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-2 inline-block"/> Reset Defaults</button>
          <button onClick={handleSaveAll} disabled={!unsavedChanges} className={`px-4 py-2 border rounded ${unsavedChanges ? 'bg-blue-600 text-white' : ''}`}>
            <Save className="w-4 h-4 mr-2 inline-block"/> Save All Changes
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-2">
          {['Inventory', 'Revenue', 'COGS', 'Expense', 'Cash & Bank', 'Operational Event', 'Profit Distribution'].map((tab, idx) => (
            <button
              key={idx}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === idx + 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-gray-50 text-gray-600 border border-transparent'}`}
              onClick={() => setActiveTab(idx + 1)}
            >
              {idx + 1}. {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {missing.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="py-3">
                <CardTitle className="text-orange-800 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2"/> Mapping yang Belum Lengkap ({missing.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-orange-700 flex flex-wrap gap-2">
                  {missing.slice(0, 10).map((m, i) => <span key={i} className="bg-orange-100 px-2 py-1 rounded border border-orange-200">{m}</span>)}
                  {missing.length > 10 && <span className="bg-orange-100 px-2 py-1 rounded border border-orange-200">+{missing.length - 10} lainnya</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 1 && 'Inventory Mapping'}
                {activeTab === 2 && 'Revenue Mapping'}
                {activeTab === 3 && 'COGS Mapping'}
                {activeTab === 4 && 'Expense Mapping'}
                {activeTab === 5 && 'Cash & Bank Mapping'}
                {activeTab === 6 && 'Operational Event Mapping'}
                {activeTab === 7 && 'Profit Distribution Mapping'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === 1 && (
                <div className="space-y-6">
                  {inventoryCats.map(cat => (
                    <div key={cat} className="p-4 bg-gray-50 rounded-lg space-y-2 border">
                      <h3 className="font-bold text-gray-800 mb-2">{cat}</h3>
                      {renderSelect('Inventory Category', cat, ['Asset'])}
                      {renderSelect('Inventory Gain', cat, ['Revenue', 'Equity'])}
                      {renderSelect('Inventory Loss', cat, ['Expense'])}
                      {renderSelect('Inventory Write-off', cat, ['Expense'])}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 2 && (
                <div className="space-y-6">
                  {productCats.map(cat => (
                    <div key={cat} className="p-4 bg-gray-50 rounded-lg space-y-2 border">
                      <h3 className="font-bold text-gray-800 mb-2">{cat}</h3>
                      {renderSelect('Product Revenue', cat, ['Revenue'])}
                      {renderSelect('Product Return', cat, ['Revenue', 'Expense'])}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 3 && (
                <div className="space-y-6">
                  {productCats.map(cat => (
                    <div key={cat} className="p-4 bg-gray-50 rounded-lg space-y-2 border">
                      <h3 className="font-bold text-gray-800 mb-2">{cat}</h3>
                      {renderSelect('Product COGS', cat, ['Cost of Goods Sold'])}
                      {renderSelect('Product COGS Inventory', cat, ['Asset'])}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 4 && (
                <div className="space-y-2">
                  {expenseCats.map(cat => renderSelect('Expense Category', cat, ['Expense']))}
                </div>
              )}
              {activeTab === 5 && (
                <div className="space-y-2">
                  {renderSelect('Cash Bank', 'Kas Kecil', ['Asset'])}
                  {renderSelect('Cash Bank', 'Bank Operasional', ['Asset'])}
                </div>
              )}
              {activeTab === 6 && (
                <div className="space-y-2">
                  {eventCats.map(cat => renderSelect('Event', cat, ['Expense', 'Asset', 'Liability']))}
                </div>
              )}
              {activeTab === 7 && (
                <div className="space-y-2">
                  {profitCats.map(cat => renderSelect('Profit Distribution', cat, ['Liability', 'Equity']))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
