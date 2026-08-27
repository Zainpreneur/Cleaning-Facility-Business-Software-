import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ClientList } from "./pages/clients/ClientList";
import { ClientDetail } from "./pages/clients/ClientDetail";
import { PropertyList } from "./pages/properties/PropertyList";
import { PropertyDetail } from "./pages/properties/PropertyDetail";
import { JobList } from "./pages/jobs/JobList";
import { JobDetail } from "./pages/jobs/JobDetail";
import { InvoiceList } from "./pages/invoices/InvoiceList";
import { InvoiceDetail } from "./pages/invoices/InvoiceDetail";
import { InventoryList } from "./pages/inventory/InventoryList";
import { InspectionList } from "./pages/inspections/InspectionList";
import { StaffList } from "./pages/staff/StaffList";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="properties" element={<PropertyList />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="inspections" element={<InspectionList />} />
          <Route
            path="staff"
            element={
              <AdminRoute>
                <StaffList />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
