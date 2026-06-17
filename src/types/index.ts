export type ProjectStatus = 'Draft' | 'Aktif' | 'Selesai Produksi' | 'Selesai Penjualan' | 'Tutup Buku' | 'Operationally Completed' | 'Accounting Review' | 'Ready to Close' | 'Closed' | 'Reopened';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  start_date?: string;
  expected_end_date?: string;
  closed_at?: string;
  closed_by?: string;
  closing_snapshot_id?: string;
  reopened_at?: string;
  reopened_by?: string;
  reopen_reason?: string;
  created_at: string;
}

export interface Investor {
  id: string;
  name: string;
  contact_info?: string;
  created_at: string;
}

export type InvestmentStatus = 'Pending' | 'Confirmed' | 'Cancelled';

export interface ProjectInvestment {
  id: string;
  project_id: string;
  investor_id: string;
  amount: number;
  percentage: number;
  status: InvestmentStatus;
  created_at: string;
}

export interface ProjectWorkerAllocation {
  id: string;
  project_id: string;
  worker_id: string; // Could be user_id or employee_id
  role_name: string;
  allocation_percentage: number;
  effective_start_date: string;
  effective_end_date?: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  created_at: string;
  created_by: string;
}

export type ItemCategory = 
  | 'Ayam Petelur' 
  | 'Bahan Kandang' 
  | 'Kandang Jadi' 
  | 'Bahan Pakan' 
  | 'Pakan Jadi' 
  | 'Telur' 
  | 'Obat/Vitamin' 
  | 'Peralatan'
  | 'Lainnya';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  min_stock: number;
  avg_cost?: number;
  created_at: string;
}

export type MovementType = 'masuk' | 'keluar' | 'produksi' | 'penjualan' | 'mati' | 'hilang' | 'rusak' | 'koreksi' | 'Keluar untuk Produksi' | 'Masuk dari Produksi' | 'Reversal Produksi' | 'Keluar untuk Produksi Pakan' | 'Masuk dari Produksi Pakan' | 'Reversal Produksi Pakan' | 'Stock Opname Surplus' | 'Stock Opname Shortage' | 'Reversal Stock Opname' | 'Sales Delivery' | 'Sales Return' | 'Barang Rusak dalam Distribusi' | 'Ayam Mati dalam Distribusi' | 'Reversal Sales Delivery' | 'Ayam Masuk' | 'Ayam Terjual' | 'Ayam Mati' | 'Ayam Sakit' | 'Ayam Hilang' | 'Ayam Dipindah' | 'Bahan Dipakai Produksi Kandang' | 'Bahan Dipakai Racik Pakan';

export interface InventoryMovement {
  id: string;
  transaction_id: string;
  project_id?: string;
  item_id: string;
  movement_type: MovementType;
  direction: 'IN' | 'OUT';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  stock_before: number;
  stock_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  reversal_of_movement_id?: string;
}

// ---- MVP Stage 2 Types ----

export type ProductCategory = 'Paket Usaha' | 'Ayam Petelur' | 'Kandang' | 'Telur' | 'Lainnya';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  subCategory?: string; // e.g. Telur Biasa, Telur Omega, Telur Ayam Kampung, Telur Asin Ayam
  price: number;
  unit: string;
  is_active: boolean;
  inventory_item_id?: string;
  stock_tracked?: boolean;
  description?: string;
  created_at: string;
}

export interface Package {
  id: string;
  code: string;
  name: string;
  price: number;
  chicken_capacity: number;
  cage_type: string;
  cage_size: string;
  chicken_qty: number;
  feed_qty: string;
  includes_vitamin: boolean;
  includes_roof: boolean;
  includes_feeder: boolean;
  includes_drinker_nipple: boolean;
  includes_water_container: boolean;
  includes_consultation: boolean;
  can_request: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PackageComponent {
  id: string;
  package_id: string;
  item_id: string;
  quantity_per_package: number;
  component_type: string; // e.g. 'Ayam', 'Kandang', 'Pakan'
  required: boolean;
}

export type SalesOrderStatus = 'Draft' | 'Confirmed' | 'Stock Reserved' | 'Production' | 'Ready to Deliver' | 'Partially Delivered' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Belum Bayar' | 'DP' | 'Lunas';

export interface SalesOrder {
  id: string;
  order_number: string;
  date: string;
  project_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  order_type: 'Produk' | 'Paket';
  item_id: string;
  qty: number;
  unit_price: number;
  discount: number;
  shipping_cost: number;
  down_payment: number;
  status: SalesOrderStatus;
  payment_status: PaymentStatus;
  total_hpp?: number;
  gross_margin?: number;
  gross_margin_percentage?: number;
  notes?: string;
  created_at: string;
}

// ---- Finance Types (Unused, pending next iter) ----

export interface Employee {
  id: string;
  name: string;
  role: string; // e.g. CEO, Pekerja Lapangan
  profit_share_percentage: number; // e.g. 30, 14
  created_at: string;
}

export interface CashAccount {
  id: string;
  name: string;
  type: 'Kas' | 'Bank';
  initial_balance: number;
  created_at: string;
}

export type AccountCategoryType = 'Aset' | 'Kewajiban' | 'Modal' | 'Pendapatan' | 'HPP' | 'Biaya';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountCategoryType;
}

