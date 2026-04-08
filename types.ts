
export type MediaType = 'book' | 'audio' | 'video' | 'extra';

export interface Author {
  name: string;
}

export type AccessStatus = 'active' | 'expired' | 'pending_voucher';

export type UserRole = 'admin' | 'editor' | 'viewer';

// Duration in months. UI/business rules should validate allowed range.
export type VoucherDurationMonths = number;

export type VoucherStatus = 'active' | 'redeemed' | 'expired' | 'disabled';

export type VoucherErrorCode =
  | 'invalid_code'
  | 'already_redeemed'
  | 'voucher_expired'
  | 'voucher_disabled'
  | 'not_authenticated'
  | 'unknown';

export interface Voucher {
  id: string;
  code: string;
  duration_months: VoucherDurationMonths;
  status: VoucherStatus;
  expires_at?: string | null;
  consumed_at?: string | null;
  consumed_by_user_id?: string | null;
}

export interface VoucherValidationResult {
  success: boolean;
  voucher?: Voucher;
  code?: VoucherErrorCode;
  message?: string;
}

export interface VoucherRedemptionResult {
  success: boolean;
  profile?: UserProfile;
  voucher?: Voucher;
  code?: VoucherErrorCode;
  message?: string;
  /** Collection IDs granted by this redemption (content-based vouchers) */
  grantedCollectionIds?: string[];
}

export interface RegisterWithVoucherInput {
  email: string;
  password: string;
  full_name: string;
  school_name?: string;
  voucherCode: string;
}

export interface RegisterWithVoucherResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
  message?: string;
  requiresLogin?: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  school_name: string | null;
  email: string | null;
  avatar_id: string | null; // Stores the character name (e.g. "Kaboo") or null for initials
  role?: UserRole | null;
  voucher_id?: string | null;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
  access_status?: AccessStatus | null;
}

export interface UserProgress {
  collection_id: string;
  progress_percent: number;
}

export interface CollectionResource {
  id: string;
  collection_id: string;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'zip';
  url: string;
  size: string;
}

export interface Collection {
  id: string;
  title: string;
  cover_image: string; // Mapped from DB snake_case
  level: 'Educação Infantil' | 'Fundamental I';
  progress?: number;
  duration?: string;
  current_position?: string;
  total_pages?: number;
  current_page?: number;
  color_theme?: string;

  // New fields for media files
  pdf_url?: string;
  audio_url?: string;
  video_url?: string;
}

// Extend Collection with new pedagogical fields
export interface Collection {
  theme?: string;
  learning_objectives?: string;
  characters?: string[];
  bncc_skills?: string[];
  casel_competencies?: string[];
  age_grade?: string[]; // New field: Idade-série
  extra_materials?: string[]; // New field: Materiais Extras (array of file URLs)
}

// ── Voucher Models, Batches & Grants ──────────────────────

export type VoucherPackageType = 'book' | 'collection' | 'kit' | 'curated_set';

export type VoucherModelStatus = 'draft' | 'active' | 'archived';

export type VoucherBatchStatus = 'generated' | 'exported' | 'sent' | 'confirmed' | 'cancelled';

export interface VoucherModel {
  id: string;
  name: string;
  description?: string | null;
  package_type: VoucherPackageType;
  duration_months: VoucherDurationMonths;
  redeem_by?: string | null;
  status: VoucherModelStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Populated by joins / mock — items linked to this model */
  items?: VoucherModelItem[];
}

export interface VoucherModelItem {
  id: string;
  model_id: string;
  collection_id: string;
  created_at: string;
  /** Populated by join */
  collection?: Collection;
}

export interface VoucherBatch {
  id: string;
  model_id: string;
  label?: string | null;
  quantity: number;
  status: VoucherBatchStatus;
  model_snapshot: VoucherModelSnapshot;
  exported_at?: string | null;
  exported_by?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
  sent_to?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Populated by aggregation */
  redeemed_count?: number;
  available_count?: number;
}

export interface VoucherModelSnapshot {
  name: string;
  package_type: VoucherPackageType;
  duration_months: VoucherDurationMonths;
  redeem_by?: string | null;
  items: Array<{ collection_id: string; title: string; cover_image?: string }>;
}

export interface UserContentGrant {
  id: string;
  user_id: string;
  collection_id: string;
  voucher_id?: string | null;
  granted_at: string;
  expires_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
}

// ── Screens ───────────────────────────────────────────────

export type ScreenName =
  | 'login'
  | 'forgot_password'
  | 'access_expired'
  | 'home'
  | 'search'
  | 'profile'
  | 'my_data'
  | 'details'
  | 'player_book'
  | 'player_audio'
  | 'player_video'
  | 'tools'
  | 'support'
  | 'email_confirmation'
  | 'admin';

export type AdminModule = 'collections' | 'users' | 'vouchers';

export interface NavState {
  currentScreen: ScreenName;
  params?: any;
}