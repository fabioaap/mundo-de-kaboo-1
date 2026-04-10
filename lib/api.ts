import { supabase, isSupabaseConfigured } from './supabase';
import { deleteFile } from './storage';
import {
  Collection,
  CollectionResource,
  RegisterWithVoucherInput,
  RegisterWithVoucherResult,
  UserProfile,
  Voucher,
  VoucherRedemptionResult,
  VoucherValidationResult,
} from '../types';
import { logger } from './logger';
import {
  createMockUser,
  getMockAllUsers,
  updateMockUserById,
  getMockCollectionResources,
  getMockCurrentUserId,
  getMockProfile,
  getMockUserProgress,
  getMockVoucherSamples,
  redeemMockVoucher,
  saveMockProfile,
  signInMockUser,
  signOutMockUser,
  validateMockVoucher,
  mockCreateCollection,
  mockUpdateCollection,
  mockDeleteCollection,
  getMockCollectionsLive,
  getMockCollectionByIdLive,
} from './mockData';
import {
  getProfileAccessStatus,
  getVoucherErrorMessage,
  normalizeVoucherCode,
} from './access';
import { getActiveGrantsForUser, hasGrantForCollection } from './mockVoucherData';

// Cache management for collections
const COLLECTIONS_CACHE_KEY = 'kaboo_collections_cache';
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_KEY = 'kaboo_session_id';

