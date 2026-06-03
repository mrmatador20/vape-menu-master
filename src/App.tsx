import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthStateProvider } from "./context/AuthStateContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthInterceptor } from "./components/AuthInterceptor";
import { SessionTimeoutProvider } from "./components/SessionTimeoutProvider";
import { SiteIdentityProvider } from "./components/SiteIdentityProvider";
import { SiteThemeProvider } from "./components/SiteThemeProvider";
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MyOrders from "./pages/MyOrders";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminOrders from "./pages/admin/Orders";
import AdminStats from "./pages/admin/Stats";
import AdminDiscounts from "./pages/admin/Discounts";
import AdminStoreDiscount from "./pages/admin/StoreDiscount";
import AdminReviews from "./pages/admin/Reviews";
import AdminShippingRates from "./pages/admin/ShippingRates";
import AdminSettings from "./pages/admin/Settings";
import AdminBanners from "./pages/admin/Banners";
import AdminPromoBanners from "./pages/admin/PromoBanners";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSecurityDashboard from "./pages/admin/SecurityDashboard";
import AdminReferrals from "./pages/admin/Referrals";
import AdminReferralMetrics from "./pages/admin/ReferralMetrics";
import AdminInfluencerMetrics from "./pages/admin/InfluencerMetrics";
import AdminReports from "./pages/admin/Reports";
import TrustedDevices from "./pages/TrustedDevices";
import Affiliate from "./pages/Affiliate";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import DataRights from "./pages/DataRights";
import AdminLegalDocuments from "./pages/admin/LegalDocuments";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import CookieBanner from "./components/CookieBanner";
import LegalReacceptDialog from "./components/LegalReacceptDialog";

const queryClient = new QueryClient();

const INFLUENCER_COUPON_KEY = 'influencer_coupon_code';

// Capture ?cupom= from URL on app load
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const cupom = params.get('cupom');
    if (cupom && cupom.trim().length > 0) {
      localStorage.setItem(INFLUENCER_COUPON_KEY, cupom.trim().toUpperCase());
    }
  } catch (e) {
    console.warn('Failed to read ?cupom= param', e);
  }
}

// Component to check if user is in password reset flow
const ResetFlowGuard = ({ children }: { children: React.ReactNode }) => {
  const isInResetFlow = localStorage.getItem('password_reset_flow') === 'true';
  
  if (isInResetFlow) {
    return <Navigate to="/reset-password" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthStateProvider>
            <AuthInterceptor>
              <SiteIdentityProvider>
              <SiteThemeProvider>
              <SessionTimeoutProvider>
              <Routes>
              <Route path="/" element={
                <ResetFlowGuard>
                  <Index />
                </ResetFlowGuard>
              } />
              <Route path="/cart" element={
                <ResetFlowGuard>
                  <Cart />
                </ResetFlowGuard>
              } />
              <Route path="/checkout" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/order-confirmation" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <OrderConfirmation />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/auth" element={
                <ResetFlowGuard>
                  <Auth />
                </ResetFlowGuard>
              } />
              <Route path="/forgot-password" element={
                <ResetFlowGuard>
                  <ForgotPassword />
                </ResetFlowGuard>
              } />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/my-orders" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/profile" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/trusted-devices" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <TrustedDevices />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/affiliate" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <Affiliate />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              <Route path="/546498@18" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                </ResetFlowGuard>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="security" element={<AdminSecurityDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="stats" element={<AdminStats />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="discounts" element={<AdminDiscounts />} />
                <Route path="store-discount" element={<AdminStoreDiscount />} />
                <Route path="shipping-rates" element={<AdminShippingRates />} />
                <Route path="referrals" element={<AdminReferrals />} />
                <Route path="referrals/metrics" element={<AdminReferralMetrics />} />
                <Route path="influencer-metrics" element={<AdminInfluencerMetrics />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="promo-banners" element={<AdminPromoBanners />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="legal-documents" element={<AdminLegalDocuments />} />
              </Route>
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/data-rights" element={
                <ResetFlowGuard>
                  <ProtectedRoute>
                    <DataRights />
                  </ProtectedRoute>
                </ResetFlowGuard>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={
                <ResetFlowGuard>
                  <NotFound />
                </ResetFlowGuard>
              } />
              </Routes>
              <CookieBanner />
              <LegalReacceptDialog />
              </SessionTimeoutProvider>
              </SiteThemeProvider>
              </SiteIdentityProvider>
            </AuthInterceptor>
          </AuthStateProvider>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
