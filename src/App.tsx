import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';

import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import Unauthorized from './pages/auth/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import Permissions from './pages/admin/Permissions';
import ProjectAccess from './pages/admin/ProjectAccess';



import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import SalesOrders from './pages/SalesOrders';
import SalesOrderDetail from './pages/SalesOrderDetail';
import Distribution from './pages/Distribution';
import DistributionDetail from './pages/DistributionDetail';
import WaybillPrint from './pages/WaybillPrint';
import Purchase from './pages/Purchase';
import ProduksiKandang from './pages/ProduksiKandang';
import FeedMixing from './pages/FeedMixing';
import ProductionDetail from './pages/ProductionDetail';
import Inventory from './pages/Inventory';
import RacikPakan from './pages/RacikPakan';
import OperasionalAyam from './pages/OperasionalAyam';

import FinanceOverview from './pages/FinanceOverview';
import FinanceLayout from './components/FinanceLayout';

import CashBankList from './pages/CashBankList';
import CashBankTransactions from './pages/CashBankTransactions';
import CustomerInvoices from './pages/CustomerInvoices';
import CustomerPayments from './pages/CustomerPayments';
import CustomerDP from './pages/CustomerDP';
import ARAging from './pages/ARAging';
import CustomerRefunds from './pages/CustomerRefunds';

import SupplierBills from './pages/SupplierBills';
import SupplierPayments from './pages/SupplierPayments';
import APAging from './pages/APAging';
import SupplierRefunds from './pages/SupplierRefunds';

import AccountingPeriods from './pages/AccountingPeriods';
import ProjectClosing from './pages/ProjectClosing';
import ProfitDistributions from './pages/ProfitDistributions';
import Reports from './pages/Reports';

import GoLiveChecklist from './pages/GoLiveChecklist';
import InitialSetup from './pages/InitialSetup';
import AdvancedFeatures from './pages/AdvancedFeatures';
import BusinessFlowGuide from './pages/BusinessFlowGuide';

const AuthenticatedLayout = () => (
  <ProjectProvider>
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </ProjectProvider>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/go-live-checklist" element={<GoLiveChecklist />} />
            <Route path="/guide" element={<BusinessFlowGuide />} />
            <Route path="/setup/initial-balance" element={<InitialSetup />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/closing" element={<ProjectClosing />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchase" element={<ProtectedRoute requiredPermission="PURCHASE"><Purchase /></ProtectedRoute>} />
            <Route path="/produksi-kandang" element={<ProduksiKandang />} />
            <Route path="/racik-pakan" element={<RacikPakan />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/sales/orders" element={<SalesOrders />} />
            <Route path="/sales/orders/:id" element={<SalesOrderDetail />} />
            <Route path="/sales/pos" element={<PlaceholderPage title="Quick Sale / POS" message="Quick Sale akan dipakai untuk input penjualan cepat setelah uji internal 3-7 hari." />} />
            <Route path="/sales/customers" element={<PlaceholderPage title="Data Customer" message="Fitur manajemen Customer sedang disiapkan untuk iterasi selanjutnya." />} />
            
            {/* Distribution */}
            <Route path="/distribution" element={<PlaceholderPage title="Distribusi" message="Dashboard distribusi" />} />
            <Route path="/distribution/shipments" element={<Distribution />} />
            <Route path="/distribution/shipments/:id" element={<DistributionDetail />} />
            <Route path="/distribution/shipments/:id/waybill" element={<WaybillPrint />} />
            
            <Route path="/operasional-ayam" element={<OperasionalAyam />} />

            {/* Production */}
            <Route path="/operations/cage-production" element={<ProduksiKandang />} />
            <Route path="/operations/feed-mixing" element={<FeedMixing />} />
            <Route path="/operations/production/:id" element={<ProductionDetail />} />

            {/* Inventory Placeholders */}
            <Route path="/inventory/materials" element={<PlaceholderPage title="Bahan Kandang" message="Fitur Manajemen Bahan Kandang telah digabungkan ke dalam halaman utama Stok Barang." />} />
            <Route path="/inventory/movements" element={<PlaceholderPage title="Riwayat Mutasi" message="Riwayat mutasi saat ini tergabung di fitur Kartu Stok pada halaman utama Stok." />} />
            <Route path="/inventory/in" element={<PlaceholderPage title="Stok Masuk" message="Gunakan fitur Pembelian atau Terima Barang untuk mencatat Stok Masuk otomatis." />} />
            <Route path="/inventory/out" element={<PlaceholderPage title="Stok Keluar" message="Gunakan fitur Penjualan untuk mencatat Stok Keluar otomatis." />} />
            <Route path="/inventory/opname" element={<PlaceholderPage title="Stok Opname" message="Fitur Stok Opname sudah tergabung di halaman utama Stok (tab Stock Opname)." />} />

            {/* Purchase Placeholders */}
            <Route path="/purchase/receipts" element={<PlaceholderPage title="Terima Barang" message="Fitur ini akan diaktifkan setelah integrasi dengan sistem Gudang." />} />
            <Route path="/purchase/suppliers" element={<PlaceholderPage title="Data Supplier" message="Fitur manajemen Supplier sedang disiapkan untuk iterasi selanjutnya." />} />

            <Route path="/finance" element={<FinanceLayout />}>
              <Route index element={<FinanceOverview />} />
              <Route path="periods" element={<AccountingPeriods />} />
              <Route path="project-closing" element={<ProjectClosing />} />
              <Route path="profit-distributions" element={<ProfitDistributions />} />
              
              <Route path="cash-bank" element={<CashBankList />} />
              <Route path="cash-transactions" element={<CashBankTransactions />} />
              
              <Route path="ar/invoices" element={<CustomerInvoices />} />
              <Route path="ar/payments" element={<CustomerPayments />} />
              <Route path="ar/customer-dp" element={<CustomerDP />} />
              <Route path="ar/aging" element={<ARAging />} />
              
              <Route path="ap/bills" element={<SupplierBills />} />
              <Route path="ap/payments" element={<SupplierPayments />} />
              <Route path="ap/aging" element={<APAging />} />
              
              <Route path="refunds/customer" element={<CustomerRefunds />} />
              <Route path="refunds/supplier" element={<SupplierRefunds />} />
            </Route>

            <Route path="/settings">
              <Route path="users" element={<Users />} />
              <Route path="company" element={<PlaceholderPage title="Data Usaha" message="Pengaturan Data Usaha belum diaktifkan pada versi Internal Beta." />} />
              <Route path="advanced-features" element={<AdvancedFeatures />} />
            </Route>

            <Route path="/admin">
              <Route path="roles" element={<Roles />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="project-access" element={<ProjectAccess />} />
            </Route>
            
            <Route path="/reports">
              <Route index element={<Reports />} />
              <Route path="cashflow" element={<Reports />} />
              <Route path="pl" element={<Reports />} />
              <Route path="bs" element={<Reports />} />
              <Route path="inventory" element={<Reports />} />
              <Route path="purchase" element={<Reports />} />
              <Route path="sales" element={<Reports />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
