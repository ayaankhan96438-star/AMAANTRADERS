import { useState } from 'react';
import type { PointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion
} from 'motion/react';
import { ArrowUpRight, Heart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import jacketPlaceholder from '../assets/jacket-placeholder.svg';
import { money } from '../lib/format';
import { useStore } from '../context/StoreContext';
export default function ProductCard({product,index=0,onQuickView}:{product:Product;index?:number;onQuickView?:(product:Product)=>void}){
 const {toggleWishlist,isWishlisted,addToCart}=useStore();
 const [image,setImage]=useState(0);
 const hero=product.images?.[0]||product.image;
 const second=product.images?.[1];
 const saved=isWishlisted(product.id);
 const reduceMotion=useReducedMotion() ?? false;

 const pointerX=useMotionValue(0);
 const pointerY=useMotionValue(0);
 const springX=useSpring(pointerX,{stiffness:260,damping:25});
 const springY=useSpring(pointerY,{stiffness:260,damping:25});
 const rotateX=useTransform(springY,[-.5,.5],[3,-3]);
 const rotateY=useTransform(springX,[-.5,.5],[-4,4]);

 const handlePointerMove=(event:PointerEvent<HTMLElement>)=>{
   if(reduceMotion || event.pointerType!=='mouse') return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(!rect.width || !rect.height) return;
   pointerX.set((event.clientX-rect.left)/rect.width-.5);
   pointerY.set((event.clientY-rect.top)/rect.height-.5);
 };

 const resetTilt=()=>{
   pointerX.set(0);
   pointerY.set(0);
 };
 return <motion.article
  className="product-card"
  style={reduceMotion?undefined:{rotateX,rotateY,transformPerspective:1000}}
  onPointerMove={handlePointerMove}
  onPointerLeave={resetTilt}
  onPointerCancel={resetTilt}
  initial={reduceMotion?false:{opacity:0,y:18}}
  whileInView={reduceMotion?undefined:{opacity:1,y:0}}
  whileHover={reduceMotion?undefined:{y:-6,transition:{type:'spring',stiffness:320,damping:24}}}
  viewport={{once:true,amount:.08}}
  transition={{duration:.5,delay:Math.min(index*.045,.22),ease:[.22,1,.36,1]}}
>
  <div className="product-card-media"><Link to={`/product/${product.slug}`} className="product-image-link"><motion.img
    src={image===0?hero:(second||hero)}
    alt={product.name}
    loading="lazy"
    whileHover={reduceMotion?undefined:{scale:1.045}}
    transition={{duration:.42,ease:[.22,1,.36,1]}}
    onError={e=>{(e.currentTarget as HTMLImageElement).src=jacketPlaceholder;}}
   /><span className="image-index">0{image+1} / 0{second?2:1}</span></Link>
   {product.badge&&<span className="product-badge">{product.badge}</span>}
   <motion.button
    className={`wishlist-btn ${saved?'is-saved':''}`}
    onClick={()=>toggleWishlist(product.id)}
    aria-label={saved?'Remove from wishlist':'Add to wishlist'}
    whileTap={reduceMotion?undefined:{scale:.92}}
    transition={{type:'spring',stiffness:480,damping:21}}
   >
    <motion.span
     animate={reduceMotion?undefined:(saved?{scale:[1,1.28,1]}:{scale:1})}
     transition={{type:'spring',stiffness:520,damping:18}}
    >
     <Heart size={17} fill={saved?'currentColor':'none'}/>
    </motion.span>
   </motion.button>
   <div className="card-hover-actions"><button onClick={()=>onQuickView?.(product)}>Quick view <ArrowUpRight size={15}/></button><motion.button
    aria-label="Add to bag"
    onClick={()=>addToCart({id:product.id,size:product.sizes?.[0]||'M',color:product.colors?.[0]||'Black',quantity:1})}
    whileTap={reduceMotion?undefined:{scale:.90}}
    transition={{type:'spring',stiffness:500,damping:21}}
   ><Plus size={17}/></motion.button></div>
   {second&&<div className="view-dots"><button className={image===0?'selected':''} onClick={()=>setImage(0)} aria-label="First product image"/><button className={image===1?'selected':''} onClick={()=>setImage(1)} aria-label="Second product image"/></div>}
  </div>
  <div className="product-card-info"><div><Link to={`/product/${product.slug}`} className="product-card-name">{product.name}</Link><span className="product-category">{product.category}</span></div><div className="product-card-price"><strong>{money(product.price)}</strong>{product.originalPrice&&<del>{money(Number(product.originalPrice))}</del>}</div></div>
  <div className="product-colors"><div>{(product.colors||[]).slice(0,4).map(c=><span title={c} key={c} className={`swatch swatch-${c.toLowerCase().replace(/[^a-z]/g,'')}`}/>)}</div><span>{product.colors?.length||0} colours</span></div>
 </motion.article>;
}
