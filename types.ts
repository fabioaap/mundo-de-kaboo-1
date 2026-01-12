
export type MediaType = 'book' | 'audio' | 'video' | 'extra';

export interface Author {
  name: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  school_name: string | null;
  email: string | null;
  avatar_id: string | null; // Stores the character name (e.g. "Kaboo") or null for initials
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

export type ScreenName = 
  | 'login' 
  | 'forgot_password'
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
  | 'admin_collections';

export interface NavState {
  currentScreen: ScreenName;
  params?: any; 
}