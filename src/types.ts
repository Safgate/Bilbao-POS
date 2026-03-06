export interface Category {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number;
  image_url: string;
}

export interface Table {
  id: number;
  name: string;
  status: 'available' | 'occupied';
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  name?: string; // For UI
}

export interface Order {
  id: number;
  table_id: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  hourly_rate: number;
  monthly_salary?: number;
  /** Not returned by the API — PINs are verified server-side only */
  pin?: never;
}

export interface Shift {
  id: number;
  staff_id: number;
  start_time: string;
  end_time: string | null;
  staff_name?: string;
  hourly_rate?: number;
}
