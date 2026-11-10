import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Heart, Minus, Plus, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getPrice, money } from '../lib/format';
import ProductCard from '../components/ProductCard';
import BlurImage from '../components/BlurImage';
import { rememberProduct } from '../lib/recentlyViewed';

const SIZE_ROWS = [
  ['S', '36–38', '16–17'],
  ['M', '38–40', '17–18'],
  ['L', '40–42', '18–19'],
  ['XL', '42–44', '19–20'],
  ['XXL', '44–46', '20–21']
];

export default function ProductPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const { slug } = useParams();
  const { products, addToCart, toggleWishlist, isWishlisted } = useStore();
  const product = products.find(item => item.slug === slug);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [showStickyAdd, setShowStickyAdd] = useState(false);
  const buyRef = useRef<HTMLDivElement | null>(null);
  const chosenColor = color || product?.colors?.[0] || '';

  useEffect(() => {
    if (product) rememberProduct(product.id);
  }, [product?.id]);

  useEffect(() => {
    const target = buyRef.current;
    if (!product || !target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      setShowStickyAdd(!(entries[0]?.isIntersecting ?? true));
    }, { threshold: 0.08 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [product?.id]);

  useEffect(() => {
    setActive(0);
  }, [chosenColor]);

  useEffect(() => {
    if (!showGuide) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowGuide(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showGuide]);

  if (!product) {
    return <main className="not-found"><h1>That layer has moved.</h1><Link className="btn-dark" to="/shop">Back to the collection</Link></main>;
  }

  const selectedColorImage = product.colorImages?.[chosenColor];
  const firstImage = selectedColorImage || product.images?.[0] || product.image;
  const gallery = [firstImage, ...(product.images || []).filter(src => src !== firstImage)];
  const related = products
    .filter(item => item.id !== product.id && (product.related?.includes(item.id) || product.related?.includes(item.slug) || item.category === product.category))
    .slice(0, 4);
  const selectedPrice = getPrice(product, size);

  return (
    <>
      <main className="product-detail-page">
        <div className="breadcrumbs"><Link to="/">HOME</Link><span>/</span><Link to="/shop">SHOP</Link><span>/</span><span>{product.name.toUpperCase()}</span></div>
        <div className="product-detail-layout">
          <div className="detail-gallery">
            <div className="gallery-main">
              <BlurImage src={gallery[active]} alt={`${product.name} view ${active + 1}`} imageClassName="detail-main-photo" frameClassName="detail-main-photo-frame" />
              <span className="gallery-count">0{active + 1} / 0{gallery.length}</span>
              <motion.button
                className={`gallery-heart ${isWishlisted(product.id) ? 'saved' : ''}`}
                aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                onClick={() => toggleWishlist(product.id)}
                whileTap={reduceMotion ? undefined : { scale: .92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 21 }}
              >
                <motion.span
                  animate={reduceMotion ? undefined : (isWishlisted(product.id) ? { scale: [1, 1.28, 1] } : { scale: 1 })}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                >
                  <Heart fill={isWishlisted(product.id) ? 'currentColor' : 'none'} />
                </motion.span>
              </motion.button>
            </div>
            <div className="gallery-thumbs">
              {gallery.map((src, index) => (
                <button key={`${src}-${index}`} className={active === index ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Show product image ${index + 1}`}>
                  <BlurImage src={src} alt={`${product.name} thumbnail ${index + 1}`} imageClassName="detail-thumb-photo" frameClassName="detail-thumb-photo-frame" />
                </button>
              ))}
            </div>
          </div>

          <div className="detail-info">
            <span className="eyebrow">{product.category.toUpperCase()} / AT-{String(product.id).padStart(3, '0')}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating"><span>★★★★★</span><small>Customer favourite · Rating shown as a demo</small></div>
            <div className="detail-price">{money(selectedPrice)}<span>INCLUSIVE OF ALL TAXES</span></div>
            <p className="detail-description">{product.description || 'A considered everyday layer, designed for an easy fit and repeat wear.'}</p>
            <div className="detail-rule" />

            <div className="detail-options">
              <div className="option-head"><span>COLOUR</span><strong>{chosenColor}</strong></div>
              <div className="color-selector">
                {product.colors.map(item => (
                  <button key={item} aria-label={item} title={item} onClick={() => setColor(item)} className={`color-swatch color-${item.toLowerCase().replace(/[^a-z]/g, '')} ${chosenColor === item ? 'selected' : ''}`} />
                ))}
              </div>
            </div>

            <div className="detail-options">
              <div className="option-head">
                <span>SELECT SIZE</span>
                <button className="text-link" onClick={() => setShowGuide(true)} aria-expanded={showGuide} aria-controls="stageb-size-guide">Size guide <ArrowUpRight size={13} /></button>
              </div>
              <div className="size-selector">
                {product.sizes.map(item => <button key={item} onClick={() => setSize(item)} className={size === item ? 'selected' : ''} aria-pressed={size === item}>{item}</button>)}
              </div>
            </div>

            <div className="detail-options">
              <div className="option-head"><span>QUANTITY</span></div>
              <div className="qty-control large">
                <button onClick={() => setQty(value => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty(value => Math.min(10, value + 1))} aria-label="Increase quantity"><Plus size={15} /></button>
              </div>
            </div>

            <div className="detail-buy" ref={buyRef}>
              <motion.button
                className="btn-dark"
                onClick={() => addToCart({ id: product.id, size, color: chosenColor, quantity: qty })}
                whileTap={reduceMotion ? undefined : { scale: .96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >Add to bag <ArrowUpRight size={17} /></motion.button>
              <Link to="/checkout" className="btn-light" onClick={() => addToCart({ id: product.id, size, color: chosenColor, quantity: qty })}>Buy now</Link>
            </div>

            <div className="detail-delivery"><Truck size={18} /><div><strong>Delivered with care</strong><p>Enter your PIN at checkout to check serviceability and see local delivery details.</p></div></div>
            <div className="detail-accordion">
              <details open><summary>THE DETAILS</summary><p>{product.fabric || 'Fabric details are subject to the final product batch.'} · {product.fit || 'Regular fit'} · {product.qualitySummary || product.qualityNote || 'Designed for everyday wear.'}</p></details>
              <details><summary>CARE &amp; COMPOSITION</summary><p>{product.care || 'Follow the garment care label. Spot clean where appropriate and store away from direct sunlight.'}</p></details>
              <details><summary>SHIPPING &amp; RETURNS</summary><p>Shipping and returns are subject to the current store policy. Visit <Link to="/policies">shopping information</Link> for details.</p></details>
            </div>
          </div>
        </div>

        <section className="related-products section-pad">
          <div className="section-heading"><div><span className="eyebrow">THE REST OF THE STORY</span><h2>You may also <em>like.</em></h2></div><Link className="text-link" to="/shop">View all <ArrowUpRight size={15} /></Link></div>
          <div className="product-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div>
        </section>
      </main>

      {showStickyAdd && (
        <div className="product-sticky-bar" role="region" aria-label="Quick add to bag">
          <div><span>{product.name}</span><strong>{money(selectedPrice)}</strong></div>
          <button type="button" className="btn-dark" onClick={() => addToCart({ id: product.id, size, color: chosenColor, quantity: qty })}>Add to bag <ArrowUpRight size={16} /></button>
        </div>
      )}

      {showGuide && (
        <div className="stageb-drawer-layer">
          <button className="stageb-drawer-scrim" type="button" aria-label="Close size guide" onClick={() => setShowGuide(false)} />
          <aside className="stageb-size-drawer" id="stageb-size-guide" role="dialog" aria-modal="true" aria-labelledby="stageb-size-title">
            <div className="stageb-drawer-head"><div><span className="eyebrow">FIT NOTES / {product.name.toUpperCase()}</span><h2 id="stageb-size-title">Find your <em>fit.</em></h2></div><button type="button" className="stageb-drawer-close" onClick={() => setShowGuide(false)} aria-label="Close size guide"><X /></button></div>
            <p className="stageb-size-note">General starter reference only. Product-specific garment measurements have not been supplied for every jacket; compare with a jacket you already own and confirm the fit before ordering.</p>
            <div className="stageb-size-table" role="table" aria-label="General jacket size reference">
              <div role="row"><strong role="columnheader">SIZE</strong><strong role="columnheader">CHEST (IN)</strong><strong role="columnheader">SHOULDER (IN)</strong></div>
              {SIZE_ROWS.map(row => <div role="row" key={row[0]}><strong role="cell">{row[0]}</strong><span role="cell">{row[1]}</span><span role="cell">{row[2]}</span></div>)}
            </div>
            <div className="stageb-size-tip"><strong>How to check</strong><p>Measure a jacket that fits the way you like. Compare chest and shoulder measurements, and check the product's fit note before choosing.</p></div>
            <Link to="/size-guide" className="btn-dark" onClick={() => setShowGuide(false)}>Full size guide <ArrowRight size={15} /></Link>
          </aside>
        </div>
      )}
    </>
  );
}