export type TransactionType = 'pemasukan' | 'pengeluaran';

export interface FinancialTransaction {
  id: string;
  project_id?: string;
  date: string;
  type: TransactionType;
  account_category: string; // references CoA name
  description: string;
  amount: number;
  cash_account_id: string;
  receipt_url?: string;
  status: 'Draft' | 'Approved' | 'Closed';
  created_at: string;
}

// ---- Purchase Types ----

export type SupplierCategory = 'Ayam' | 'Bahan Kandang' | 'Bahan Pakan' | 'Vitamin / Obat' | 'Peralatan' | 'Umum';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: SupplierCategory;
  phone: string;
  address: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export type POStatus = 'Draft' | 'Ordered' | 'Partial Received' | 'Partially Received' | 'Received' | 'Fully Received' | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  project_id: string;
  supplier_id: string;
  date: string;
  status: POStatus;
  total_amount: number;
  shipping_cost: number;
  notes?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: string;
}

// ---- Produksi Kandang Types ----

export interface CageType {
  id: string;
  code: string;
  name: string;
  capacity: number;
  width: number;
  length: number;
  height: number;
  unit: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface CageBOM {
  id: string;
  cage_type_id: string;
  item_id: string;
  qty_per_cage: number;
  notes?: string;
  created_at: string;
}

export type ProductionStatus = 'Draft' | 'In Progress' | 'Completed' | 'Cancelled' | 'Reversed';

export interface ProductionOrder {
  id: string;
  production_number: string;
  project_id: string;
  cage_type_id: string;
  planned_qty: number;
  actual_qty: number;
  start_date: string;
  target_date?: string;
  completed_date?: string;
  pic?: string;
  status: ProductionStatus;
  total_material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  other_cost: number;
  total_production_cost: number;
  hpp_per_cage: number;
  costing_status?: 'Valid' | 'Incomplete' | 'Recalculated';
  completed_at?: string;
  completed_by?: string;
  completion_transaction_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_transaction_id?: string;
  reversal_reason?: string;
  cancel_reason?: string;
  notes?: string;
  created_at: string;
}

export interface ProductionOrderItem {
  id: string;
  production_order_id: string;
  item_id: string;
  estimated_qty: number;
  actual_qty: number;
  unit_price: number;
  total_cost: number;
  created_at: string;
}

// ---- Produksi Pakan (Racik Pakan) Types ----

export type FeedType = 'Starter' | 'Grower' | 'Layer' | 'Omega' | 'Custom';

export interface FeedRecipe {
  id: string;
  code: string;
  name: string;
  feed_type: FeedType;
  estimated_yield_per_batch: number; // in Kg
  yield_unit: string; // usually 'Kg'
  notes?: string;
  is_active: boolean;
  version: number;
  parent_recipe_id?: string; // If this is a new version of an older recipe
  effective_date: string;
  created_at: string;
}

export interface FeedRecipeItem {
  id: string;
  recipe_id: string;
  item_id: string;
  qty_per_batch: number;
  unit: string;
  percentage: number;
  notes?: string;
  created_at: string;
}

export type FeedProductionStatus = 'Draft' | 'In Progress' | 'Completed' | 'Cancelled' | 'Reversed';

export interface FeedProductionOrder {
  id: string;
  production_number: string;
  project_id: string;
  recipe_id: string; // Points to the specific versioned recipe
  batch_count: number;
  estimated_yield: number;
  actual_yield: number; // in Kg
  start_date: string;
  target_date?: string;
  completed_date?: string;
  pic?: string;
  status: FeedProductionStatus;
  
