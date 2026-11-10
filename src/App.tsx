import { useLayoutEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ToastHost from './components/ToastHost';
import WhatsAppFloat from './components/WhatsAppFloat';
import { UtilityNavigation } from './components/UtilityNavigation';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import { AboutPage, LookbookPage, JournalPage, SizeGuidePage, ContactPage, OrderSupportPage } from './pages/EditorialPages';
import PoliciesPage from './pages/PoliciesPage';
import './styles/index.css';
import './styles/responsive-polish.css';
import './styles/forest-sand-stage-a.css';
import './styles/forest-sand-stage-b.css';

function ScrollToTopOnPathChange() {
  const { pathname } = useLocation();

  // Run when the incoming route actually mounts, not while the outgoing page is exiting.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previousScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previousScrollBehavior;
  }, [pathname]);

  return null;
}

function StoreLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/account');
  const nativeViewUpdate = Boolean((window as Window & { __AT_PART3_VIEW_ACTIVE__?: boolean }).__AT_PART3_VIEW_ACTIVE__);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const useRouteMotion = !nativeViewUpdate && !reduceMotion;

  return (
    <>
      {!isDashboard && <Header />}
      <AnimatePresence mode={nativeViewUpdate || reduceMotion ? 'sync' : 'wait'}>
        <motion.div
          key={location.pathname}
          initial={useRouteMotion ? { opacity: 0, y: 7 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={useRouteMotion ? { opacity: 0, y: -5 } : { opacity: 1, y: 0 }}
          transition={{ duration: useRouteMotion ? 0.22 : 0 }}
        >
          <ScrollToTopOnPathChange />
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/account/:section?" element={<CustomerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/lookbook" element={<LookbookPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/size-guide" element={<SizeGuidePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/order-support" element={<OrderSupportPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/policies.html" element={<PoliciesPage />} />
            <Route path="*" element={
              <main className="not-found">
                <span className="eyebrow">404 / NOT IN THIS EDIT</span>
                <h1>Nothing to see <em>here.</em></h1>
                <a className="btn-dark" href="/">Return home</a>
              </main>
            } />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {!isDashboard && <Footer />}
      {!isDashboard && <UtilityNavigation />}
      {!isDashboard && <WhatsAppFloat />}
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <AuthProvider>
          <StoreLayout />
        </AuthProvider>
      </StoreProvider>
    </HashRouter>
  );
}
