import { db } from './db';
import type { AccountingMapping, Account } from '../types';

export const accountingMappingService = {
  getAllMappings(): AccountingMapping[] {
    return db.getAll<AccountingMapping>('accounting_mappings');
  },

  getMapping(mappingType: string, sourceId?: string): string | null {
    const mappings = this.getAllMappings();
    const mapping = mappings.find(m => m.mapping_type === mappingType && m.source_id === sourceId);
    if (mapping) return mapping.account_id;
    
    // Fallback: Check if there's a default mapping for this type (where sourceId is undefined or empty)
    const defaultMapping = mappings.find(m => m.mapping_type === mappingType && !m.source_id);
    return defaultMapping ? defaultMapping.account_id : null;
  },

  setMapping(mapping: Omit<AccountingMapping, 'id'>) {
    const existing = db.getAll<AccountingMapping>('accounting_mappings')
      .find(m => m.mapping_type === mapping.mapping_type && m.source_id === mapping.source_id);
      
    if (existing) {
      db.update('accounting_mappings', existing.id, mapping);
    } else {
      db.insert('accounting_mappings', mapping as any);
    }
  },

  resetDefaultMappings() {
    localStorage.removeItem('accounting_mappings');
    this.seedDefaultMappings();
  },

  seedDefaultMappings() {
    const mappings = db.getAll<AccountingMapping>('accounting_mappings');
    if (mappings.length > 0) return; // already seeded

    const accounts = db.getAll<Account>('accounts');
    const getAcc = (code: string) => accounts.find(a => a.account_code === code)?.id || '';

    const defaultMappings: Omit<AccountingMapping, 'id'>[] = [
      // Inventory Categories
      { mapping_type: 'Inventory Category', source_id: 'Ayam', account_id: getAcc('1301') },
      { mapping_type: 'Inventory Category', source_id: 'Bahan Kandang', account_id: getAcc('1302') },
      { mapping_type: 'Inventory Category', source_id: 'Kandang Jadi', account_id: getAcc('1303') },
      { mapping_type: 'Inventory Category', source_id: 'Bahan Pakan', account_id: getAcc('1304') },
      { mapping_type: 'Inventory Category', source_id: 'Pakan Jadi', account_id: getAcc('1305') },
      { mapping_type: 'Inventory Category', source_id: 'Telur', account_id: getAcc('1306') },
      { mapping_type: 'Inventory Category', source_id: 'Vitamin/Obat', account_id: getAcc('1307') },
      { mapping_type: 'Inventory Category', source_id: 'Peralatan', account_id: getAcc('1401') },

      // Product Category Revenue
      { mapping_type: 'Product Category', source_id: 'Paket', account_id: getAcc('4101') },
      { mapping_type: 'Product Category', source_id: 'Ayam', account_id: getAcc('4102') },
      { mapping_type: 'Product Category', source_id: 'Kandang', account_id: getAcc('4103') },
      { mapping_type: 'Product Category', source_id: 'Pakan', account_id: getAcc('4104') },
      { mapping_type: 'Product Category', source_id: 'Telur', account_id: getAcc('4105') },

      // Events
      { mapping_type: 'Event', source_id: 'Investor Capital', account_id: getAcc('3101') },
      { mapping_type: 'Event', source_id: 'Stock Opname Shortage', account_id: getAcc('6504') },
      { mapping_type: 'Event', source_id: 'Stock Opname Surplus', account_id: getAcc('4901') },
      { mapping_type: 'Event', source_id: 'Ayam Mati', account_id: getAcc('6501') },
      { mapping_type: 'Event', source_id: 'Ayam Hilang', account_id: getAcc('6502') },
      { mapping_type: 'Event', source_id: 'Telur Rusak', account_id: getAcc('6503') },
      { mapping_type: 'Event', source_id: 'Biaya Produksi Telur', account_id: getAcc('5107') },
      { mapping_type: 'Event', source_id: 'Retur Kelayakan Penjualan', account_id: getAcc('4190') },
      { mapping_type: 'Event', source_id: 'Kerugian Retur Rusak', account_id: getAcc('6505') },
      { mapping_type: 'Event', source_id: 'Hutang Supplier', account_id: getAcc('2101') },
      { mapping_type: 'Event', source_id: 'DP Customer', account_id: getAcc('2201') },
      { mapping_type: 'Event', source_id: 'Piutang Usaha', account_id: getAcc('1201') }
    ];

    defaultMappings.forEach(m => {
      if (m.account_id) this.setMapping(m);
    });
  }
};