  // Costs
  total_material_cost: number;
  labor_cost: number;
  machine_electricity_cost: number;
  additional_vitamin_cost: number;
  overhead_cost: number;
  other_cost: number;
  total_production_cost: number;
  hpp_per_kg: number;
  costing_status?: 'Valid' | 'Incomplete' | 'Recalculated';
  
  // Audits
  completed_at?: string;
  completed_by?: string;
  completion_transaction_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_transaction_id?: string;
  reversal_reason?: string;
  cancel_reason?: string;
  notes?: string;
  created_at: string;
}

export interface FeedProductionOrderItem {
  id: string;
  feed_production_order_id: string;
  item_id: string;
  estimated_qty: number;
  actual_qty: number;
  unit_price: number;
  total_cost: number;
  created_at: string;
}

// ---- Stock Opname & Audit Types ----

export type StockOpnameStatus = 'Draft' | 'In Progress' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected' | 'Cancelled' | 'Reversed';

export interface StockOpname {
  id: string;
  document_number: string;
  project_id: string;
  location: string;
  date: string; // Target date of opname
  pic: string; // Person in charge
  reviewer: string;
  status: StockOpnameStatus;
  notes?: string;

  // Value Aggregations
  total_surplus_value: number;
  total_shortage_value: number;
  net_adjustment_value: number;
  costing_status: 'Valid' | 'Incomplete';

  // Workflows
  submitted_at?: string;
  submitted_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  posted_at?: string;
  posted_by?: string;
  posting_transaction_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_transaction_id?: string;
  reversal_reason?: string;

  created_at: string;
}

export interface StockOpnameItem {
  id: string;
  opname_id: string;
  item_id: string;
  system_stock_snapshot: number; // Stock captured when item is added to draft
  physical_stock: number;
  difference: number;
  difference_type: 'Surplus' | 'Shortage' | 'Sama';
  avg_cost: number;
  difference_value: number; // Absolute financial impact
  reason?: string;
  notes?: string;
  photo_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

// ---- Distribution & Fulfillment Types ----

export interface InventoryReservation {
  id: string;
  project_id: string;
  sales_order_id: string;
  sales_order_item_id?: string; // specific component or product
  item_id: string;
  quantity: number;
  status: 'Active' | 'Released' | 'Fulfilled' | 'Cancelled';
  reserved_at: string;
  reserved_by: string;
  released_at?: string;
  fulfilled_at?: string;
  notes?: string;
}

export type SalesDeliveryStatus = 'Draft' | 'Scheduled' | 'Picking' | 'Loaded' | 'In Transit' | 'Partially Delivered' | 'Delivered' | 'Failed' | 'Returned' | 'Cancelled';

export interface SalesDelivery {
  id: string;
  delivery_number: string;
  sales_order_id: string;
  project_id: string;
  customer_name: string; // denormalized or linked
  customer_phone: string;
  customer_address: string;
  scheduled_date: string;
  actual_date?: string;
  driver?: string;
  vehicle_number?: string;
  actual_shipping_cost?: number;
  status: SalesDeliveryStatus;
  finance_status: string; // 'Invoice Eligible', 'Invoiced'
  transaction_id?: string;
  notes?: string;

  // HPP & Audit
  total_hpp: number;
  picked_at?: string;
  picked_by?: string;
  loaded_at?: string;
  loaded_by?: string;
  dispatched_at?: string;
  dispatched_by?: string;
  dispatch_transaction_id?: string;
  delivered_at?: string;
  received_by_customer?: string;
  proof_of_delivery?: string;
  
  // Reversal
  reversal_transaction_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;

