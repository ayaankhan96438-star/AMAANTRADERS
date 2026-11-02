export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
export const getPrice = (product: { price:number; sizePrices?:Record<string,number> }, size?:string) => Number((size && product.sizePrices?.[size]) || product.price);
export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
export const safeJson = <T,>(value: string | null, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
