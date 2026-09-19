export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileStatus = 'draft' | 'incomplete' | 'published' | 'suspended';
export type ProfileType = 'creator' | 'instructor' | 'entrepreneur' | 'store' | 'freelancer' | 'educator' | 'company';

export interface Profile {
  id: string; // references auth.users.id
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  language: string;
  profile_type: ProfileType;
  domain: string | null;
  primary_category: string | null;
  website_url: string | null;
  status: ProfileStatus;
  is_verified: boolean;
  subscription_plan?: 'free' | 'creator' | 'pro';
  subscription_status?: 'active' | 'inactive' | 'pending' | 'expired' | 'cancelled';
  subscription_name?: string | null;
  subscription_provider?: string | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  chariow_sale_id?: string | null;
  chariow_product_id?: string | null;
  subscription_amount?: number | null;
  subscription_currency?: string | null;
  license_key?: string | null;
  license_status?: string | null;
  currency?: string;
  preferred_currency?: string;
  metadata?: Record<string, any> | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id?: string | null;
  parent_id?: string | null;
  author_name: string;
  author_username?: string | null;
  author_avatar?: string | null;
  content: string;
  likes_count: number;
  is_creator_reply?: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at?: string;
  replies?: VideoComment[];
}

export interface ProfileSocialLink {
  id: string;
  profile_id: string;
  platform: 'youtube' | 'x' | 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'website' | 'other';
  url: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color_accent: string | null;
  display_order: number;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  external_chariow_url: string | null;
  chariow_store_id: string | null;
  api_key?: string | null;
  is_active?: boolean;
  is_connected: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  user_id: string;
  store_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  main_image_url: string | null;
  thumbnail_url: string | null;
  secondary_image_url?: string | null;
  category_id: string | null;
  external_chariow_url: string | null;
  chariow_product_id: string | null;
  status: ProductStatus;
  is_featured: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  category?: Category;
  profile?: Profile;
  store?: Store;
}

export interface Video {
  id: string;
  user_id: string;
  product_id: string | null;
  youtube_url: string;
  youtube_video_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_unlisted_demo: boolean;
  status: 'draft' | 'published' | 'archived';
  views_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations
  product?: Product;
  profile?: Profile;
}

export interface Plan {
  id: 'free' | 'creator' | 'pro';
  name: string;
  price_usd: number;
  billing_cycle: 'monthly';
  max_products: number;
  max_stores: number;
  can_have_video_demos: boolean;
  can_have_verified_badge: boolean;
  has_advanced_analytics: boolean;
  has_priority_discovery: boolean;
  features: string[];
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: 'free' | 'creator' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string | null;
  payment_provider: string | null;
  external_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  provider: string;
  provider_sale_id: string;
  product_id: string;
  plan: 'free' | 'creator' | 'pro';
  amount: number;
  currency: string;
  status: string;
  customer_email?: string | null;
  license_key?: string | null;
  raw_payload?: Record<string, any>;
  created_at: string;
  processed_at: string;
}

export type AnalyticsEventType =
  | 'product_view'
  | 'product_click'
  | 'creator_view'
  | 'video_view'
  | 'video_click'
  | 'external_click'
  | 'search'
  | 'category_view';

export interface AnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  user_id: string | null;
  creator_id: string | null;
  product_id: string | null;
  video_id: string | null;
  session_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface OnboardingProgress {
  user_id: string;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  data: Record<string, any>;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: 'product' | 'profile' | 'video';
  target_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  created_at: string;
}

export const CHARIOW_LICENSE_PRODUCTS = {
  creator: {
    id: 'prd_bqe0zdzi',
    name: 'ManuX Plan Créateur',
    price: 2.5,
    currency: 'USD',
    url: 'https://manux.mychariow.com/prd_bqe0zdzi',
  },
  pro: {
    id: 'prd_lsy7udh2',
    name: 'ManuX Plan Pro',
    price: 9.0,
    currency: 'USD',
    url: 'https://manux.mychariow.com/prd_lsy7udh2',
  },
} as const;