  created_at: string;
}

export interface SalesDeliveryItem {
  id: string;
  sales_delivery_id: string;
  sales_order_id?: string;
  inventory_item_id: string;
  qty_order: number;
  qty_reserved: number;
  qty_picked: number;
  quantity_delivered: number;
  qty_returned: number;
  unit: string;
  unit_hpp: number;
  condition_notes?: string;
  created_at: string;
}

export type ReturnCondition = 'Layak Jual' | 'Rusak' | 'Ayam Mati' | 'Hilang' | 'Tidak Sesuai';
export type ReturnDecision = 'Masuk stok kembali' | 'Karantina' | 'Write-off';

export interface ReturnDelivery {
  id: string;
  return_number: string;
  sales_delivery_id: string;
  item_id: string;
  qty_returned: number;
  reason: string;
  condition: ReturnCondition;
  decision: ReturnDecision;
  return_date: string;
  pic: string;
  transaction_id?: string;
  created_at: string;
}

// ---- Operasional Ayam & Produksi Telur Types ----

export type ChickenType = 'Ayam Petelur' | 'Ayam Kampung' | 'Ayam Omega' | 'Custom';
export type FlockStatus = 'Active' | 'Closed' | 'Quarantine';

export interface Flock {
  id: string;
  flock_code: string;
  project_id: string;
  name: string;
  chicken_type: ChickenType;
  supplier?: string;
  start_date: string;
  start_age: number; // in weeks/days
  initial_population: number;
  location: string;
  cage_type: string;
  pic: string;
  status: FlockStatus;
  notes?: string;
  inventory_item_id: string; // The specific chicken inventory item
  created_at: string;
}

export type DailyRecordStatus = 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected' | 'Reversed' | 'Cancelled';
export type CostingStatus = 'Valid' | 'Incomplete';

export interface DailyChickenRecord {
  id: string;
  record_number: string;
  date: string;
  project_id: string;
  flock_id: string;
  pic: string;
  weather?: string;
  notes?: string;

  // Population
  start_population: number;
  chicken_in: number;
  chicken_out: number;
  chicken_dead: number;
  chicken_missing: number;
  chicken_culled: number;
  end_population: number;

  // KPI & Costing
  costing_status: CostingStatus;
  total_feed_cost: number;
  total_vitamin_cost: number;
  total_labor_cost: number;
  total_utility_cost: number;
  total_other_cost: number;
  total_daily_cost: number;
  cost_per_egg?: number;
  hdp?: number; // Hen Day Production percentage
  fcr?: number; // Feed Conversion Ratio
  mortality_rate?: number;

  // Status
  status: DailyRecordStatus;
  posted_at?: string;
  posted_by?: string;
  posting_transaction_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  reversal_transaction_id?: string;

