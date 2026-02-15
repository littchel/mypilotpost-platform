export interface Brand {
  id: string;
  name: string;
  industry: string;
  created_at: string;
}

export interface Customer {
  brand_id: string;
  name: string;
  plan: string;
  mrr: number;
  usage_ratio: number;
  failed_delivery_rate: number;
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
