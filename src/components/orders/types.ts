export interface OrderItem {
  product_id: string;
  product_name: string;
  variation_id: string | null;
  variation_name: string | null;
  quantity: number;
  price: number;
  total: number;
  purity_percentage?: number;
  product_image?: string | null;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_barangay: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_country: string;
  shipping_location: string | null;
  shipping_fee: number | null;
  order_items: OrderItem[];
  total_price: number;
  payment_method_id: string | null;
  payment_method_name: string | null;
  payment_proof_url: string | null;
  contact_method: string | null;
  order_status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  shipping_provider: string | null;
  shipping_note: string | null;
  promo_code: string | null;
  discount_applied: number | null;
  points_redeemed: number | null;
  order_number: string | null;
}