  created_at: string;
}

export interface DailyFeedRecord {
  id: string;
  daily_record_id: string;
  feed_item_id: string;
  qty_given: number; // in Kg
  qty_remaining: number; // in Kg
  qty_consumed: number; // in Kg
  avg_cost: number;
  notes?: string;
}

export type EggType = 'Telur Biasa' | 'Telur Omega' | 'Telur Ayam Kampung' | 'Telur Retak' | 'Telur Rusak' | 'Custom';

export interface DailyEggRecord {
  id: string;
  daily_record_id: string;
  egg_type: EggType;
  inventory_item_id: string;
  qty_total: number;
  unit: string;
  qty_good: number; // Layak jual
  qty_cracked: number;
  qty_broken: number;
  notes?: string;
}

// Helper types for db
export type TableName = 'projects' | 'investors' | 'project_investments' | 'items' | 'inventory_movements' | 'inventory_balances' | 'inventory_locations' | 'purchase_receipts' | 'purchase_receipt_items' | 'supplier_bill_lines' | 'employees' | 'cash_accounts' | 'financial_transactions' | 'products' | 'packages' | 'package_components' | 'sales_orders' | 'suppliers' | 'purchase_orders' | 'purchase_order_items' | 'cage_types' | 'cage_boms' | 'production_orders' | 'production_order_items' | 'feed_recipes' | 'feed_recipe_items' | 'feed_production_orders' | 'feed_production_order_items' | 'stock_opnames' | 'stock_opname_items' | 'audit_logs' | 'inventory_reservations' | 'sales_deliveries' | 'sales_delivery_items' | 'return_deliveries' | 'flocks' | 'daily_chicken_records' | 'daily_feed_records' | 'daily_egg_records' | 'accounts' | 'journal_entries' | 'journal_entry_lines' | 'accounting_settings' | 'accounting_mappings' | 'accounting_periods' | 'period_snapshots' | 'project_financial_snapshots' | 'profit_distributions' | 'profit_distribution_payouts' | 'customer_invoices' | 'customer_payments' | 'supplier_bills' | 'supplier_payments' | 'cash_bank_transactions' | 'project_worker_allocations' | 'profit_distribution_worker_lines' | 'profit_distribution_investor_lines' | 'cash_bank_accounts' | 'cash_transactions' | 'customer_dps' | 'supplier_dps' | 'customer_refunds' | 'supplier_refunds' | 'payment_allocations';

// ---- ACCOUNTING & GENERAL LEDGER ----

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Cost of Goods Sold' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';

export interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  parent_account_id?: string;
  normal_balance: NormalBalance;
  allow_posting: boolean;
  project_required: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

export type JournalStatus = 'Draft' | 'Posted' | 'Reversed' | 'Cancelled';

export interface JournalEntry {
  id: string;
  journal_number: string;
  journal_date: string;
  project_id?: string;
  source_type?: string;
  source_id?: string;
  source_number?: string;
  description: string;
  status: JournalStatus;
  total_debit: number;
  total_credit: number;
  posting_transaction_id?: string;
  posted_at?: string;
  posted_by?: string;
  reversal_journal_id?: string;
  reversed_at?: string;
  reversed_by?: string;
  created_at: string;
  created_by: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  project_id?: string;
  description: string;
  debit: number;
  credit: number;
  customer_id?: string;
  supplier_id?: string;
  investor_id?: string;
  item_id?: string;
  due_date?: string;
  reference?: string;
}

export type PeriodStatus = 'Open' | 'Soft Closed' | 'Closed';

export interface AccountingPeriod {
  id: string;
  period_code: string;
  period_name: string; // e.g. "2023-10"
  start_date: string;
  end_date: string;
  fiscal_year: number;
  status: PeriodStatus;
  lock_date?: string;
  soft_closed_at?: string;
  soft_closed_by?: string;
  closed_at?: string;
  closed_by?: string;
  reopened_at?: string;
  reopened_by?: string;
  reopen_reason?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface PeriodSnapshot {
  id: string;
  accounting_period_id: string;
  snapshot_version: number;
  trial_balance_data: any;
  balance_sheet_data: any;
  profit_loss_data: any;
  cash_data: any;
  ar_data: any;
  ap_data: any;
  inventory_valuation_data: any;
  reconciliation_data: any;
  created_at: string;
  created_by?: string;
  status: 'Active' | 'Superseded';
}

export interface ProjectFinancialSnapshot {
  id: string;
  project_id: string;
  snapshot_version: number;
  project_revenue: number;
  sales_returns: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  inventory_losses: number;
  other_income: number;
  other_expenses: number;
  net_project_profit: number;
  cash_balance: number;
  ar_balance: number;
  ap_balance: number;
  inventory_ending_value: number;
  investor_confirmed_capital: number;
  worker_allocation: any; // JSON repr
  trial_balance_data: any;
  journal_list: string[]; // array of journal ids
  closing_date: string;
  created_at: string;
  created_by?: string;
  status: 'Active' | 'Superseded';
}

export interface AccountingSetting {
  id: string;
  company_name: string;
  currency: string;
  fiscal_year_start: string;
  accounting_basis: 'Accrual' | 'Cash';
  inventory_costing: 'Moving Average' | 'FIFO';
  current_open_period_id?: string;
  lock_date?: string;
  retained_earnings_account_id?: string;
  profit_sharing_payable_worker_account_id?: string;
  profit_sharing_payable_investor_account_id?: string;
  csr_payable_account_id?: string;
  company_reserve_account_id?: string;
}

export interface AccountingMapping {
  id: string;
  mapping_type: 'Product Category' | 'Inventory Category' | 'Inventory Gain' | 'Inventory Loss' | 'Inventory Write-off' | 
                'Product Revenue' | 'Product Return' | 'Product COGS' | 'Product COGS Inventory' |
                'Expense Category' | 'Cash Bank' | 'Event' | 'Profit Distribution';
  source_id?: string; // category name or event name
  account_id: string; // the linked GL account
  description?: string;
}

// Subledgers AR/AP/Cash

export interface CustomerInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  project_id: string;
  sales_order_id?: string;
  sales_delivery_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  tax: number; // placeholder
  total_amount: number;
  dp_applied: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'Draft' | 'Posted' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Reversed';
  journal_entry_id?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface CustomerPayment {
  id: string;
  payment_number: string;
  customer_name: string;
  project_id: string;
  payment_date: string;
  cash_bank_account_id: string;
  amount: number;
  unapplied_amount: number;
  reference?: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  journal_entry_id?: string;
}

export interface SupplierBill {
  id: string;
  organization_id: string;
  bill_number: string;
  supplier_id: string;
  project_id: string;
  purchase_order_id?: string;
  purchase_receipt_id?: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'Draft' | 'Posted' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Reversed';
  journal_entry_id?: string;
  supplier_invoice_number?: string;
  notes?: string;
  created_at?: string;
  created_by?: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  project_id: string;
  payment_date: string;
  cash_bank_account_id: string;
  amount: number;
  unapplied_amount: number;
  reference?: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  journal_entry_id?: string;
}

export type PayoutRecipientType = 'Company Reserve' | 'Worker' | 'Investor' | 'CSR';

export interface ProfitDistribution {
  id: string;
  project_id: string;
  net_profit: number;
  company_reserve: number;
  remaining_profit: number;
  worker_pool: number;
  investor_pool: number;
  csr: number;
  rounding_difference: number;
  status: 'Draft' | 'Reviewed' | 'Approved' | 'Posted' | 'Partially Paid' | 'Paid' | 'Reversed' | 'Cancelled' | 'No Distribution';
  journal_entry_id?: string;
  posted_at?: string;
  posted_by?: string;
  created_at: string;
  created_by?: string;
}

export interface ProfitDistributionPayout {
  id: string;
  profit_distribution_id: string;
  payout_number: string;
  recipient_type: PayoutRecipientType;
  recipient_id?: string;
  recipient_name_snapshot?: string;
  payable_account_id: string;
  cash_bank_account_id: string;
  payment_date: string;
  amount: number;
  reference?: string;
  notes?: string;
  status: 'Draft' | 'Approved' | 'Posted' | 'Reversed';
  journal_entry_id?: string;
  posting_transaction_id?: string;
  posted_at?: string;
  posted_by?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  created_at: string;
}

export interface ProfitDistributionWorkerLine {
  id: string;
  profit_distribution_id: string;
  worker_id: string;
  worker_name_snapshot: string;
  role_snapshot: string;
  percentage_snapshot: number;
  worker_pool_amount: number;
  allocated_amount: number;
}

export interface ProfitDistributionInvestorLine {
  id: string;
  profit_distribution_id: string;
  investor_id: string;
  investor_name_snapshot: string;
  confirmed_capital_snapshot: number;
  percentage_snapshot: number;
  investor_pool_amount: number;
  allocated_amount: number;
}

export interface CashBankAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'Cash' | 'Bank';
  gl_account_id: string;
  bank_name?: string;
  bank_account_number?: string;
  account_holder?: string;
  currency: 'IDR';
  opening_balance: number;
  balance?: number;
  opening_balance_date: string;
  active: boolean;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface CashTransaction {
  id: string;
  transaction_number: string;
  transaction_type: 'Receipt' | 'Payment' | 'Transfer';
  transaction_date: string;
  project_id?: string;
  cash_bank_account_id: string;
  counter_account_id?: string; // missing if transfer
  destination_bank_account_id?: string; // used if transfer
  customer_id?: string;
  supplier_id?: string;
  investor_id?: string;
  amount: number;
  description: string;
  reference?: string;
  attachment?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Reversed' | 'Cancelled';
  journal_entry_id?: string;
  created_at: string;
  created_by: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string; // from CustomerPayment or SupplierPayment
  invoice_id?: string; // CustomerInvoice
  supplier_bill_id?: string; // SupplierBill
  allocated_amount: number;
  discount_taken?: number;
  allocation_date: string;
  created_at: string;
}

export interface CustomerDP {
  id: string;
  receipt_number: string;
  customer_id: string;
  project_id: string;
  sales_order_id?: string;
  date: string;
  cash_bank_account_id: string;
  amount: number;
  unapplied_amount: number;
  status: 'Draft' | 'Posted' | 'Partially Applied' | 'Fully Applied' | 'Reversed';
  journal_entry_id?: string;
  created_at: string;
}

export interface CustomerRefund {
  id: string;
  refund_number: string;
  customer_id: string;
  project_id: string;
  return_id: string;
  cash_bank_account_id: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  notes?: string;
  journal_entry_id?: string;
  created_at: string;
}

export interface SupplierRefund {
  id: string;
  refund_number: string;
  supplier_id: string;
  project_id: string;
  return_id: string;
  cash_bank_account_id: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  notes?: string;
  journal_entry_id?: string;
  created_at: string;
}
