import { HashRouter,Route,Routes,useLocation } from 'react-router-dom';
import { AnimatePresence,motion } from 'motion/react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ToastHost from './components/ToastHost';
import { UtilityNavigation } from './components/UtilityNavigation';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { LoginPage,RegisterPage,ForgotPasswordPage } from './pages/AuthPages';
import { AboutPage,LookbookPage,JournalPage,SizeGuidePage,ContactPage,OrderSupportPage } from './pages/EditorialPages';
import PoliciesPage from './pages/PoliciesPage';
import './styles/index.css';
import './styles/responsive-polish.css';
function StoreLayout(){const location=useLocation();const isDashboard=location.pathname.startsWith('/admin')||location.pathname.startsWith('/account');return <>{!isDashboard&&<Header/>}<AnimatePresence mode="wait"><motion.div key={location.pathname+location.search} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.22}}>{<Routes location={location}><Route path="/" element={<HomePage/>}/><Route path="/shop" element={<ShopPage/>}/><Route path="/product/:slug" element={<ProductPage/>}/><Route path="/cart" element={<CartPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/order-confirmation/:id" element={<OrderConfirmationPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/account/:section?" element={<CustomerDashboard/>}/><Route path="/admin" element={<AdminDashboard/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/lookbook" element={<LookbookPage/>}/><Route path="/journal" element={<JournalPage/>}/><Route path="/size-guide" element={<SizeGuidePage/>}/><Route path="/contact" element={<ContactPage/>}/><Route path="/order-support" element={<OrderSupportPage/>}/><Route path="/policies" element={<PoliciesPage/>}/><Route path="/policies.html" element={<PoliciesPage/>}/><Route path="*" element={<main className="not-found"><span className="eyebrow">404 / NOT IN THIS EDIT</span><h1>Nothing to see <em>here.</em></h1><a className="btn-dark" href="/">Return home</a></main>}/></Routes>}</motion.div></AnimatePresence>{!isDashboard&&<Footer/>}{!isDashboard&&<UtilityNavigation/>}<ToastHost/></>}
export default function App(){return <HashRouter><StoreProvider><AuthProvider><StoreLayout/></AuthProvider></StoreProvider></HashRouter>}
