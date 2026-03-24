import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Suppliers from './pages/Suppliers'
import SupplierDetail from './pages/SupplierDetail'
import Criteria from './pages/admin/Criteria'
import PaymentContacts from './pages/admin/PaymentContacts'
import UsersAdmin from './pages/admin/Users'
import NotificationSettings from './pages/admin/NotificationSettings'
import Profile from './pages/Profile'
import ClientList from './pages/academic/ClientList'
import ClientDetail from './pages/academic/ClientDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin/criteria" element={<Criteria />} />
                <Route path="/admin/payment-contacts" element={<PaymentContacts />} />
                <Route path="/admin/users" element={<UsersAdmin />} />
                <Route path="/admin/notifications" element={<NotificationSettings />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
