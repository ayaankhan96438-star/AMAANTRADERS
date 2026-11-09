import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import QuickView from '../components/QuickView';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

type LayoutBridge = (commit: () => void) => void;

export default function ShopPage() {
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || 'All');
  const [sort, setSort] = useState(params.get('sort') || 'featured');
  const [maxPrice, setMaxPrice] = useState(1600);
  const [color, setColor] = useState('All');
  const [size, setSize] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);

  // animateLayout measures the old positions before this synchronous React commit.
  const runShopLayout = (update: () => void) => {
    const commit = () => flushSync(update);
    const bridge = (window as Window & { __AT_PART3_LAYOUT__?: LayoutBridge }).__AT_PART3_LAYOUT__;
    if (typeof bridge === 'function') bridge(commit);
    else commit();
  };

  // Header search and category links can change the URL without remounting ShopPage.
  useEffect(() => {
    const nextSearch = params.get('search') || '';
    const nextCategory = params.get('category') || 'All';
    const nextSort = params.get('sort') || 'featured';
    if (nextSearch === search && nextCategory === category && nextSort === sort) return;

    const frame = requestAnimationFrame(() => {
      runShopLayout(() => {
        setSearch(nextSearch);
        setCategory(nextCategory);
        setSort(nextSort);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [params]);

  const cats = ['All', ...Array.from(new Set(products.map((product) => product.category)))];
  const colors = ['All', ...Array.from(new Set(products.flatMap((product) => product.colors || [])))];

  const filtered = useMemo(() => {
    const result = products.filter((product) =>
      (category === 'All' ||
        product.category.toLowerCase().includes(category.toLowerCase()) ||
        product.name.toLowerCase().includes(category.toLowerCase())) &&
      product.name.toLowerCase().includes(search.toLowerCase()) &&
      product.price <= maxPrice &&
      (color === 'All' || product.colors.includes(color)) &&
      (size === 'All' || product.sizes.includes(size))
    );

    if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
    if (sort === 'new') result.sort((a, b) => Number(Boolean(b.newIn)) - Number(Boolean(a.newIn)));
    return result;
  }, [products, category, search, maxPrice, color, size, sort]);

  const reset = () => {
    runShopLayout(() => {
      setCategory('All');
      setColor('All');
      setSize('All');
      setMaxPrice(1600);
      setSearch('');
      setSort('featured');
      setParams({});
    });
  };

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <span className="eyebrow">THE COMPLETE EDIT / 2026</span>
        <h1>Find your <em>layer.</em></h1>
        <p>Pieces with purpose. Shapes with stayingpower. Made to meet you where you are.</p>
        <div className="shop-count">{products.length} PIECES / ENDLESS WAYS TO WEAR</div>
      </section>

      <section className="shop-layout section-pad">
        <aside className={`filter-panel ${filtersOpen ? 'filter-open' : ''}`}>
          <div className="filter-title">
            <span><Filter size={16} /> FILTER THE EDIT</span>
            <button onClick={() => setFiltersOpen(false)} className="mobile-only" aria-label="Close filters"><X /></button>
          </div>

          <div className="filter-group">
            <span className="field-label">CATEGORY</span>
            {cats.map((item) => (
              <button
                key={item}
                className={`filter-option ${category === item ? 'active' : ''}`}
                onClick={() => runShopLayout(() => {
                  setCategory(item);
                  setParams(item === 'All' ? {} : { category: item });
                })}
              >
                {item}
                <span>{item === 'All' ? products.length : products.filter((product) => product.category === item).length}</span>
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="field-label">COLOUR</span>
            <select className="select-control" value={color} onChange={(event) => {
              const value = event.target.value;
              runShopLayout(() => setColor(value));
            }}>
              {colors.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <span className="field-label">SIZE</span>
            <select className="select-control" value={size} onChange={(event) => {
              const value = event.target.value;
              runShopLayout(() => setSize(value));
            }}>
              {['All', 'S', 'M', 'L', 'XL', 'XXL'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <div className="price-filter-label">
              <span className="field-label">PRICE RANGE</span>
              <strong>₹{maxPrice.toLocaleString('en-IN')}</strong>
            </div>
            <input type="range" min="700" max="1600" step="50" value={maxPrice} onChange={(event) => {
              const value = Number(event.target.value);
              runShopLayout(() => setMaxPrice(value));
            }} />
            <div className="range-labels"><span>₹700</span><span>₹1,600+</span></div>
          </div>

          <button className="text-link filter-reset" onClick={reset}>Reset all filters <X size={14} /></button>
        </aside>

        <div className="shop-results">
          <div className="shop-toolbar">
            <label className="shop-search">
              <Search size={17} />
              <input value={search} onChange={(event) => {
                const value = event.target.value;
                runShopLayout(() => setSearch(value));
              }} placeholder="Search the collection…" />
            </label>
            <div className="shop-toolbar-right">
              <button className="filter-mobile-trigger" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filter</button>
              <span>{filtered.length} RESULTS</span>
              <select value={sort} onChange={(event) => {
                const value = event.target.value;
                runShopLayout(() => setSort(value));
              }}>
                <option value="featured">Featured</option>
                <option value="new">New arrivals</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </div>
          </div>

          {filtered.length ? (
            <div className="product-grid shop-product-grid">
              {filtered.map((product, index) => (
                <div className="shop-layout-item" data-layout key={product.id}>
                  <ProductCard product={product} index={index} onQuickView={setQuick} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>NOTHING IN THIS EDIT</span>
              <h2>No jackets found.</h2>
              <p>Try another search or loosen your filters.</p>
              <button className="btn-dark" onClick={reset}>Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </main>
  );
}
