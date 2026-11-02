const API = '/api';
export class ApiError extends Error { constructor(message:string, public status:number){ super(message); this.name='ApiError'; } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('at_session');
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `Request failed (${response.status})`, response.status);
  return data as T;
}
export const pinLookup = (pin:string) => api<{pincode:string;city:string;state:string;district:string}>(`/pincode/${pin}`);
