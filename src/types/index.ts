export type GalleryView = {
  src: string;
  label?: string;
  kind?: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  colors: string[];
  sizes: string[];
  fit?: string;
  fabric?: string;
  care?: string;
  model?: string;
  stock?: number | null;
  description?: string;
  image: string;
  images?: string[];
  colorImages?: Record<string, string | undefined>;
  related?: Array<number | string>;
  newIn?: boolean;
  sizePrices?: Record<string, number>;
  galleryViews?: GalleryView[];
  qualityNote?: string;
  qualitySummary?: string;
  imageSourceNote?: string;
  galleryNote?: string;
  model3d?: string;
  explodedView?: string;
};

export type CartLine = {
  id: number;
  size: string;
  color: string;
  quantity: number;
};

export type User = {
  name: string;
  email: string;
};

export type Toast = {
  id: number;
  title: string;
  message?: string;
  tone?: 'success' | 'error' | 'info';
};

export type OrderRecord = {
  id: string;
  date: string;
  status: string;
  paymentStatus: string;
  total: number;
  items: CartLine[];
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    pincode: string;
  };
};
