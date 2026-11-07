import { useState } from 'react';
import { motion,useReducedMotion } from 'motion/react';
import { Link,useParams } from 'react-router-dom';
import { ArrowLeft,ArrowRight,ArrowUpRight,Check,Heart,Minus,Plus,Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getPrice,money } from '../lib/format';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
export default function ProductPage(){
 const reduceMotion=useReducedMotion() ?? false;
 const {slug}=useParams();const {products,addToCart,toggleWishlist,isWishlisted}=useStore();const product=products.find(p=>p.slug===slug);const [active,setActive]=useState(0);const [size,setSize]=useState('M');const [color,setColor]=useState('');const [qty,setQty]=useState(1);const [showGuide,setShowGuide]=useState(false);
 if(!product)return <main className="not-found"><h1>That layer has moved.</h1><Link className="btn-dark" to="/shop">Back to the collection</Link></main>;
 const chosenColor=color||product.colors[0];const selectedColorImage=product.colorImages?.[chosenColor];const gallery=[selectedColorImage||product.images?.[0]||product.image,...(product.images||[]).filter(src=>src!==(selectedColorImage||product.images?.[0]||product.image))];const related=products.filter(p=>p.id!==product.id&&(product.related?.includes(p.id)||product.related?.includes(p.slug)||p.category===product.category)).slice(0,4);
 return <main className="product-detail-page"><div className="breadcrumbs"><Link to="/">HOME</Link><span>/</span><Link to="/shop">SHOP</Link><span>/</span><span>{product.name.toUpperCase()}</span></div><div className="product-detail-layout"><div className="detail-gallery"><div className="gallery-main"><img src={gallery[active]} alt={`${product.name} view ${active+1}`} onError={e=>{(e.currentTarget as HTMLImageElement).src='/assets/jacket-placeholder.svg';}}/><span className="gallery-count">0{active+1} / 0{gallery.length}</span><motion.button
  className={`gallery-heart ${isWishlisted(product.id)?'saved':''}`}
  aria-label={isWishlisted(product.id)?'Remove from wishlist':'Add to wishlist'}
  onClick={()=>toggleWishlist(product.id)}
  whileTap={reduceMotion?undefined:{scale:.92}}
  transition={{type:'spring',stiffness:480,damping:21}}
 >
  <motion.span
   animate={reduceMotion?undefined:(isWishlisted(product.id)?{scale:[1,1.28,1]}:{scale:1})}
   transition={{type:'spring',stiffness:520,damping:18}}
  >
   <Heart fill={isWishlisted(product.id)?'currentColor':'none'}/>
  </motion.span>
 </motion.button></div><div className="gallery-thumbs">{gallery.map((src,i)=><button key={src+i} className={active===i?'active':''} onClick={()=>setActive(i)}><img src={src} alt={`${product.name} thumbnail ${i+1}`}/></button>)}</div></div><div className="detail-info"><span className="eyebrow">{product.category.toUpperCase()} / AT-{String(product.id).padStart(3,'0')}</span><h1>{product.name}</h1><div className="detail-rating"><span>★★★★★</span><small>Customer favourite · Rating shown as a demo</small></div><div className="detail-price">{money(getPrice(product,size))}<span>INCLUSIVE OF ALL TAXES</span></div><p className="detail-description">{product.description||'A considered everyday layer, designed for an easy fit and repeat wear.'}</p><div className="detail-rule"/><div className="detail-options"><div className="option-head"><span>COLOUR</span><strong>{chosenColor}</strong></div><div className="color-selector">{product.colors.map(c=><button key={c} aria-label={c} title={c} onClick={()=>setColor(c)} className={`color-swatch color-${c.toLowerCase().replace(/[^a-z]/g,'')} ${chosenColor===c?'selected':''}`}/>)}</div></div><div className="detail-options"><div className="option-head"><span>SELECT SIZE</span><button className="text-link" onClick={()=>setShowGuide(v=>!v)}>Size guide <ArrowUpRight size={13}/></button></div><div className="size-selector">{product.sizes.map(s=><button key={s} onClick={()=>setSize(s)} className={size===s?'selected':''}>{s}</button>)}</div>{showGuide&&<div className="size-guide-inline"><strong>Find your fit</strong><p>S 36–38” chest · M 38–40” · L 40–42” · XL 42–44” · XXL 44–46”. Measurements are a starter guide; check the garment details before ordering.</p><Link to="/size-guide">Full size guide <ArrowRight size={13}/></Link></div>}</div><div className="detail-options"><div className="option-head"><span>QUANTITY</span></div><div className="qty-control large"><button onClick={()=>setQty(v=>Math.max(1,v-1))}><Minus size={15}/></button><span>{qty}</span><button onClick={()=>setQty(v=>Math.min(10,v+1))}><Plus size={15}/></button></div></div><div className="detail-buy"><motion.button
  className="btn-dark"
  onClick={()=>addToCart({id:product.id,size,color:chosenColor,quantity:qty})}
  whileTap={reduceMotion?undefined:{scale:.96}}
  transition={{type:'spring',stiffness:500,damping:22}}
 >Add to bag <ArrowUpRight size={17}/></motion.button><Link to="/checkout" className="btn-light" onClick={()=>addToCart({id:product.id,size,color:chosenColor,quantity:qty})}>Buy now</Link></div><div className="detail-delivery"><Truck size={18}/><div><strong>Delivered with care</strong><p>Enter your PIN at checkout to check serviceability and see local delivery details.</p></div></div><div className="detail-accordion"><details open><summary>THE DETAILS</summary><p>{product.fabric||'Fabric details are subject to the final product batch.'} · {product.fit||'Regular fit'} · {product.qualitySummary||product.qualityNote||'Designed for everyday wear.'}</p></details><details><summary>CARE & COMPOSITION</summary><p>{product.care||'Follow the garment care label. Spot clean where appropriate and store away from direct sunlight.'}</p></details><details><summary>SHIPPING & RETURNS</summary><p>Shipping and returns are subject to the current store policy. Visit <Link to="/policies.html">shopping information</Link> for details.</p></details></div></div></div><section className="related-products section-pad"><div className="section-heading"><div><span className="eyebrow">THE REST OF THE STORY</span><h2>You may also <em>like.</em></h2></div><Link className="text-link" to="/shop">View all <ArrowUpRight size={15}/></Link></div><div className="product-grid">{related.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div></section></main>;
}
