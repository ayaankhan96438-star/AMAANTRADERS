import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Play, Truck, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import JacketShowcase from '../components/JacketShowcase';
import QuickView from '../components/QuickView';
import { Reveal } from '../components/Reveal';
import { useStore } from '../context/StoreContext';
import { money } from '../lib/format';
import type { Product } from '../types';
import BlurImage from '../components/BlurImage';
import { getRecentlyViewedIds } from '../lib/recentlyViewed';

const heroSlideOrder = [
  { slug: 'atlas-leather-biker', theme: 'forest' },
  { slug: 'evergreen-bomber', theme: 'brown' },
  { slug: 'heritage-varsity', theme: 'olive' },
  { slug: 'midnight-puffer', theme: 'charcoal' }
] as const;

function startingPrice(product: Product) {
  const prices = Object.values(product.sizePrices || {}).map(Number).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : Number(product.price) || 0;
}

const categories=[
 {name:'Leather',sub:'A little edge, always.',to:'/shop?category=Leather',image:'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85'},
 {name:'Bomber',sub:'The original off-duty layer.',to:'/shop?category=Bomber',image:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=85'},
 {name:'Denim',sub:'Worn in, never worn out.',to:'/shop?category=Denim',image:'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1000&q=85'},
 {name:'Winter',sub:'Warmth with a point of view.',to:'/shop?category=Puffer',image:'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=85'}
];
export default function HomePage(){
 const {products,notify}=useStore();
 const [quick,setQuick]=useState<Product|null>(null);
 const [recentIds,setRecentIds]=useState<number[]>([]);
 const [activeSlide,setActiveSlide]=useState(0);
 const [isHovered,setIsHovered]=useState(false);
 const [isFocusWithin,setIsFocusWithin]=useState(false);
 const [reduceMotion,setReduceMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const touchStartX=useRef<number|null>(null);
 const featured=products.slice(0,4);
 const newArrivals=products.filter(p=>p.newIn).slice(0,4);
 const recentlyViewed=recentIds.map(id=>products.find(product=>product.id===id)).filter((product):product is Product=>Boolean(product)).slice(0,4);
 const lookbookSlugs=['atlas-leather-biker','evergreen-bomber','raw-indigo-denim','midnight-puffer','heritage-varsity','field-utility-jacket'];
 const lookbookPicks=lookbookSlugs.map(slug=>products.find(product=>product.slug===slug)).filter((product):product is Product=>Boolean(product));
 const hero=products[0];
 const heroSlides=heroSlideOrder.map(item=>({product:products.find(p=>p.slug===item.slug),theme:item.theme})).filter((item):item is {product:Product;theme:typeof heroSlideOrder[number]['theme']}=>Boolean(item.product));
 const slideCount=heroSlides.length;
 const slide=heroSlides[activeSlide]||heroSlides[0];

 useEffect(()=>{
  setRecentIds(getRecentlyViewedIds());
 },[products]);

 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduceMotion(preference.matches);
  update();
  preference.addEventListener?.('change',update);
  return ()=>preference.removeEventListener?.('change',update);
 },[]);

 useEffect(()=>{
  if(reduceMotion||isHovered||isFocusWithin||slideCount<2)return;
  const timer=window.setInterval(()=>setActiveSlide(current=>(current+1)%slideCount),6000);
  return ()=>window.clearInterval(timer);
 },[reduceMotion,isHovered,isFocusWithin,slideCount]);

 const goToSlide=(index:number)=>{
  if(!slideCount)return;
  setActiveSlide((index+slideCount)%slideCount);
 };
 const copyCoupon=async()=>{
  try{
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText('AT10');}
   else{
    const field=document.createElement('textarea');field.value='AT10';field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
    const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Clipboard unavailable');
   }
   notify('Coupon copied','AT10 is ready to paste at checkout.');
  }catch{
   notify('Your coupon code is AT10','Copy the code to use it at checkout.','info');
  }
 };

 return <main>
  <section
   className="hero-section hero-stage"
   data-slide-theme={slide?.theme||'forest'}
   aria-label="Featured jacket collection"
   aria-roledescription="carousel"
   tabIndex={0}
   onMouseEnter={()=>setIsHovered(true)}
   onMouseLeave={()=>setIsHovered(false)}
   onFocusCapture={()=>setIsFocusWithin(true)}
   onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setIsFocusWithin(false);}}
   onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();goToSlide(activeSlide-1);}else if(event.key==='ArrowRight'){event.preventDefault();goToSlide(activeSlide+1);}}}
   onTouchStart={event=>{touchStartX.current=event.touches[0]?.clientX??null;}}
   onTouchEnd={event=>{if(touchStartX.current===null)return;const endX=event.changedTouches[0]?.clientX;const startX=touchStartX.current;touchStartX.current=null;if(endX===undefined||startX===null)return;const delta=endX-startX;if(Math.abs(delta)>44)goToSlide(activeSlide+(delta<0?1:-1));}}
  >
   <div className="hero-stage-texture" aria-hidden="true"/>
   <div className="hero-copy">
    <span className="eyebrow hero-eyebrow">FOREST &amp; SAND / THE OUTERWEAR HOUSE</span>
    <h1 id="heroTitle">Where fashion<br/><em>follows feeling.</em></h1>
    <p>Considered outerwear for wherever the day takes you. Thoughtful silhouettes, everyday confidence and room to move.</p>
    <div className="hero-actions">
     <Link to="/shop" className="btn-dark hero-primary">Explore collection <ArrowUpRight size={17}/></Link>
     <Link to="/lookbook" className="btn-outline-light">View the lookbook <Play size={13}/></Link>
    </div>
    {slide&&<div className="hero-featured-product" aria-live="off">
     <span className="hero-featured-kicker">FEATURED LAYER</span>
     <strong>{slide.product.name}</strong>
     <span className="hero-featured-price">{money(startingPrice(slide.product))}</span>
     <Link to={`/product/${slide.product.slug}`} className="hero-shop-this">Shop this <ArrowUpRight size={15}/></Link>
    </div>}
   </div>
   <div className="hero-visual-panel" aria-hidden="true">
    <div className="hero-spotlight"/>
    {slide&&<BlurImage imageClassName="hero-product-image" frameClassName="hero-product-image-frame" src={slide.product.heroImage||slide.product.images?.[0]||slide.product.image} alt="" fetchPriority="high" loading="eager"/>}
   </div>
   <div className="hero-controls" aria-label="Featured jackets controls">
    <button type="button" className="hero-arrow" aria-label="Previous featured jacket" onClick={()=>goToSlide(activeSlide-1)}><ArrowLeft size={18}/></button>
    <div className="hero-progress" role="group" aria-label="Choose featured jacket">
     {heroSlides.map((item,index)=><button key={item.product.id} type="button" className={`hero-progress-item ${index===activeSlide?'is-active':''}`} aria-label={`Show ${item.product.name}`} aria-pressed={index===activeSlide} onClick={()=>goToSlide(index)}><span/></button>)}
    </div>
    <button type="button" className="hero-arrow" aria-label="Next featured jacket" onClick={()=>goToSlide(activeSlide+1)}><ArrowRight size={18}/></button>
    <span className="hero-counter">{String(activeSlide+1).padStart(2,'0')} / {String(slideCount||4).padStart(2,'0')}</span>
   </div>
  </section>
  <section className="ticker-bar" aria-label="Brand message"><div className="ticker-track">{Array.from({length:4}).map((_,i)=><span key={i}>WHERE FASHION FOLLOWS FEELING <b>✳</b> MADE TO MOVE WITH YOU <b>✳</b> THE ART OF OUTERWEAR <b>✳</b></span>)}</div></section>
  <section className="trust-strip-stage-b" aria-label="Shopping information">
   <article className="trust-item trust-item-confirmed"><Truck size={20}/><div><strong>Free shipping above ₹2,999</strong><span>Store threshold currently shown as ₹2,999.</span></div></article>
   <article className="trust-item trust-item-todo"><RefreshCw size={20}/><div><strong>TODO: Easy returns</strong><span>Confirm return window and eligibility before enabling this claim.</span></div></article>
   <article className="trust-item trust-item-todo"><ShieldCheck size={20}/><div><strong>TODO: Secure payment</strong><span>Confirm the live payment provider and checkout protection.</span></div></article>
   <article className="trust-item trust-item-todo"><Wallet size={20}/><div><strong>TODO: Cash on delivery</strong><span>Confirm COD availability and serviceable regions.</span></div></article>
  </section>
  <section className="intro-section section-pad" id="new-season"><Reveal><div className="section-kicker"><span>01 / THE COLLECTION</span><span>DESIGNED FOR REAL LIFE</span></div><div className="intro-grid"><h2>Not just a layer.<br/><em>A point of view.</em></h2><div className="intro-side"><p>We believe the pieces you reach for most should feel like the pieces that feel most like you. Thoughtful silhouettes, everyday confidence and room to move.</p><Link className="text-link" to="/about">A little about us <ArrowUpRight size={15}/></Link></div></div></Reveal><div className="category-grid">{categories.map((cat,i)=><Reveal key={cat.name} delay={i*.07}><Link to={cat.to} className={`category-tile category-${i}`}><BlurImage src={cat.image} alt={`${cat.name} jackets`} loading="lazy" frameClassName="category-image-frame" imageClassName="category-image"/><div className="category-shade"/><div className="category-label"><span>0{i+1} / CATEGORY</span><h3>{cat.name}</h3><p>{cat.sub}</p></div><span className="round-arrow"><ArrowUpRight/></span></Link></Reveal>)}</div></section>
  <JacketShowcase product={hero} />
  <section className="product-section section-pad section-warm"><div className="section-heading"><div><span className="eyebrow">02 / EDITED FOR YOU</span><h2>Trending <em>right now.</em></h2><p>Favourites that have found their way into the everyday.</p></div><Link className="text-link" to="/shop">Shop all jackets <ArrowUpRight size={15}/></Link></div><div className="product-grid">{featured.map((p,i)=><ProductCard key={p.id} product={p} index={i} onQuickView={setQuick}/>)}</div></section>
  <section className="offer-banner"><div><span className="eyebrow">A HOUSE FAVOURITE / THE LAYER OFFER</span><h2>Make room for<br/><em>one more.</em></h2><p>Use AT10 at checkout for 10% off your order.</p></div><Link to="/shop" className="btn-dark">Find your next layer <ArrowUpRight size={16}/></Link><button type="button" className="offer-code" onClick={copyCoupon} aria-label="Copy coupon code AT10">AT10<span>CLICK TO COPY</span></button></section>
  <section className="product-section section-pad"><div className="section-heading"><div><span className="eyebrow">03 / THE HOUSE FAVOURITES</span><h2>House favourites, <em>by nature.</em></h2><p>Easy choices. Built for a life in motion.</p></div><Link className="text-link" to="/shop">Explore favourites <ArrowUpRight size={15}/></Link></div><div className="product-grid">{products.slice(8,12).map((p,i)=><ProductCard key={p.id} product={p} index={i} onQuickView={setQuick}/>)}</div></section>
  <section className="manifesto-section"><div className="manifesto-photo"><BlurImage src={hero?.images?.[1]||hero?.image} alt="Outerwear detail" loading="lazy" frameClassName="manifesto-image-frame" imageClassName="manifesto-image"/></div><div className="manifesto-copy"><span className="eyebrow">03 / OUR WAY OF THINKING</span><h2>Less, but<br/><em>with meaning.</em></h2><p>We design for repeat wears, changing plans and all the moments in between. No noise. No unnecessary. Just the right layer, at the right time.</p><Link to="/about" className="btn-dark">Meet the house <ArrowUpRight size={16}/></Link><span className="manifesto-stamp">A / T<br/>EST. 2024</span></div></section>
  <section className="product-section section-pad"><div className="section-heading"><div><span className="eyebrow">04 / JUST ARRIVED</span><h2>New in, <em>new energy.</em></h2><p>Fresh forms, familiar feeling.</p></div><Link className="text-link" to="/shop?sort=new">See new arrivals <ArrowUpRight size={15}/></Link></div><div className="product-grid">{(newArrivals.length?newArrivals:products.slice(4,8)).map((p,i)=><ProductCard key={p.id} product={p} index={i} onQuickView={setQuick}/>)}</div></section>
  <section className="quote-section"><div className="quote-mark">“</div><blockquote>Good clothes don't ask for attention.<br/><em>They earn a place in your life.</em></blockquote><span>THE AMAANTRADERS POINT OF VIEW</span></section>
  <section className="testimonials-section section-pad"><div className="section-heading"><div><span className="eyebrow">05 / WORDS FROM THE HOUSE</span><h2>Worn and <em>loved.</em></h2><p>Sample content only — replace with verified customer reviews before launch.</p></div></div><div className="testimonial-grid">{/* SAMPLE - replace with real reviews; do not present these as genuine testimonials. */}<article><span>★★★★★</span><blockquote>“The kind of jacket I reach for without thinking. It just works.”</blockquote><small>SAMPLE REVIEW / REPLACE BEFORE LAUNCH</small></article><article><span>★★★★★</span><blockquote>“The fit feels easy and the details are quietly considered.”</blockquote><small>SAMPLE REVIEW / REPLACE BEFORE LAUNCH</small></article><article><span>★★★★★</span><blockquote>“A proper everyday layer. Already part of my rotation.”</blockquote><small>SAMPLE REVIEW / REPLACE BEFORE LAUNCH</small></article></div></section>
  <section className="lookbook-mosaic-section section-pad"><div className="section-heading"><div><span className="eyebrow">06 / THE LOOKBOOK</span><h2>Layers in <em>context.</em></h2><p>Product imagery from the current preview catalogue. Replace with approved AmaanTrader photography before launch.</p></div><Link className="text-link" to="/lookbook">View the full lookbook <ArrowUpRight size={15}/></Link></div><div className="lookbook-mosaic-grid">{lookbookPicks.map((item,index)=><Link to={`/product/${item.slug}`} key={item.id} className={`lookbook-mosaic-tile lookbook-mosaic-${index+1}`}><BlurImage src={item.images?.[0]||item.image} alt={`${item.name} lookbook photograph`} loading="lazy" frameClassName="lookbook-mosaic-frame" imageClassName="lookbook-mosaic-image"/><span className="lookbook-mosaic-label"><small>0{index+1} / THE EDIT</small><strong>{item.name}</strong></span></Link>)}</div></section>
  {recentlyViewed.length>0&&<section className="product-section section-pad section-warm recently-viewed-section"><div className="section-heading"><div><span className="eyebrow">YOUR BROWSING TRAIL</span><h2>Recently <em>viewed.</em></h2><p>Saved locally on this device.</p></div></div><div className="product-grid">{recentlyViewed.map((item,index)=><ProductCard key={item.id} product={item} index={index} onQuickView={setQuick}/>)}</div></section>}
  <section className="journal-section section-pad"><div className="section-heading"><div><span className="eyebrow">05 / NOTES FROM THE HOUSE</span><h2>Stories in <em>layers.</em></h2></div><Link to="/journal" className="text-link">Read the journal <ArrowUpRight size={15}/></Link></div><div className="journal-grid"><Link to="/journal" className="journal-card"><img src={categories[0].image} alt="Leather texture" loading="lazy"/><div><span>THE MATERIAL EDIT / 04 MIN READ</span><h3>Finding your forever jacket.</h3><p>A few thoughts on texture, fit and the pieces worth keeping.</p></div></Link><Link to="/lookbook" className="journal-card"><img src={categories[2].image} alt="Denim outfit" loading="lazy"/><div><span>THE LOOKBOOK / 02 MIN READ</span><h3>Off-duty, on purpose.</h3><p>Everyday styling, with a little more intention.</p></div></Link></div></section>
  <section className="newsletter-band"><div><span className="eyebrow">THE LAYER LETTER</span><h2>A good thing, <em>occasionally.</em></h2><p>New arrivals, thoughtful edits and notes from the house. Newsletter delivery is not connected yet.</p></div><Link to="/contact" className="btn-dark">Get in touch <ArrowUpRight size={16}/></Link></section>
  <QuickView product={quick} onClose={()=>setQuick(null)}/>
 </main>;
}
