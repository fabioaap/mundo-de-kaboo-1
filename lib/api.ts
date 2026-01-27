import { supabase } from './supabase';
import { Collection, CollectionResource, UserProfile } from '../types';
import { logger } from './logger';

// Cache management for collections
const COLLECTIONS_CACHE_KEY = 'kaboo_collections_cache';
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_KEY = 'kaboo_session_id';

// Get or create session ID (unique per browser session)
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// Clear collections cache
export const clearCollectionsCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
  }
};

// Clear profile cache
export const clearProfileCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  }
};

// Clear all user-related caches (profile, collections, session ID, and offline collections)
// This should be called when logging out to prevent showing previous user's data
export const clearAllUserCache = (): void => {
  if (typeof window !== 'undefined') {
    // Clear sessionStorage caches
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    
    // Clear offline collections list (user-specific)
    localStorage.removeItem('offline_collections');
    
    // Clear Cache API (offline assets)
    if ('caches' in window) {
      caches.delete('kaboo-offline-v1').catch(err => {
        logger.error('Error clearing offline cache:', err);
      });
    }
  }
};

// Get cached collections if available
const getCachedCollections = (): Collection[] | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(COLLECTIONS_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    // Verify it's from the current session
    if (parsed.sessionId === getSessionId()) {
      return parsed.collections;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
    return null;
  } catch (error) {
    logger.error('Error reading collections cache:', error);
    return null;
  }
};

// Export function to get cached collections synchronously (for initial state)
export const getCachedCollectionsSync = (): Collection[] | null => {
  return getCachedCollections();
};

// Get cached profile if available
const getCachedProfile = async (): Promise<UserProfile | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    
    // Verify it's from the current session
    if (parsed.sessionId !== getSessionId()) {
      // If session changed, clear old cache
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    
    // Verify the cached profile belongs to the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || parsed.userId !== user.id) {
      // User ID doesn't match - clear cache
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    
    return parsed.profile;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Export function to get cached profile synchronously (for initial state)
// Note: This doesn't validate user ID, so it should only be used for initial display
// The actual profile fetch will validate and update if needed
export const getCachedProfileSync = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    // Only verify session ID synchronously - user ID check happens async
    if (parsed.sessionId === getSessionId()) {
      return parsed.profile;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Save profile to cache
const saveProfileCache = async (profile: UserProfile): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // Get current user ID to store with cache
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const cacheData = {
      profile,
      userId: user.id, // Store user ID for validation
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving profile cache:', error);
  }
};

// Save collections to cache
const saveCollectionsCache = (collections: Collection[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData = {
      collections,
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving collections cache:', error);
  }
};

export const api = {
  /**
   * Fetch all collections/books (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getCollections(forceRefresh: boolean = false): Promise<Collection[]> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedCollections();
      if (cached) {
        return cached;
      }
    }

    // Fetch from server
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching collections:', error);
      return [];
    }
    
    const collections = data || [];
    
    // Save to cache
    saveCollectionsCache(collections);
    
    return collections;
  },

  /**
   * Fetch a single collection by ID
   */
  async getCollectionById(id: string): Promise<Collection | null> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Fetch resources (files) for a specific collection
   */
  async getCollectionResources(collectionId: string): Promise<CollectionResource[]> {
    const { data, error } = await supabase
      .from('collection_resources')
      .select('*')
      .eq('collection_id', collectionId);

    if (error) return [];
    return data || [];
  },

  /**
   * Fetch user progress (Merged logic would go here in a real app)
   * For now, returns a simple dictionary of { collection_id: percent }
   */
  async getUserProgress(): Promise<Record<string, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data } = await supabase
      .from('user_progress')
      .select('collection_id, progress_percent')
      .eq('user_id', user.id);

    const progressMap: Record<string, number> = {};
    data?.forEach((p: any) => {
      progressMap[p.collection_id] = p.progress_percent;
    });
    return progressMap;
  },

  /**
   * Create a new collection (Admin/Editor only)
   */
  async createCollection(collection: Partial<Collection>): Promise<Collection | null> {
    const { data, error } = await supabase
      .from('collections')
      .insert(collection)
      .select()
      .single();

    if (error) {
      logger.error('Error creating collection:', error);
      return null;
    }
    
    // Clear cache after creation
    clearCollectionsCache();
    
    return data;
  },

  /**
   * Update an existing collection (Admin/Editor only)
   */
  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    // First, verify the collection exists and we can access it
    const existing = await this.getCollectionById(id);
    if (!existing) {
      logger.error('Collection not found or no access:', id);
      return null;
    }

    // Perform the update
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating collection:', error);
      logger.error('Update details:', { id, updates, error });
      
      // Check for RLS policy error
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        logger.error('RLS Policy Issue: Update matched 0 rows. Check RLS policies for UPDATE on collections table.');
        return null;
      }
      
      return null;
    }
    
    if (!data) {
      logger.error('Update succeeded but no data returned. RLS might be blocking SELECT after UPDATE.');
      // Try to fetch the updated collection
      const fetched = await this.getCollectionById(id);
      // Clear cache after update
      clearCollectionsCache();
      return fetched;
    }
    
    // Clear cache after update
    clearCollectionsCache();
    
    return data;
  },

  /**
   * Delete a collection (Admin only)
   */
  async deleteCollection(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting collection:', error);
      return false;
    }
    
    // Clear cache after deletion
    clearCollectionsCache();
    
    return true;
  },

  /**
   * Fetch user profile (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getProfile(forceRefresh: boolean = false): Promise<UserProfile | null> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedProfile();
      if (cached) {
        return cached;
      }
    }

    // Fetch from server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }

    let profile: UserProfile | null = null;

    if (data) {
      profile = data;
    } else {
      // Profile doesn't exist, create it from auth metadata
      profile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Professor(a)',
        school_name: user.user_metadata?.school_name || null,
        email: user.email || null,
        avatar_id: null
      };
    }

    // Save to cache
    if (profile) {
      await saveProfileCache(profile);
    }

    return profile;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile:', error);
      return null;
    }

    // Update cache
    if (data) {
      await saveProfileCache(data);
    }

    return data;
  },

  /**
   * Get all users/profiles (Admin only)
   */
  async getAllUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Create a new user (Admin only)
   */
  async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    school_name?: string;
    role?: 'admin' | 'editor' | 'viewer';
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            school_name: userData.school_name || '',
          },
        },
      });

      if (signUpError) {
        logger.error('Error creating auth user:', signUpError);
        return { success: false, error: signUpError.message };
      }

      if (!signUpData.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Create profile with specified role
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        school_name: userData.school_name || null,
        role: userData.role || 'viewer',
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        logger.error('Error creating profile:', profileError);
        return { success: false, error: profileError.message };
      }

      return { success: true, userId: signUpData.user.id };
    } catch (error: any) {
      logger.error('Error creating user:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
};