export type UserRole = 'super_admin' | 'manager' | 'consultant'
export type LocationType = 'main' | 'satellite'
export type FuelType = 'benzin' | 'dizel' | 'hybrid' | 'elektrik' | 'lpg' | 'diger'
export type TransmissionType = 'manuel' | 'otomatik' | 'yari_otomatik'
export type ContactOutcome = 'positive' | 'neutral' | 'negative' | 'no_answer'
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export interface Location {
  id: string
  name: string
  type: LocationType
  address: string | null
  phone: string | null
  created_at: string
}

export interface Brand {
  id: string
  name: string
  slug: string
  color: string
  text_color: string
  icon_name: string | null
  is_active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  location_id: string
  is_active: boolean
  avatar_url: string | null
  created_at: string
  created_by: string | null
  // Joins
  location?: Location
}

export interface ContactChannel {
  id: string
  name: string
  slug: string
  icon_name: string
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface SalesStage {
  id: string
  name: string
  slug: string
  description: string | null
  icon_name: string
  color: string
  sort_order: number
  is_final: boolean
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  full_name: string
  phone: string
  phone_alt: string | null
  email: string | null
  tc_no: string | null
  birth_date: string | null
  address: string | null
  city: string | null
  district: string | null
  brand_id: string
  source_channel_id: string | null
  interested_model: string | null
  notes: string | null
  consultant_id: string | null
  location_id: string
  current_stage_id: string | null
  is_active: boolean
  is_won: boolean
  is_lost: boolean
  lost_reason: string | null
  created_at: string
  created_by: string
  updated_at: string
  // Joins
  brand?: Brand
  source_channel?: ContactChannel
  consultant?: UserProfile
  location?: Location
  current_stage?: SalesStage
}

export interface CustomerStageHistory {
  id: string
  customer_id: string
  stage_id: string
  note: string | null
  entered_at: string
  entered_by: string
  // Joins
  stage?: SalesStage
  entered_by_profile?: UserProfile
}

export interface ContactLog {
  id: string
  customer_id: string
  channel_id: string
  contact_date: string
  duration_minutes: number | null
  note: string | null
  outcome: ContactOutcome | null
  next_action: string | null
  next_action_date: string | null
  created_at: string
  created_by: string
  // Joins
  channel?: ContactChannel
  created_by_profile?: UserProfile
}

export interface VehicleInterest {
  id: string
  customer_id: string
  brand_id: string
  model: string
  year: number | null
  color: string | null
  fuel_type: FuelType | null
  transmission: TransmissionType | null
  budget_min: number | null
  budget_max: number | null
  offered_price: number | null
  notes: string | null
  created_at: string
  created_by: string
  // Joins
  brand?: Brand
}

export interface Offer {
  id: string
  customer_id: string
  vehicle_interest_id: string | null
  offer_number: string
  brand_id: string
  model: string
  year: number | null
  color: string | null
  list_price: number
  discount_amount: number
  discount_rate: number
  final_price: number
  status: OfferStatus
  valid_until: string | null
  notes: string | null
  finalized_at: string | null
  finalized_by: string | null
  created_at: string
  created_by: string
  location_id: string
  // Joins
  brand?: Brand
  customer?: Customer
}

// Dashboard / Report types
export interface BrandFunnelData {
  brand: Brand
  stages: {
    stage: SalesStage
    count: number
  }[]
  total: number
  won: number
  lost: number
}

export interface HeatmapCell {
  day: number    // 0 = Pazartesi, 6 = Pazar
  hour: number   // 0-23
  count: number
}

export interface ChannelStats {
  channel: ContactChannel
  count: number
  percentage: number
}
