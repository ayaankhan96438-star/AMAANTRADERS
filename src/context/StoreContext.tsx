import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CartLine, Product, Toast, User } from '../types';
import productsData from '../data/products.json';
import { safeJson } from '../lib/format';

const catalog = productsData as Product[];
type StoreValue = {
  products: Product[]; setProducts:(products:Product[])=>void; cart: CartLine[]; wishlist: number[]; user: User | null; toast: Toast | null;
  cartCount: number; cartSubtotal: number; addToCart:(line:CartLine)=>void; updateQty:(line:CartLine,qty:number)=>void;
  removeFromCart:(line:CartLine)=>void; clearCart:()=>void; toggleWishlist:(id:number)=>void; isWishlisted:(id:number)=>boolean;
  notify:(title:string,message?:string,tone?:Toast['tone'])=>void; setUser:(user:User|null)=>void;
};
const StoreContext = createContext<StoreValue | null>(null);
const keyOf = (line:CartLine) => `${line.id}:${line.size}:${line.color}`;
export function StoreProvider({children}:{children:ReactNode}) {
  const [products,setProductsState] = useState<Product[]>(()=>safeJson(localStorage.getItem('at_admin_products'),catalog));
  const setProducts = (next:Product[]) => { setProductsState(next); localStorage.setItem('at_admin_products',JSON.stringify(next)); };
  const [cart,setCart] = useState<CartLine[]>(()=>safeJson(localStorage.getItem('at_cart'),[]));
  const [wishlist,setWishlist] = useState<number[]>(()=>safeJson(localStorage.getItem('at_wishlist'),[]));
  const [user,setUserState] = useState<User|null>(()=>safeJson(sessionStorage.getItem('at_user'),null));
  const [toast,setToast] = useState<Toast|null>(null);
  const notify = useCallback((title:string,message?:string,tone:Toast['tone']='success')=>{
    const next={id:Date.now(),title,message,tone}; setToast(next); window.setTimeout(()=>setToast(current=>current?.id===next.id?null:current),3400);
  },[]);
  const persistCart = (next:CartLine[]) => { setCart(next); localStorage.setItem('at_cart',JSON.stringify(next)); };
  const addToCart = (line:CartLine) => {
    const next=[...cart]; const found=next.find(x=>keyOf(x)===keyOf(line));
    if(found) found.quantity=Math.min(10,found.quantity+line.quantity); else next.push(line);
    persistCart(next); notify('Added to your bag','Your new layer is waiting in the bag.');
  };
  const updateQty = (line:CartLine,qty:number) => persistCart(cart.map(x=>keyOf(x)===keyOf(line)?{...x,quantity:Math.max(1,Math.min(10,qty))}:x));
  const removeFromCart = (line:CartLine) => persistCart(cart.filter(x=>keyOf(x)!==keyOf(line)));
  const clearCart = () => persistCart([]);
  const toggleWishlist = (id:number) => {
    const next=wishlist.includes(id)?wishlist.filter(x=>x!==id):[...wishlist,id]; setWishlist(next); localStorage.setItem('at_wishlist',JSON.stringify(next));
    notify(wishlist.includes(id)?'Removed from wishlist':'Saved for later');
  };
  const setUser = (next:User|null) => { setUserState(next); if(next) sessionStorage.setItem('at_user',JSON.stringify(next)); else sessionStorage.removeItem('at_user'); };
  const cartSubtotal=cart.reduce((sum,line)=>{const p=products.find(x=>x.id===line.id);return sum+(p?Number(p.sizePrices?.[line.size]||p.price)*line.quantity:0);},0);
  const value=useMemo(()=>({products,setProducts,cart,wishlist,user,toast,cartCount:cart.reduce((s,x)=>s+x.quantity,0),cartSubtotal,addToCart,updateQty,removeFromCart,clearCart,toggleWishlist,isWishlisted:(id:number)=>wishlist.includes(id),notify,setUser}),[products,cart,wishlist,user,toast,cartSubtotal]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error('useStore must be used inside StoreProvider');return value;}
