import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Trade from "./pages/Trade";
import Wallet from "./pages/Wallet";
import History from "./pages/History";
import Help from "./pages/Help";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminTrades from "./pages/admin/AdminTrades";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/help" element={<Help />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/trade" element={
              <ProtectedRoute><Trade /></ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute><Wallet /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><History /></ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>
            } />
            <Route path="/admin/deposits" element={
              <AdminProtectedRoute><AdminDeposits /></AdminProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <AdminProtectedRoute><AdminWithdrawals /></AdminProtectedRoute>
            } />
            <Route path="/admin/trades" element={
              <AdminProtectedRoute><AdminTrades /></AdminProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
