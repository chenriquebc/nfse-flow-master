import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenantGate from "@/components/TenantGate";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import CompanyForm from "@/pages/CompanyForm";
import Invoices from "@/pages/Invoices";
import InvoiceForm from "@/pages/InvoiceForm";
import Certificates from "@/pages/Certificates";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
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
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><TenantGate><Dashboard /></TenantGate></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><TenantGate><Companies /></TenantGate></ProtectedRoute>} />
              <Route path="/companies/new" element={<ProtectedRoute><TenantGate><CompanyForm /></TenantGate></ProtectedRoute>} />
              <Route path="/companies/:id" element={<ProtectedRoute><TenantGate><CompanyForm /></TenantGate></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><TenantGate><Invoices /></TenantGate></ProtectedRoute>} />
              <Route path="/invoices/new" element={<ProtectedRoute><TenantGate><InvoiceForm /></TenantGate></ProtectedRoute>} />
              <Route path="/certificates" element={<ProtectedRoute><TenantGate><Certificates /></TenantGate></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><TenantGate><Reports /></TenantGate></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><TenantGate><SettingsPage /></TenantGate></ProtectedRoute>} />
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
