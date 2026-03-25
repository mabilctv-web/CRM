import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Order from './pages/Order'
import ClientAuth from './pages/client/ClientAuth'
import MyOrders from './pages/client/MyOrders'
import MyOrderDetail from './pages/client/MyOrderDetail'
import Dashboard from './pages/Dashboard'
import Suppliers from './pages/Suppliers'
import SupplierDetail from './pages/SupplierDetail'
import Criteria from './pages/admin/Criteria'
import SupplierCategories from './pages/admin/SupplierCategories'
import PaymentContacts from './pages/admin/PaymentContacts'
import UsersAdmin from './pages/admin/Users'
import NotificationSettings from './pages/admin/NotificationSettings'
import Profile from './pages/Profile'
import ClientList from './pages/academic/ClientList'
import ClientDetail from './pages/academic/ClientDetail'
import CRMOrders from './pages/crm/Orders'
import CRMOrderDetail from './pages/crm/OrderDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/order" element={<Order />} />
          <Route path="/auth" element={<ClientAuth />} />
          <Route path="/my" element={<MyOrders />} />
          <Route path="/my/orders/:id" element={<MyOrderDetail />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route element={<ProtectedRoute section="suppliers" />}>
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/suppliers/:id" element={<SupplierDetail />} />
              </Route>
              <Route element={<ProtectedRoute section="academic" />}>
                <Route path="/academic" element={<Navigate to="/academic/clients" replace />} />
                <Route path="/academic/clients" element={<ClientList />} />
                <Route path="/academic/clients/:id" element={<ClientDetail />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
              <Route path="/crm/orders" element={<CRMOrders />} />
              <Route path="/crm/orders/:id" element={<CRMOrderDetail />} />
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin/criteria" element={<Criteria />} />
                <Route path="/admin/categories" element={<SupplierCategories />} />
                <Route path="/admin/payment-contacts" element={<PaymentContacts />} />
                <Route path="/admin/users" element={<UsersAdmin />} />
                <Route path="/admin/notifications" element={<NotificationSettings />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
