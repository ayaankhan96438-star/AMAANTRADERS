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
import BlurImage from './BlurImage';
import { getPrice, money } from '../lib/format';
import { useStore } from '../context/StoreContext';

export default function ProductCard({product,index=0,onQuickView}:{product:Product;index?:number;onQuickView?:(product:Product)=>void}){
 const {toggleWishlist,isWishlisted,addToCart}=useStore();
 const [image,setImage]=useState(0);
 const firstImage=product.images?.[0]||product.image;
 const secondImage=product.images?.[1];
 const saved=isWishlisted(product.id);
 const reduceMotion=useReducedMotion() ?? false;
 const availableCardSizes=['S','M','L','XL'].filter(size=>(product.sizes||[]).includes(size));
 const price=product.sizes?.length
   ? Math.min(...product.sizes.map(size=>getPrice(product,size)))
   : Number(product.price)||0;
 const originalPrice=Number(product.originalPrice)||0;
 const discount=originalPrice>price?Math.round((originalPrice-price)/originalPrice*100):0;

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

 const selectSecondImage=()=>{if(secondImage)setImage(1);};
 const selectFirstImage=()=>setImage(0);
 const activeImage=image===1&&secondImage?secondImage:firstImage;

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
  <div className="product-card-media">
   <Link
    to={`/product/${product.slug}`}
    className="product-image-link"
    onMouseEnter={selectSecondImage}
    onMouseLeave={selectFirstImage}
    onFocus={selectSecondImage}
    onBlur={selectFirstImage}
   >
    <BlurImage
      src={activeImage}
      alt={product.name}
      loading="lazy"
      frameClassName="product-card-image-frame"
      imageClassName="product-card-photo"
    />
    <span className="image-index">0{image+1} / 0{secondImage?2:1}</span>
   </Link>
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
   <div className="card-hover-actions">
    <button onClick={()=>onQuickView?.(product)}>Quick view <ArrowUpRight size={15}/></button>
    <motion.button
     aria-label="Add to bag"
     onClick={()=>addToCart({id:product.id,size:product.sizes?.[0]||'M',color:product.colors?.[0]||'Black',quantity:1})}
     whileTap={reduceMotion?undefined:{scale:.90}}
     transition={{type:'spring',stiffness:500,damping:21}}
    ><Plus size={17}/></motion.button>
   </div>
   {secondImage&&<div className="view-dots"><button className={image===0?'selected':''} onClick={selectFirstImage} aria-label="First product image"/><button className={image===1?'selected':''} onClick={selectSecondImage} aria-label="Second product image"/></div>}
  </div>
  <div className="product-card-info">
   <div><Link to={`/product/${product.slug}`} className="product-card-name">{product.name}</Link><span className="product-category">{product.category}</span></div>
   <div className="product-card-price"><strong>{money(price)}</strong>{discount>0&&<><del>{money(originalPrice)}</del><span className="product-discount-badge">{discount}% OFF</span></>}</div>
  </div>
  <div className="product-size-chips" aria-label={`Available sizes: ${availableCardSizes.join(', ')||'Not specified'}`}>
   {availableCardSizes.map(size=><span key={size}>{size}</span>)}
  </div>
  <div className="product-colors"><div>{(product.colors||[]).slice(0,4).map(c=><span title={c} key={c} className={`swatch swatch-${c.toLowerCase().replace(/[^a-z]/g,'')}`}/>)}</div><span>{product.colors?.length||0} colours</span></div>
 </motion.article>;
}