const normalizeProfile = (profile: UserProfile): UserProfile => {
  return {
    ...profile,
    access_status: getProfileAccessStatus(profile)
  };
};

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

    if (!isSupabaseConfigured) {
      const currentMockUserId = getMockCurrentUserId();
      if (!currentMockUserId || parsed.userId !== currentMockUserId) {
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
        return null;
      }
      return parsed.profile;
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
      if (!isSupabaseConfigured) {
        const currentMockUserId = getMockCurrentUserId();
        if (!currentMockUserId || parsed.userId !== currentMockUserId) {
          sessionStorage.removeItem(PROFILE_CACHE_KEY);
          return null;
        }
      }
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
    let userId = getMockCurrentUserId() || 'mock-anonymous';

    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    const cacheData = {
      profile,
      userId,
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
  async signIn(email: string, password: string): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const result = signInMockUser(email, password);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }

      return {
        success: result.success,
        profile: result.profile || null,
        error: result.error
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Nao foi possivel iniciar a sessao.'
      };
    }

    const profile = await this.getProfile(true);
    return {
      success: true,
      profile
    };
  },

  async signOut(): Promise<void> {
    clearAllUserCache();

    if (!isSupabaseConfigured) {
      signOutMockUser();
      return;
    }

    await supabase.auth.signOut();
  },

  async getVoucherSamples(): Promise<Voucher[]> {
    if (!isSupabaseConfigured) {
      return getMockVoucherSamples();
    }

    return [];
  },

  async validateVoucher(voucherCode: string): Promise<VoucherValidationResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured) {
      return validateMockVoucher(voucherCode);
    }

    try {
      const { data, error } = await supabase.rpc('validate_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error validating voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      return {
        success: true,
        voucher: data.voucher as Voucher | undefined
      };
    } catch (error: any) {
      logger.error('Unexpected voucher validation error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async redeemVoucher(voucherCode: string): Promise<VoucherRedemptionResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured) {
      const result = redeemMockVoucher(voucherCode);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }
      return result;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        code: 'not_authenticated',
        message: getVoucherErrorMessage('not_authenticated')
      };
    }

    try {
      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error redeeming voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      const profile = await this.getProfile(true);
      return {
        success: true,
        profile,
        voucher: data.voucher as Voucher | undefined,
        message: data?.message
      };
    } catch (error: any) {
      logger.error('Unexpected voucher redemption error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async registerWithVoucher(input: RegisterWithVoucherInput): Promise<RegisterWithVoucherResult> {
    const validation = await this.validateVoucher(input.voucherCode);
    if (!validation.success) {
      return {
        success: false,
        error: validation.message || getVoucherErrorMessage(validation.code)
      };
    }

    if (!isSupabaseConfigured) {
      const creation = createMockUser({
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        school_name: input.school_name,
        role: 'viewer',
        signIn: true,
      });

      if (!creation.success || !creation.userId) {
        return {
          success: false,
          error: creation.error || 'Nao foi possivel criar sua conta.'
        };
      }

      const redemption = redeemMockVoucher(input.voucherCode);
      if (!redemption.success || !redemption.profile) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      await saveProfileCache(normalizeProfile(redemption.profile));

      return {
        success: true,
        profile: redemption.profile
      };
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/?confirmation=success`
        : undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: input.full_name,
            school_name: input.school_name || ''
          }
        }
      });

      if (signUpError) {
        logger.error('Error signing up with voucher:', signUpError);
        return { success: false, error: signUpError.message };
      }

      if (!signUpData.user) {
        return { success: false, error: 'Nao foi possivel criar a conta.' };
      }

      // O perfil inicial é criado pelo trigger handle_new_user no banco.
      // Evita erro de RLS quando o sign-up ainda não abriu sessão autenticada.

      if (!signUpData.session) {
        return {
          success: true,
          requiresLogin: true,
          requiresEmailConfirmation: true,
          email: input.email,
          message: 'Conta criada. Confirme seu e-mail para concluir o cadastro e depois faça login para ativar seu codigo de acesso.'
        };
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: signUpData.session.access_token,
        refresh_token: signUpData.session.refresh_token,
      });

      if (setSessionError) {
        logger.error('Error persisting session after sign up:', setSessionError);
        return {
          success: false,
          error: 'Conta criada, mas nao foi possivel finalizar a ativacao automaticamente. Tente entrar novamente para continuar.'
        };
      }

      let redemption = await this.redeemVoucher(input.voucherCode);
      if (!redemption.success && redemption.code === 'not_authenticated') {
        await new Promise((resolve) => setTimeout(resolve, 150));
        redemption = await this.redeemVoucher(input.voucherCode);
      }

      if (!redemption.success) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      return {
        success: true,
        profile: redemption.profile || undefined
      };
    } catch (error: any) {
      logger.error('Unexpected registerWithVoucher error:', error);
      return {
        success: false,
        error: error?.message || 'Ocorreu um erro ao criar a conta.'
      };
    }
  },

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

    if (!isSupabaseConfigured) {
      const collections = getMockCollectionsLive();
      saveCollectionsCache(collections);
      return collections;
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
    if (!isSupabaseConfigured) {
      return getMockCollectionByIdLive(id);
    }

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
    if (!isSupabaseConfigured) {
      return getMockCollectionResources(collectionId);
    }

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
    if (!isSupabaseConfigured) {
      return getMockUserProgress();
    }

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
    if (!isSupabaseConfigured) {
      return mockCreateCollection(collection);
    }
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
    if (!isSupabaseConfigured) {
      return mockUpdateCollection(id, updates);
    }
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
   * Delete a collection (Admin only) — cascata: resources + storage + collection
   */
  async deleteCollection(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      return mockDeleteCollection(id);
    }

    // 1. Buscar todos os recursos associados antes de deletar
    const { data: resources, error: resourcesError } = await supabase
      .from('collection_resources')
      .select('id, url')
      .eq('collection_id', id);

    if (resourcesError) {
      logger.error('Error fetching collection resources before delete:', resourcesError);
      return false;
    }

    // 2. Deletar arquivos do Storage (best-effort: continua mesmo se algum falhar)
    if (resources && resources.length > 0) {
      const deleteResults = await Promise.allSettled(
        resources
          .filter(r => r.url)
          .map(r => deleteFile(r.url))
      );

      const failures = deleteResults.filter(r => r.status === 'rejected').length;
      if (failures > 0) {
        logger.warn(`deleteCollection: ${failures}/${resources.length} storage files failed to delete`);
      }

      // 3. Deletar registros de collection_resources
      const { error: resourcesDeleteError } = await supabase
        .from('collection_resources')
        .delete()
        .eq('collection_id', id);

      if (resourcesDeleteError) {
        logger.error('Error deleting collection resources:', resourcesDeleteError);
        return false;
      }
    }

    // 4. Deletar a coleção
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

    if (!isSupabaseConfigured) {
      const currentUserId = getMockCurrentUserId();
      if (!currentUserId) {
        clearProfileCache();
        return null;
      }

      const mockProfile = getMockProfile();
      if (!mockProfile) {
        clearProfileCache();
        return null;
      }

      const profile = normalizeProfile(mockProfile);

      await saveProfileCache(profile);
      return profile;
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
      profile = normalizeProfile(data);
    } else {
      // Profile doesn't exist, create it from auth metadata
      profile = normalizeProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Professor(a)',
        school_name: user.user_metadata?.school_name || null,
        email: user.email || null,
        avatar_id: null,
        access_status: 'pending_voucher',
        voucher_id: null,
        access_starts_at: null,
        access_expires_at: null
      });
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
    if (!isSupabaseConfigured) {
      const saved = saveMockProfile(updates);
      if (!saved) {
        return null;
      }

      const profile = normalizeProfile(saved);
      await saveProfileCache(profile);
      return profile;
    }

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
      await saveProfileCache(normalizeProfile(data));
    }

    return data ? normalizeProfile(data) : null;
  },

  /**
   * Get all users/profiles (Admin only)
   */
  async getAllUsers(): Promise<any[]> {
    if (!isSupabaseConfigured) {
      return getMockAllUsers();
    }

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
    if (!isSupabaseConfigured) {
      const result = createMockUser({
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        school_name: userData.school_name,
        role: userData.role || 'viewer',
        signIn: false,
      });

      return {
        success: result.success,
        error: result.error,
        userId: result.userId,
      };
    }

    try {
      // Salva a sessão do admin antes de criar o usuário
      // O signUp pode criar uma nova sessão e sobrescrever a sessão atual
      const { data: adminSessionData } = await supabase.auth.getSession();
      const adminRefreshToken = adminSessionData.session?.refresh_token;

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

      // Restaura a sessão do admin se foi sobrescrita pelo signUp
      const { data: currentSession } = await supabase.auth.getSession();
      const sessionChanged = adminRefreshToken && currentSession.session?.refresh_token !== adminRefreshToken;
      if (sessionChanged) {
        await supabase.auth.refreshSession({ refresh_token: adminRefreshToken });
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
  },

  /**
   * Get active content grants for the current user.
   * Returns collection IDs the user has been granted access to via content-based vouchers.
   */
  async getUserContentGrants(): Promise<import('../types').UserContentGrant[]> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return [];
      return getActiveGrantsForUser(userId);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_content_grants')
      .select('*')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      logger.error('Error fetching user content grants:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update any user profile by ID (Admin only)
   */
  async updateUser(
    userId: string,
    updates: { full_name?: string; school_name?: string; role?: 'admin' | 'editor' | 'viewer' }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const updated = updateMockUserById(userId, updates);
      return updated ? { success: true } : { success: false, error: 'Usuário não encontrado.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  /**
   * Check if current user has a grant for a specific collection.
   */
  async hasContentGrant(collectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return false;
      return hasGrantForCollection(userId, collectionId);
    }

    const grants = await this.getUserContentGrants();
    return grants.some(g => g.collection_id === collectionId);
  },
};