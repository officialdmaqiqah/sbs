import type { TableName } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const DB_VERSION = 2;

const migrateDB = () => {
  const currentVersion = parseInt(localStorage.getItem('sbs_db_version') || '1', 10);
  if (currentVersion < DB_VERSION) {
    console.log(`Migrating DB from version ${currentVersion} to ${DB_VERSION}...`);
    
    const backupObj: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sbs_backup')) {
        backupObj[key] = localStorage.getItem(key);
      }
    }
    localStorage.setItem(`sbs_backup_v${currentVersion}_${Date.now()}`, JSON.stringify(backupObj));

    const itemsRaw = localStorage.getItem('items');
    if (itemsRaw) {
      const items = JSON.parse(itemsRaw);
      const migratedItems = items.map((i: any) => ({ ...i, avg_cost: i.avg_cost || 0 }));
      localStorage.setItem('items', JSON.stringify(migratedItems));
    }

    const movesRaw = localStorage.getItem('inventory_movements');
    if (movesRaw) {
      const moves = JSON.parse(movesRaw);
      const itemStocks: Record<string, number> = {};

      const migratedMoves = moves.sort((a: any, b: any) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()).map((m: any) => {
        const isOut = ['keluar', 'penjualan', 'mati', 'hilang', 'rusak', 'Keluar untuk Produksi'].includes(m.type);
        // // const isIn = ['masuk', 'produksi', 'koreksi', 'Masuk dari Produksi'].includes(m.type);
        
        const direction = isOut ? 'OUT' : 'IN';
        const absQty = Math.abs(m.quantity || 0);
        
        const currentStock = itemStocks[m.item_id] || 0;
        const newStock = direction === 'IN' ? currentStock + absQty : currentStock - absQty;
        itemStocks[m.item_id] = newStock;

        return {
          id: m.id,
          transaction_id: generateId(),
          project_id: m.project_id,
          item_id: m.item_id,
          movement_type: m.type || 'koreksi',
          direction: direction,
          quantity: absQty,
          unit_cost: 0,
          total_cost: 0,
          stock_before: currentStock,
          stock_after: newStock,
          notes: m.notes,
          created_at: m.created_at || m.date || new Date().toISOString()
        };
      });
      localStorage.setItem('inventory_movements', JSON.stringify(migratedMoves));
    }

    localStorage.setItem('sbs_db_version', DB_VERSION.toString());
    console.log('Migration completed.');
  }
};

try { migrateDB(); } catch(e) { console.error("Migration failed", e); }

