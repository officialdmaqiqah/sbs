import type { 
  DataProvider, Repository, CommandService, TransactionService, CreateInput, UpdateInput,
  ProjectRepository, ItemRepository, InventoryLocationRepository, 
  InventoryMovementRepository, InventoryBalanceRepository, InventoryCommandService 
} from '../repositories/interfaces';
import { supabase } from '../lib/supabase';
import { SupabaseProjectRepository } from './supabase/SupabaseProjectRepository';
import { SupabaseItemRepository } from './supabase/SupabaseItemRepository';
import { SupabaseInventoryLocationRepository } from './supabase/SupabaseInventoryLocationRepository';
import { SupabaseInventoryBalanceRepository } from './supabase/SupabaseInventoryBalanceRepository';
import { SupabaseInventoryMovementRepository } from './supabase/SupabaseInventoryMovementRepository';
import { SupabaseInventoryCommandService } from './supabase/SupabaseInventoryCommandService';
import { SupabasePurchaseOrderRepository } from './supabase/SupabasePurchaseOrderRepository';
import { SupabasePurchaseReceiptRepository } from './supabase/SupabasePurchaseReceiptRepository';
import { SupabasePurchaseReadService } from './supabase/SupabasePurchaseReadService';
import { SupabaseSupplierBillRepository } from './supabase/SupabaseSupplierBillRepository';
import { SupabaseSupplierBillReadService } from './supabase/SupabaseSupplierBillReadService';
import { SupabaseSupplierPaymentRepository } from './supabase/SupabaseSupplierPaymentRepository';
import { SupabaseSupplierPaymentReadService } from './supabase/SupabaseSupplierPaymentReadService';
import { SupabaseSalesOrderRepository } from './supabase/SupabaseSalesOrderRepository';
import { SupabaseSalesDeliveryRepository } from './supabase/SupabaseSalesDeliveryRepository';
import { SupabaseSalesDeliveryReadService } from './supabase/SupabaseSalesDeliveryReadService';
import { SupabaseCustomerInvoiceRepository } from './supabase/SupabaseCustomerInvoiceRepository';
import { SupabaseCustomerPaymentRepository } from './supabase/SupabaseCustomerPaymentRepository';
import { SupabaseCustomerPaymentReadService } from './supabase/SupabaseCustomerPaymentReadService';


class SupabaseRepository<T> implements Repository<T> {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async list(filters?: Record<string, any>): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*');
    
    if (filters) {
      for (const key in filters) {
        query = query.eq(key, filters[key]);
      }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as T[];
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST code for zero rows
      throw error;
    }
    return data as unknown as T;
  }

  async create(data: CreateInput): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([data])
      .select()
      .single();
      
    if (error) throw error;
    return result as unknown as T;
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return result as unknown as T;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
}

class SupabaseCommandService implements CommandService {
  async execute(commandName: string, payload: any): Promise<any> {
    const { data, error } = await supabase.rpc(commandName, payload);
    if (error) throw error;
    return data;
  }
}

class SupabaseTransactionService implements TransactionService {
  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    console.warn('Client-side transactions are not supported in Supabase. Ensure atomic operations are executed via RPC.');
    return await operation();
  }
}

export class SupabaseDataProvider implements DataProvider {
  private purchaseOrderRepo: SupabasePurchaseOrderRepository;
  private purchaseReceiptRepo: SupabasePurchaseReceiptRepository;
  private purchaseReadSvc: SupabasePurchaseReadService;
  private supplierBillRepo: SupabaseSupplierBillRepository;
  private supplierBillReadSvc: SupabaseSupplierBillReadService;
  private supplierPaymentRepo: SupabaseSupplierPaymentRepository;
  private supplierPaymentReadSvc: SupabaseSupplierPaymentReadService;
  private salesOrderRepo: SupabaseSalesOrderRepository;
  private salesDeliveryRepo: SupabaseSalesDeliveryRepository;
  private salesDeliveryReadSvc: SupabaseSalesDeliveryReadService;
  private customerInvoiceRepo: SupabaseCustomerInvoiceRepository;
  private customerPaymentRepo: SupabaseCustomerPaymentRepository;
  private customerPaymentReadSvc: SupabaseCustomerPaymentReadService;

  constructor() {
    this.purchaseOrderRepo = new SupabasePurchaseOrderRepository();
    this.purchaseReceiptRepo = new SupabasePurchaseReceiptRepository();
    this.purchaseReadSvc = new SupabasePurchaseReadService();
    this.supplierBillRepo = new SupabaseSupplierBillRepository();
    this.supplierBillReadSvc = new SupabaseSupplierBillReadService();
    this.supplierPaymentRepo = new SupabaseSupplierPaymentRepository();
    this.supplierPaymentReadSvc = new SupabaseSupplierPaymentReadService();
    this.salesOrderRepo = new SupabaseSalesOrderRepository();
    this.salesDeliveryRepo = new SupabaseSalesDeliveryRepository();
    this.salesDeliveryReadSvc = new SupabaseSalesDeliveryReadService();
    this.customerInvoiceRepo = new SupabaseCustomerInvoiceRepository();
    this.customerPaymentRepo = new SupabaseCustomerPaymentRepository();
    this.customerPaymentReadSvc = new SupabaseCustomerPaymentReadService();
  }

  getRepository<T>(entityName: string): Repository<T> {
    return new SupabaseRepository<T>(entityName);
  }

  getCommandService(): CommandService {
    return new SupabaseCommandService();
  }

  getTransactionService(): TransactionService {
    return new SupabaseTransactionService();
  }

  getProjectRepository(): ProjectRepository { return new SupabaseProjectRepository(); }
  getItemRepository(): ItemRepository { return new SupabaseItemRepository(); }
  getInventoryLocationRepository(): InventoryLocationRepository { return new SupabaseInventoryLocationRepository(); }
  getInventoryMovementRepository(): InventoryMovementRepository { return new SupabaseInventoryMovementRepository(); }
  getInventoryBalanceRepository(): InventoryBalanceRepository { return new SupabaseInventoryBalanceRepository(); }
  getInventoryCommandService(): InventoryCommandService { return new SupabaseInventoryCommandService(); }

  getPurchaseOrderRepository() { return this.purchaseOrderRepo; }
  getPurchaseReceiptRepository() { return this.purchaseReceiptRepo; }
  getPurchaseReadService() { return this.purchaseReadSvc; }

  getSupplierBillRepository() { return this.supplierBillRepo; }
  getSupplierBillReadService() { return this.supplierBillReadSvc; }

  getSupplierPaymentRepository() { return this.supplierPaymentRepo; }
  getSupplierPaymentReadService() { return this.supplierPaymentReadSvc; }

  getSalesOrderRepository() { return this.salesOrderRepo; }
  getSalesDeliveryRepository() { return this.salesDeliveryRepo; }
  getSalesDeliveryReadService() { return this.salesDeliveryReadSvc; }

  // Phase 4B Contracts
  getCustomerInvoiceRepository() {
    return this.customerInvoiceRepo;
  }
  getCustomerPaymentRepository() {
    return this.customerPaymentRepo;
  }
  getCustomerPaymentReadService() {
    return this.customerPaymentReadSvc;
  }
}
