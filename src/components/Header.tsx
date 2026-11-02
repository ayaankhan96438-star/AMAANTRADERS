import { useEffect,useState } from 'react';
import { Link,NavLink,useLocation } from 'react-router-dom';
import { AnimatePresence,motion } from 'framer-motion';
import { ArrowUpRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import Brand from './Brand';
import { useStore } from '../context/StoreContext';
export default function Header(){
 const [open,setOpen]=useState(false);const [scrolled,setScrolled]=useState(false);const [searchOpen,setSearchOpen]=useState(false);const [query,setQuery]=useState('');const {cartCount,wishlist,user}=useStore();const location=useLocation();
 useEffect(()=>{setOpen(false);setSearchOpen(false);},[location.pathname]);
 useEffect(()=>{const fn=()=>setScrolled(window.scrollY>30);window.addEventListener('scroll',fn,{passive:true});fn();return()=>window.removeEventListener('scroll',fn);},[]);
 const nav=[['Shop','/shop'],['Our story','/about'],['Lookbook','/lookbook'],['Journal','/journal']];
 return <>
 <div className="topline"><span>COMPLIMENTARY SHIPPING ON ORDERS ABOVE ₹2,999</span><span className="topline-right">CONSIDERED LAYERS. EVERYDAY ICONS.</span></div>
 <header className={`site-header ${scrolled?'is-scrolled':''}`}>
  <button className="icon-button mobile-menu" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
  <Brand/>
  <nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label,to])=><NavLink key={to} to={to} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{label}</NavLink>)}</nav>
  <div className="header-actions">
   <button className="icon-button hide-small" onClick={()=>setSearchOpen(v=>!v)} aria-label="Search"><Search size={19}/></button>
   <Link to={user?'/account':'/login'} className="icon-button hide-small" aria-label="Account"><UserRound size={19}/></Link>
   <Link to="/account/wishlist" className="icon-button hide-small badge-anchor" aria-label="Wishlist"><Heart size={19}/>{wishlist.length>0&&<i>{wishlist.length}</i>}</Link>
   <Link to="/cart" className="icon-button badge-anchor" aria-label="Shopping bag"><ShoppingBag size={20}/>{cartCount>0&&<i>{cartCount}</i>}</Link>
  </div>
 </header>
 <AnimatePresence>{searchOpen&&<motion.div className="search-strip" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}><div className="search-strip-inner"><Search size={18}/><input autoFocus placeholder="Search jackets, textures, colours…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(window.location.href=`/shop?search=${encodeURIComponent(query)}`)}/><Link to={`/shop?search=${encodeURIComponent(query)}`} onClick={()=>setSearchOpen(false)}>Explore <ArrowUpRight size={15}/></Link><button className="icon-button" onClick={()=>setSearchOpen(false)}><X size={18}/></button></div></motion.div>}</AnimatePresence>
 <AnimatePresence>{open&&<><motion.button className="mobile-scrim" aria-label="Close menu" onClick={()=>setOpen(false)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.aside className="mobile-drawer" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring',damping:28,stiffness:260}}><div className="drawer-head"><Brand/><button className="icon-button" onClick={()=>setOpen(false)}><X/></button></div><div className="mobile-nav">{nav.map(([label,to],i)=><Link key={to} to={to}><span>0{i+1}</span>{label}<ArrowUpRight/></Link>)}</div><div className="mobile-drawer-bottom"><Link to="/login">Account access</Link><Link to="/contact">Get in touch</Link></div></motion.aside></>}</AnimatePresence>
 </>;
}