export class MockDB {
  _initTable(table: TableName) {
    if (!localStorage.getItem(table)) {
      let initialData: any[] = [];
      
      if (table === 'products') {
        const t = new Date().toISOString();
        initialData = [
          { id: 'p1', code: 'PRD-001', name: 'Ayam Petelur', category: 'Ayam', price: 65000, unit: 'Ekor', is_active: true, created_at: t },
          { id: 'p2', code: 'PRD-002', name: 'Kandang', category: 'Kandang', price: 150000, unit: 'Set', is_active: true, created_at: t },
          { id: 'p3', code: 'PRD-003', name: 'Pakan', category: 'Pakan', price: 7000, unit: 'Kg', is_active: true, created_at: t },
          { id: 'p4', code: 'PRD-004', name: 'Telur Biasa', category: 'Telur', price: 28000, unit: 'Kg', is_active: true, created_at: t },
          { id: 'p5', code: 'PRD-005', name: 'Telur Omega', category: 'Telur', price: 32000, unit: 'Kg', is_active: true, created_at: t },
          { id: 'p6', code: 'PRD-006', name: 'Telur Ayam Kampung', category: 'Telur', price: 35000, unit: 'Kg', is_active: true, created_at: t },
          { id: 'p7', code: 'PRD-007', name: 'Telur Asin Ayam', category: 'Telur', price: 40000, unit: 'Kg', is_active: true, created_at: t },
        ];
      }
      
      if (table === 'packages') {
        const t = new Date().toISOString();
        initialData = [
          { id: 'pkg1', code: 'PKG-001', name: 'Sultan Platinum', price: 28000000, chicken_capacity: 96, cage_type: 'Kandang L isi 96', cage_size: 'Lebar 1,3 m, Tinggi 2 m, Panjang 5,2 m', chicken_qty: 96, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg2', code: 'PKG-002', name: 'Sultan Gold', price: 28000000, chicken_capacity: 96, cage_type: 'Kandang A isi 96', cage_size: 'Lebar 2,6 m, Tinggi 2 m, Panjang 2,6 m', chicken_qty: 96, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg3', code: 'PKG-003', name: 'Sultan Prime', price: 15000000, chicken_capacity: 48, cage_type: 'Kandang L isi 48', cage_size: 'Lebar 1,3 m, Tinggi 2 m, Panjang 2,6 m', chicken_qty: 48, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg4', code: 'PKG-004', name: 'Sultan Grow', price: 15000000, chicken_capacity: 48, cage_type: 'Kandang A isi 48', cage_size: 'Lebar 2,6 m, Tinggi 2 m, Panjang 1,3 m', chicken_qty: 48, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg5', code: 'PKG-005', name: 'Sultan Starter', price: 7750000, chicken_capacity: 24, cage_type: 'Kandang L isi 24', cage_size: 'Lebar 1,3 m, Tinggi 2 m, Panjang 1,3 m', chicken_qty: 24, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg6', code: 'PKG-006', name: 'Sultan Favorit', price: 6000000, chicken_capacity: 16, cage_type: 'Kandang isi 16', cage_size: 'Lebar 70 cm, Panjang 130 cm, Tinggi 2 m', chicken_qty: 16, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: true, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
          { id: 'pkg7', code: 'PKG-007', name: 'Ekonomis Berkah', price: 3000000, chicken_capacity: 8, cage_type: 'Kandang isi 8', cage_size: 'Lebar 35 cm, Panjang 130 cm, Tinggi 1 m', chicken_qty: 8, feed_qty: 'pakan 1 bulan', includes_vitamin: true, includes_roof: false, includes_feeder: true, includes_drinker_nipple: true, includes_water_container: true, includes_consultation: true, can_request: true, is_active: true, created_at: t },
        ];
      }

      if (table === 'cage_types') {
        const t = new Date().toISOString();
        initialData = [
          { id: 'ct1', code: 'CT-001', name: 'Kandang L 96', capacity: 96, width: 1.3, length: 5.2, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct2', code: 'CT-002', name: 'Kandang A 96', capacity: 96, width: 2.6, length: 2.6, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct3', code: 'CT-003', name: 'Kandang L 48', capacity: 48, width: 1.3, length: 2.6, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct4', code: 'CT-004', name: 'Kandang A 48', capacity: 48, width: 2.6, length: 1.3, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct5', code: 'CT-005', name: 'Kandang L 24', capacity: 24, width: 1.3, length: 1.3, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct6', code: 'CT-006', name: 'Kandang 16', capacity: 16, width: 0.7, length: 1.3, height: 2, unit: 'm', is_active: true, created_at: t },
          { id: 'ct7', code: 'CT-007', name: 'Kandang 8', capacity: 8, width: 0.35, length: 1.3, height: 1, unit: 'm', is_active: true, created_at: t },
        ];
      }

      // Allow empty default init for feed_recipes, feed_recipe_items, feed_production_orders, feed_production_order_items
      // Allow empty default init for stock_opnames, stock_opname_items, audit_logs
      // Allow empty default init for inventory_reservations, sales_deliveries, sales_delivery_items, return_deliveries, package_components

      localStorage.setItem(table, JSON.stringify(initialData));
    }
  }

  getAll<T>(table: TableName): T[] {
    this._initTable(table);
    const data = localStorage.getItem(table);
    return data ? JSON.parse(data) : [];
  }

  getById<T>(table: TableName, id: string): T | undefined {
    const records = this.getAll<T & { id: string }>(table);
    return records.find((r) => r.id === id);
  }

  query<T>(table: TableName, filterFn: (item: T) => boolean): T[] {
    const records = this.getAll<T>(table);
    return records.filter(filterFn);
  }

  insert<T>(table: TableName, data: Omit<T, 'id' | 'created_at'>): T {
    const records = this.getAll<T & { id: string, created_at: string }>(table);
    const newRecord = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    } as unknown as T & { id: string, created_at: string };
    
    records.push(newRecord);
    localStorage.setItem(table, JSON.stringify(records));
    return newRecord as unknown as T;
  }

  update<T>(table: TableName, id: string, data: Partial<T>): T | null {
    const records = this.getAll<T & { id: string }>(table);
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updatedRecord = { ...records[index], ...data };
    records[index] = updatedRecord;
    localStorage.setItem(table, JSON.stringify(records));
    return updatedRecord;
  }

  delete(table: TableName, id: string): boolean {
    const records = this.getAll<{ id: string }>(table);
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) return false;
    
    localStorage.setItem(table, JSON.stringify(filtered));
    return true;
  }
}

export const db = new MockDB();

// Atomic Transaction Helper
export const runMockTransaction = <R>(callback: (txDb: MockDB) => R): R => {
  // 1. Snapshot all current storage
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.startsWith('sbs_backup')) {
      snapshot[key] = localStorage.getItem(key) || '';
    }
  }

  // 2. Create an isolated TX DB instance that writes to a temporary in-memory map
  const inMemoryStorage = new Map<string, string>();
  
  // Clone current snapshot to in-memory
  Object.keys(snapshot).forEach(key => {
    inMemoryStorage.set(key, snapshot[key]);
  });

  const txDb = new MockDB();
  
  // Override getAll to read from inMemory
  txDb.getAll = function<T>(table: TableName): T[] {
    this._initTable(table);
    const data = inMemoryStorage.get(table) || localStorage.getItem(table);
    return data ? JSON.parse(data) : [];
  };

  // Override insert
  txDb.insert = function<T>(table: TableName, data: Omit<T, 'id' | 'created_at'>): T {
    const records = this.getAll<T & { id: string, created_at: string }>(table);
    const newRecord = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    } as unknown as T & { id: string, created_at: string };
    
    records.push(newRecord);
    inMemoryStorage.set(table, JSON.stringify(records));
    return newRecord as unknown as T;
  };

  // Override update
  txDb.update = function<T>(table: TableName, id: string, data: Partial<T>): T | null {
    const records = this.getAll<T & { id: string }>(table);
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updatedRecord = { ...records[index], ...data };
    records[index] = updatedRecord;
    inMemoryStorage.set(table, JSON.stringify(records));
    return updatedRecord;
  };

  // Override delete
  txDb.delete = function(table: TableName, id: string): boolean {
    const records = this.getAll<{ id: string }>(table);
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) return false;
    
    inMemoryStorage.set(table, JSON.stringify(filtered));
    return true;
  };

  // 3. Execute callback
  try {
    const result = callback(txDb);
    
    // 4. Commit all changes if no error
    inMemoryStorage.forEach((value, key) => {
      localStorage.setItem(key, value);
    });
    
    return result;
  } catch (error: any) {
    console.error("Transaction failed, rolling back.", error.message);
    throw error;
  }
};
