import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Heart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import jacketPlaceholder from '../assets/jacket-placeholder.svg';
import { money } from '../lib/format';
import { useStore } from '../context/StoreContext';
export default function ProductCard({product,index=0,onQuickView}:{product:Product;index?:number;onQuickView?:(product:Product)=>void}){
 const {toggleWishlist,isWishlisted,addToCart}=useStore();const [image,setImage]=useState(0);const hero=product.images?.[0]||product.image;const second=product.images?.[1];const saved=isWishlisted(product.id);
 return <motion.article className="product-card" initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.08}} transition={{duration:.55,delay:Math.min(index*.045,.22)}}>
  <div className="product-card-media"><Link to={`/product/${product.slug}`} className="product-image-link"><img src={image===0?hero:(second||hero)} alt={product.name} loading="lazy" onError={e=>{(e.currentTarget as HTMLImageElement).src=jacketPlaceholder;}}/><span className="image-index">0{image+1} / 0{second?2:1}</span></Link>
   {product.badge&&<span className="product-badge">{product.badge}</span>}
   <button className={`wishlist-btn ${saved?'is-saved':''}`} onClick={()=>toggleWishlist(product.id)} aria-label={saved?'Remove from wishlist':'Add to wishlist'}><Heart size={17} fill={saved?'currentColor':'none'}/></button>
   <div className="card-hover-actions"><button onClick={()=>onQuickView?.(product)}>Quick view <ArrowUpRight size={15}/></button><button aria-label="Add to bag" onClick={()=>addToCart({id:product.id,size:product.sizes?.[0]||'M',color:product.colors?.[0]||'Black',quantity:1})}><Plus size={17}/></button></div>
   {second&&<div className="view-dots"><button className={image===0?'selected':''} onClick={()=>setImage(0)} aria-label="First product image"/><button className={image===1?'selected':''} onClick={()=>setImage(1)} aria-label="Second product image"/></div>}
  </div>
  <div className="product-card-info"><div><Link to={`/product/${product.slug}`} className="product-card-name">{product.name}</Link><span className="product-category">{product.category}</span></div><div className="product-card-price"><strong>{money(product.price)}</strong>{product.originalPrice&&<del>{money(Number(product.originalPrice))}</del>}</div></div>
  <div className="product-colors"><div>{(product.colors||[]).slice(0,4).map(c=><span title={c} key={c} className={`swatch swatch-${c.toLowerCase().replace(/[^a-z]/g,'')}`}/>)}</div><span>{product.colors?.length||0} colours</span></div>
 </motion.article>;
}
