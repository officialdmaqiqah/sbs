export interface CreateInput {
  // Omit generated fields like id, created_at, updated_at
  [key: string]: any;
}

export interface UpdateInput {
  [key: string]: any;
}

export interface Repository<T> {
  list(filters?: Record<string, any>): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface CommandService {
  // Command services execute complex business logic that may span multiple entities
  // or require atomic transactions.
  execute(commandName: string, payload: any): Promise<any>;
}

export interface TransactionService {
  // Manages atomic operations (RPC in Supabase, synchronous multi-update in Local)
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}

export interface ProjectRepository {
  listProjects(): Promise<any[]>;
  getProjectById(id: string): Promise<any | null>;
  createProject(data: any): Promise<any>;
  updateProject(id: string, data: any): Promise<any>;
}

export interface ItemRepository {
  listItems(): Promise<any[]>;
  getItemById(id: string): Promise<any | null>;
  createItem(data: any): Promise<any>;
  updateItem(id: string, data: any): Promise<any>;
}

export interface InventoryLocationRepository {
  listLocations(): Promise<any[]>;
  getLocationById(id: string): Promise<any | null>;
  createLocation(data: any): Promise<any>;
  updateLocation(id: string, data: any): Promise<any>;
  deleteLocation(id: string): Promise<void>;
}

export interface InventoryMovementRepository {
  listMovements(filters?: any): Promise<any[]>;
  getMovementById(id: string): Promise<any | null>;
  listKartuStok(itemId: string, projectId?: string, locationId?: string): Promise<any[]>;
}

export interface InventoryBalanceRepository {
  listBalances(filters?: any): Promise<any[]>;
  getBalance(projectId: string, locationId: string, itemId: string): Promise<any | null>;
}

export interface InventoryCommandService {
  postInventoryTransaction(input: any): Promise<any>;
}

export interface SalesOrderRepository {
  listSalesOrders(filters?: Record<string, any>): Promise<any[]>;
  getSalesOrderById(id: string): Promise<any | null>;
  createSalesOrder(data: any): Promise<any>;
  updateSalesOrderStatus(id: string, status: string): Promise<any>;
}

export interface SalesDeliveryRepository {
  listSalesDeliveries(filters?: Record<string, any>): Promise<any[]>;
  getSalesDeliveryById(id: string): Promise<any | null>;
  createSalesDelivery(data: any): Promise<any>;
}

export interface SalesDeliveryReadService {
  getDeliverableSalesOrders(): Promise<any[]>;
  getSalesDeliveryWithDetails(id: string): Promise<any | null>;
}

export interface DataProvider {
  // Generic fallback for non-migrated entities
  getRepository<T>(entityName: string): Repository<T>;
  getCommandService(): CommandService;
  getTransactionService(): TransactionService;

  // Explicit Phase 2 Contracts
  getProjectRepository(): ProjectRepository;
  getItemRepository(): ItemRepository;
  getInventoryLocationRepository(): InventoryLocationRepository;
  getInventoryMovementRepository(): InventoryMovementRepository;
  getInventoryBalanceRepository(): InventoryBalanceRepository;
  getInventoryCommandService(): InventoryCommandService;

  // Explicit Phase 3A Contracts
  getPurchaseOrderRepository(): import('../providers/interfaces/PurchaseOrderRepository').PurchaseOrderRepository;
  getPurchaseReceiptRepository(): import('../providers/interfaces/PurchaseReceiptRepository').PurchaseReceiptRepository;
  getPurchaseReadService(): import('../providers/interfaces/PurchaseReadService').PurchaseReadService;

  // Explicit Phase 3B Contracts
  getSupplierBillRepository(): import('../providers/interfaces/SupplierBillRepository').SupplierBillRepository;
  getSupplierBillReadService(): import('../providers/interfaces/SupplierBillReadService').SupplierBillReadService;

  // Explicit Phase 3C Contracts
  getSupplierPaymentRepository(): import('../providers/interfaces/SupplierPaymentRepository').SupplierPaymentRepository;
  getSupplierPaymentReadService(): import('../providers/interfaces/SupplierPaymentReadService').SupplierPaymentReadService;

  // Explicit Phase 4A Contracts
  getSalesOrderRepository(): SalesOrderRepository;
  getSalesDeliveryRepository(): SalesDeliveryRepository;
  getSalesDeliveryReadService(): SalesDeliveryReadService;

  // Explicit Phase 4B Contracts
  getCustomerInvoiceRepository(): import('../providers/interfaces/CustomerInvoiceRepository').CustomerInvoiceRepository;
  getCustomerPaymentRepository(): import('../providers/interfaces/CustomerPaymentRepository').CustomerPaymentRepository;
  getCustomerPaymentReadService(): import('../providers/interfaces/CustomerPaymentReadService').CustomerPaymentReadService;
}
