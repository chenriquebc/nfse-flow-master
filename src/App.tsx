import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenantGate from "@/components/TenantGate";
import ActivationGate from "@/components/ActivationGate";
import AdminRoute from "@/components/AdminRoute";
import Auth from "@/pages/Auth";
import Activate from "@/pages/Activate";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import CompanyForm from "@/pages/CompanyForm";
import Invoices from "@/pages/Invoices";
import InvoiceForm from "@/pages/InvoiceForm";
import Certificates from "@/pages/Certificates";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAccounts from "@/pages/admin/AdminAccounts";
import AdminFinancial from "@/pages/admin/AdminFinancial";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/activate" element={<ProtectedRoute><Activate /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><ActivationGate><Onboarding /></ActivationGate></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><ActivationGate><TenantGate><Dashboard /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><ActivationGate><TenantGate><Companies /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/companies/new" element={<ProtectedRoute><ActivationGate><TenantGate><CompanyForm /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/companies/:id" element={<ProtectedRoute><ActivationGate><TenantGate><CompanyForm /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><ActivationGate><TenantGate><Invoices /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/invoices/new" element={<ProtectedRoute><ActivationGate><TenantGate><InvoiceForm /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><ActivationGate><TenantGate><InvoiceForm /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/certificates" element={<ProtectedRoute><ActivationGate><TenantGate><Certificates /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ActivationGate><TenantGate><Reports /></TenantGate></ActivationGate></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><ActivationGate><TenantGate><SettingsPage /></TenantGate></ActivationGate></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="accounts" element={<AdminAccounts />} />
                <Route path="logs" element={<AdminAuditLogs />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
