import { supabase, isSupabaseConfigured } from './supabase';
import { getMockCurrentUserRole } from './mockData';
import { isDevMockSession } from './api';
import { UserRole } from '../types';

/**
 * Get the current user's role from their profile
 */
export async function getUserRole(): Promise<UserRole> {
  if (!isSupabaseConfigured || isDevMockSession()) {
    return getMockCurrentUserRole();
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return 'viewer';
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      return 'viewer';
    }

    if (!data) {
      return 'viewer';
    }

    // Get the role value and normalize it
    let role = data.role;

    // Handle ENUM types - they might come as objects or strings
    if (typeof role === 'object' && role !== null) {
      role = (role as any).value || (role as any).name || String(role);
    }

    // Normalize: trim whitespace and convert to lowercase
    const normalizedRole = String(role).trim().toLowerCase();

    // Validate role is one of the expected values (case-insensitive)
    if (normalizedRole && ['admin', 'editor', 'viewer'].includes(normalizedRole)) {
      return normalizedRole as UserRole;
    }

    return 'viewer';
  } catch (error) {
    return 'viewer';
  }
}

/**
 * Check if the current user has admin or editor permissions
 */
export async function canEditCollections(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'editor';
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}
