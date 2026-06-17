// @ts-nocheck
import type { 
  DataProvider, Repository, CommandService, TransactionService, CreateInput, UpdateInput,
  ProjectRepository, ItemRepository, InventoryLocationRepository, 
  InventoryMovementRepository, InventoryBalanceRepository, InventoryCommandService 
} from '../repositories/interfaces';
import { db } from '../services/db';

class LocalRepository<T> implements Repository<T> {
  private entityName: string;
  constructor(entityName: string) {
    this.entityName = entityName;
  }

  private getItems(): T[] {
    const data = localStorage.getItem(this.entityName);
    return data ? JSON.parse(data) : [];
  }

  private saveItems(items: T[]) {
    localStorage.setItem(this.entityName, JSON.stringify(items));
  }

  async list(filters?: Record<string, any>): Promise<T[]> {
    let items = this.getItems();
    if (filters) {
      items = items.filter(item => {
        for (const key in filters) {
          if ((item as any)[key] !== filters[key]) {
            return false;
          }
        }
        return true;
      });
    }
    return items;
  }

  async getById(id: string): Promise<T | null> {
    const items = this.getItems();
    return items.find(item => (item as any).id === id) || null;
  }

  async create(data: CreateInput): Promise<T> {
    const items = this.getItems();
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as T;
    items.push(newItem);
    this.saveItems(items);
    return newItem;
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    const items = this.getItems();
    const index = items.findIndex(item => (item as any).id === id);
    if (index === -1) throw new Error(`Item with id ${id} not found in ${this.entityName}`);
    
    items[index] = {
      ...items[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.saveItems(items);
    return items[index];
  }

  async delete(id: string): Promise<boolean> {
    const items = this.getItems();
    const index = items.findIndex(item => (item as any).id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this.saveItems(items);
    return true;
  }
}

class LocalCommandService implements CommandService {
  async execute(commandName: string, _payload: any): Promise<any> {
    // In MVP, these are handled by individual feature services directly mutating localStorage.
    // We keep this as a stub for the abstraction layer.
    console.warn(`LocalCommandService: Command ${commandName} not explicitly mapped. Relying on legacy service.`);
    return null;
  }
}

class LocalTransactionService implements TransactionService {
  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    // LocalStorage operations in MVP are mostly synchronous, but true transactions aren't supported.
    // We just execute the operation. If it fails partway, state might be inconsistent (MVP limitation).
    return await operation();
  }
}

class LocalProjectRepository implements ProjectRepository {
  private repo = new LocalRepository<any>('projects');
  async listProjects() { return this.repo.list(); }
  async getProjectById(id: string) { return this.repo.getById(id); }
  async createProject(data: any) { return this.repo.create(data); }
  async updateProject(id: string, data: any) { return this.repo.update(id, data); }
}

class LocalItemRepository implements ItemRepository {
  private repoItems = new LocalRepository<any>('items');
  private repoProducts = new LocalRepository<any>('products');
  private repoPackages = new LocalRepository<any>('packages');

  async listItems() { 
    const items = await this.repoItems.list();
    const products = await this.repoProducts.list();
    const packages = await this.repoPackages.list();

    const mappedProducts = products.map(p => ({ ...p, itemType: 'PRODUCT', active: p.is_active, sellingPrice: p.price, standardCost: p.cost || 0 }));
    const mappedPackages = packages.map(p => ({ ...p, itemType: 'PACKAGE', active: p.is_active, packagePrice: p.price, chickenCapacity: p.chicken_capacity, cageSize: p.cage_size }));
    const mappedItems = items.map(i => ({ ...i, itemType: i.item_type || 'RAW_MATERIAL', active: i.is_active, standardCost: i.avg_cost || 0, sellingPrice: 0 }));

    return [...mappedItems, ...mappedProducts, ...mappedPackages];
  }

  async getItemById(id: string) { 
    const all = await this.listItems();
    return all.find(i => i.id === id) || null;
  }

  async createItem(data: any) { 
    if (data.itemType === 'PRODUCT') {
      const dbPayload = { ...data, is_active: data.active, price: data.sellingPrice, cost: data.standardCost };
      return this.repoProducts.create(dbPayload);
    } else if (data.itemType === 'PACKAGE') {
      const dbPayload = { ...data, is_active: data.active, price: data.packagePrice, chicken_capacity: data.chickenCapacity, cage_size: data.cageSize };
      return this.repoPackages.create(dbPayload);
    } else {
      const dbPayload = { ...data, is_active: data.active, avg_cost: data.standardCost };
      return this.repoItems.create(dbPayload);
    }
  }

  async updateItem(id: string, data: any) { 
    const existing = await this.getItemById(id);
    if (!existing) throw new Error('Item not found');

    const type = data.itemType || existing.itemType;
    if (type === 'PRODUCT') {
      const dbPayload = { ...data, is_active: data.active, price: data.sellingPrice, cost: data.standardCost };
      return this.repoProducts.update(id, dbPayload);
    } else if (type === 'PACKAGE') {
      const dbPayload = { ...data, is_active: data.active, price: data.packagePrice, chicken_capacity: data.chickenCapacity, cage_size: data.cageSize };
      return this.repoPackages.update(id, dbPayload);
    } else {
      const dbPayload = { ...data, is_active: data.active, avg_cost: data.standardCost };
      return this.repoItems.update(id, dbPayload);
    }
  }
}

class LocalInventoryLocationRepository implements InventoryLocationRepository {
  private repo = new LocalRepository<any>('inventory_locations');
  async listLocations() { return this.repo.list(); }
  async getLocationById(id: string) { return this.repo.getById(id); }
  async createLocation(data: any) { return this.repo.create(data); }
  async updateLocation(id: string, data: any) { return this.repo.update(id, data); }
}

class LocalInventoryMovementRepository implements InventoryMovementRepository {
  private repo = new LocalRepository<any>('inventory_movements');
  async listMovements(filters?: any) { return this.repo.list(filters); }
  async getMovementById(id: string) { return this.repo.getById(id); }
  async listKartuStok(itemId: string, projectId?: string, locationId?: string) {
    let items = await this.repo.list({ item_id: itemId });
    if (projectId) items = items.filter(i => i.project_id === projectId);
    if (locationId) items = items.filter(i => i.location_id === locationId);
    items.sort((a, b) => {
      const dA = new Date(a.movement_date).getTime();
      const dB = new Date(b.movement_date).getTime();
      if (dA !== dB) return dA - dB;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
    return items;
  }
}

class LocalInventoryBalanceRepository implements InventoryBalanceRepository {
  private repo = new LocalRepository<any>('inventory_balances');
  async listBalances(filters?: any) { return this.repo.list(filters); }
  async getBalance(projectId: string, locationId: string, itemId: string) {
    const list = await this.repo.list({ project_id: projectId, location_id: locationId, item_id: itemId });
    return list[0] || null;
  }
}

class LocalInventoryCommandService implements InventoryCommandService {
  async postInventoryTransaction(input: any) {
    // In local mode, we manually emulate what the Supabase RPC does.
    const projectId = input.projectId || input.project_id;
    const locationId = input.locationId || input.location_id;
    const itemId = input.itemId || input.item_id;
    const direction = input.direction;
    const quantity = input.quantity;
    const txId = input.transactionId || input.transaction_id || `txn-${Date.now()}`;

    const movements = (db as any).getAll('inventory_movements') || [];
    const itemMoves = movements.filter((m: any) => m.item_id === itemId && m.location_id === locationId);
    
    // Check duplicate
    if (movements.find((m: any) => m.transaction_id === txId && m.item_id === itemId && m.location_id === locationId && m.direction === direction)) {
      throw new Error(`Duplicate transaction ${txId}`);
    }

    const currentStock = itemMoves.reduce((sum: number, m: any) => m.direction === 'IN' ? sum + m.quantity : sum - m.quantity, 0);
    const newStock = direction === 'IN' ? currentStock + quantity : currentStock - quantity;
    
    if (direction === 'OUT' && newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${currentStock}, Required: ${quantity}`);
    }

    const newId = (db as any).insert('inventory_movements', {
      transaction_id: txId,
      project_id: projectId,
      location_id: locationId,
      item_id: itemId,
      movement_type: input.referenceType || 'Manual',
      direction: direction,
      quantity: quantity,
      stock_before: currentStock,
      stock_after: newStock,
      reference_number: input.referenceNumber,
      notes: input.notes,
      created_at: input.date || input.movementDate || new Date().toISOString()
    });

    // Emulate updating inventory_balances
    let balances = (db as any).getAll('inventory_balances') || [];
    let existingBalance = balances.find((b: any) => b.item_id === itemId && b.project_id === projectId && b.location_id === locationId);
    
    if (existingBalance) {
      (db as any).update('inventory_balances', existingBalance.id, { physical_quantity: newStock, updated_at: new Date().toISOString() });
    } else {
      (db as any).insert('inventory_balances', {
        project_id: projectId,
        location_id: locationId,
        item_id: itemId,
        physical_quantity: newStock,
        reserved_quantity: 0,
        organization_id: 'local-org-id',
        updated_at: new Date().toISOString()
      });
    }

    return { id: newId, transaction_id: txId, movement_id: newId, stock_before: currentStock, stock_after: newStock };
  }
}

export class LocalDataProvider implements DataProvider {
  private repoProjects = new LocalRepository('projects');
  private repoSalesOrders = new LocalRepository('sales_orders');
  private repoSalesDeliveries = new LocalRepository('sales_deliveries');
  private salesDeliveryReadSvc: LocalSalesDeliveryReadService;

  private customerInvoiceRepo: LocalCustomerInvoiceRepository;
  private customerPaymentRepo: LocalCustomerPaymentRepository;

  constructor() {
    this.salesDeliveryReadSvc = new LocalSalesDeliveryReadService(this.repoSalesOrders, this.repoSalesDeliveries, this.repoProjects);

    this.customerInvoiceRepo = new LocalCustomerInvoiceRepository(new LocalRepository('customer_invoices'));
    this.customerPaymentRepo = new LocalCustomerPaymentRepository(
      new LocalRepository('customer_payments'),
      new LocalRepository('customer_payment_allocations'),
      new LocalRepository('customer_invoices')
    );
  }

  getRepository<T>(entityName: string): Repository<T> {
    return new LocalRepository<T>(entityName);
  }

  getCommandService(): CommandService {
    return new LocalCommandService();
  }

  getTransactionService(): TransactionService {
    return new LocalTransactionService();
  }

  getProjectRepository(): ProjectRepository { return new LocalProjectRepository(); }
  getItemRepository(): ItemRepository { return new LocalItemRepository(); }
  getInventoryLocationRepository(): InventoryLocationRepository { return new LocalInventoryLocationRepository(); }
  getInventoryMovementRepository(): InventoryMovementRepository { return new LocalInventoryMovementRepository(); }
  getInventoryBalanceRepository(): InventoryBalanceRepository { return new LocalInventoryBalanceRepository(); }
  getInventoryCommandService(): InventoryCommandService { return new LocalInventoryCommandService(); }

  getPurchaseOrderRepository() { return new LocalPurchaseOrderRepository(); }
  getPurchaseReceiptRepository() { return new LocalPurchaseReceiptRepository(); }
  getPurchaseReadService() { return new LocalPurchaseReadService(); }

  getSupplierBillRepository() { return new LocalSupplierBillRepository(); }
  getSupplierBillReadService(): import("./interfaces/SupplierBillReadService").SupplierBillReadService {
    return new LocalSupplierBillReadService();
  }

  // Explicit Phase 3C Contracts
  getSupplierPaymentRepository(): import("./interfaces/SupplierPaymentRepository").SupplierPaymentRepository {
    return new LocalSupplierPaymentRepository();
  }
  getSupplierPaymentReadService(): import("./interfaces/SupplierPaymentReadService").SupplierPaymentReadService {
    return new LocalSupplierPaymentReadService();
  }

  // Explicit Phase 4A Contracts
  getSalesOrderRepository() {
    return new LocalSalesOrderRepository();
  }
  getSalesDeliveryRepository() {
    return new LocalSalesDeliveryRepository();
  }
  getSalesDeliveryReadService() {
    return this.salesDeliveryReadSvc;
  }

  getCustomerInvoiceRepository() {
    return this.customerInvoiceRepo;
  }
  
  getCustomerPaymentRepository() {
    return this.customerPaymentRepo;
  }
  
  getCustomerPaymentReadService() {
    // Basic mock service for Local Mode if needed, else fallback
    return {
      getPayableInvoices: async () => {
        const invoices = await new LocalRepository('customer_invoices').list();
        return invoices.filter((i: any) => i.status !== 'Paid');
      },
      getPaymentWithDetails: async (id: string) => {
        const list = await new LocalRepository('customer_payments').list();
        return list.find((p: any) => p.id === id) || null;
      }
    };
  }
}
