import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/DashboardLayout';

import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import Unauthorized from './pages/auth/Unauthorized';
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
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
            
            {/* Distribution */}
            <Route path="/distribution/shipments" element={<Distribution />} />
            <Route path="/distribution/shipments/:id" element={<DistributionDetail />} />
            <Route path="/distribution/shipments/:id/waybill" element={<WaybillPrint />} />
            
            <Route path="/operasional-ayam" element={<OperasionalAyam />} />

            {/* Production */}
            <Route path="/operations/cage-production" element={<ProduksiKandang />} />
            <Route path="/operations/feed-mixing" element={<FeedMixing />} />
            <Route path="/operations/production/:id" element={<ProductionDetail />} />

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
