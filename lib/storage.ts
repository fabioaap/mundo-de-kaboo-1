import { supabase } from './supabase';
import { logger } from './logger';

const STORAGE_BUCKET = 'collections'; // Bucket name for collections files

// Signed URL expiration: 7 days. The `collections` bucket is private (SEC-58),
// so reads must go through createSignedUrl instead of getPublicUrl.
export const SIGNED_URL_EXPIRES_IN = 604800; // 7 days in seconds

/**
 * Extract the in-bucket path from a legacy full Supabase Storage URL.
 * Handles both the public form (`.../object/public/{bucket}/...`) and the
 * signed form (`.../object/sign/{bucket}/...`). Returns null if the URL does
 * not reference STORAGE_BUCKET or cannot be parsed. Mirrors the parse logic
 * historically inlined in moveFile/deleteFile.
 */
export function extractBucketPath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(STORAGE_BUCKET);
    if (bucketIndex === -1) return null;
    const path = pathParts.slice(bucketIndex + 1).join('/');
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

// signCollectionsCovers (lib/api.ts) re-signs every collection's URLs on every
// getCollections() call, including collections-cache hits (60s TTL there covers
// the raw data, not the signing step) — without this cache, opening a screen
// that calls getCollections() again (e.g. DetailsScreen resolving kit-linked
// books) re-signs the entire catalog from scratch, causing a visible multi-
// second delay for content that was already signed moments earlier. The actual
// signed URL is valid for SIGNED_URL_EXPIRES_IN (7 days); caching it for 1 hour
// is a wide safety margin while eliminating redundant network round-trips
// within a session. Keyed by bucket:path; also dedupes concurrent in-flight
// requests for the same object (e.g. parallel Promise.all over many assets).
const SIGNED_URL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const signedUrlInFlight = new Map<string, Promise<string | null>>();

/**
 * Generate a signed URL for a private-bucket object.
 *
 * Accepts either a bucket + in-bucket path, or a single legacy full URL
 * (public or signed) from which the path is re-extracted. Returns null on any
 * failure (missing path, no permission, object not found) — callers treat null
 * the same way they treated a missing image before, letting the UI fall back to
 * its existing image-load-error handling.
 */
export async function getSignedUrl(
  bucketOrUrl: string,
  path?: string,
  expiresIn: number = SIGNED_URL_EXPIRES_IN,
): Promise<string | null> {
  let bucket = bucketOrUrl;
  let objectPath = path;

  // Single-argument form: a legacy full URL. Re-derive bucket + path from it.
  if (objectPath === undefined) {
    objectPath = extractBucketPath(bucketOrUrl) ?? undefined;
    bucket = STORAGE_BUCKET;
    if (!objectPath) return null;
  }

  const cacheKey = `${bucket}:${objectPath}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const inFlight = signedUrlInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath!, expiresIn);

    if (error || !data?.signedUrl) {
      logger.warn('[storage] createSignedUrl failed for', objectPath, error?.message);
      return null;
    }

    signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS });
    return data.signedUrl;
  })();

  signedUrlInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    signedUrlInFlight.delete(cacheKey);
  }
}

export interface UploadResult {
  url: string | null;
  error: string | null;
  originalFileName?: string; // Original filename before sanitization
}

export interface UploadProgressCallback {
  (progress: number): void; // progress: 0-100
}

/**
 * Extract the original filename from a generated filename
 * Generated format: ${timestamp}-${randomStr}-${sanitizedName}
 * Returns the sanitizedName part (original filename, may be truncated)
 */
export function extractOriginalFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1] || '';
    
    // If it's not in our generated format, return as-is
    if (!fileName.includes('-')) {
      return fileName || 'Arquivo';
    }
    
    // Split by '-' and take everything after the first two parts (timestamp and randomStr)
    const parts = fileName.split('-');
    if (parts.length >= 3) {
      // Join everything from index 2 onwards to reconstruct the original filename
      // (in case the original filename contained hyphens)
      const originalName = parts.slice(2).join('-');
      return originalName || fileName || 'Arquivo';
    }
    
    return fileName || 'Arquivo';
  } catch {
    // If URL parsing fails, try to extract from path string
    const pathParts = url.split('/');
    const fileName = pathParts[pathParts.length - 1] || '';
    
    if (!fileName.includes('-')) {
      return fileName || 'Arquivo';
    }
    
    const parts = fileName.split('-');
    if (parts.length >= 3) {
      const originalName = parts.slice(2).join('-');
      return originalName || fileName || 'Arquivo';
    }
    
    return fileName || 'Arquivo';
  }
}

/**
 * Upload a file to Supabase Storage with progress tracking
 */
export async function uploadFile(
  file: File,
  folder: 'covers' | 'characters' | 'pdfs' | 'audio' | 'video' | 'extras',
  collectionId?: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  try {
    // Check if bucket exists first (non-blocking - we'll try upload anyway)
    const bucketCheck = await checkBucketExists();
    if (!bucketCheck.exists && bucketCheck.error) {
      logger.warn('Bucket check warning:', bucketCheck.error);
      // Don't return early - try the upload anyway to get the real error
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const fileName = `${timestamp}-${randomStr}-${sanitizedName}`;
    const originalFileName = file.name; // Store original filename
    
    // Create path: folder/collectionId/filename (or just folder/filename if no collectionId)
    // For new collections, use 'temp' folder that can be moved later
    const path = collectionId 
      ? `${folder}/${collectionId}/${fileName}`
      : `${folder}/temp/${fileName}`;

    // Upload file with progress simulation
    logger.log('Uploading to path:', path, 'File size:', file.size, 'File type:', file.type);
    
    // Start progress simulation
    let currentProgress = 10;
    if (onProgress) {
      onProgress(currentProgress);
    }
    
    // Simulate progress updates during upload
    let progressInterval: NodeJS.Timeout | null = null;
    if (onProgress) {
      progressInterval = setInterval(() => {
        // Gradually increase progress, but cap at 90% until upload completes
        const increment = Math.random() * 15 + 5; // Random increment between 5-20%
        currentProgress = Math.min(90, currentProgress + increment);
        onProgress(currentProgress);
      }, 200);
    }
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    if (error) {
      // Don't set progress to 100 on error
      logger.error('Upload error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error
      });
      
      // Check for specific error types
      if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('policy')) {
        return { 
          url: null, 
          error: 'Erro de permissão: Verifique as políticas RLS do storage. O bucket precisa permitir INSERT para usuários autenticados.' 
        };
      }
      
      if (error.message?.includes('Bucket') || error.message?.includes('not found')) {
        return { 
          url: null, 
          error: 'Bucket não encontrado. Verifique se o bucket "collections" existe no Supabase Dashboard.' 
        };
      }
      
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        // Try with a different filename
        const newTimestamp = Date.now();
        const newRandomStr = Math.random().toString(36).substring(2, 15);
        const newFileName = `${newTimestamp}-${newRandomStr}-${sanitizedName}`;
        const newPath = collectionId 
          ? `${folder}/${collectionId}/${newFileName}`
          : `${folder}/temp/${newFileName}`;
        
        const { data: retryData, error: retryError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(newPath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (retryError) {
          return { url: null, error: retryError.message };
        }

        const retrySignedUrl = await getSignedUrl(STORAGE_BUCKET, newPath);

        if (onProgress) {
          onProgress(100); // Complete
        }

        return { url: retrySignedUrl, error: null, originalFileName: file.name };
      }
      
      return { url: null, error: error.message || 'Erro desconhecido ao fazer upload' };
    }

    // Get signed URL (bucket is private — SEC-58)
    const signedUrl = await getSignedUrl(STORAGE_BUCKET, path);

    if (onProgress) {
      onProgress(100); // Complete
    }

    return { url: signedUrl, error: null, originalFileName };
  } catch (error: any) {
    logger.error('Upload exception:', error);
    return { url: null, error: error.message || 'Erro ao fazer upload do arquivo' };
  }
}

/**
 * Moves a file from its current path to a new path within the same bucket.
 * Used to promote temp/ uploads to their permanent collection-scoped path after save.
 */
export async function moveFile(
  fromUrl: string,
  toPath: string,
): Promise<string | null> {
  try {
    // Extract just the path within bucket from the full URL
    const fromPath = extractBucketPath(fromUrl);
    if (!fromPath) return null;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .move(fromPath, toPath);

    if (error) {
      logger.error('[storage] moveFile error:', error);
      return null;
    }

    // Return new signed URL (bucket is private — SEC-58)
    return await getSignedUrl(STORAGE_BUCKET, toPath);
  } catch (err) {
    logger.error('[storage] moveFile exception:', err);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const path = extractBucketPath(fileUrl);

    if (!path) {
      logger.error('Invalid file URL');
      return false;
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      logger.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Delete exception:', error);
    return false;
  }
}

/**
 * Check if storage bucket exists and is accessible
 */
export async function checkBucketExists(): Promise<{ exists: boolean; error?: string; buckets?: string[] }> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logger.error('Error listing buckets:', listError);
      // If we can't list buckets, we might not have permission
      if (listError.message?.includes('permission') || listError.message?.includes('policy') || listError.message?.includes('row-level security')) {
        return { 
          exists: false, 
          error: 'Sem permissão para listar buckets. Verifique as políticas RLS do storage.' 
        };
      }
      return { exists: false, error: listError.message };
    }

    const bucketNames = buckets?.map(b => b.name) || [];
    logger.log('Available buckets:', bucketNames);
    
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      return { 
        exists: false, 
        error: `Bucket "${STORAGE_BUCKET}" não encontrado. Buckets disponíveis: ${bucketNames.join(', ') || 'nenhum'}. Verifique se o nome do bucket está correto.`,
        buckets: bucketNames
      };
    }

    // Try to access the bucket to verify permissions
    const { data: testList, error: testError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 1 });

    if (testError) {
      logger.error('Error accessing bucket:', testError);
      if (testError.message?.includes('permission') || testError.message?.includes('policy') || testError.message?.includes('row-level security')) {
        return {
          exists: true,
          error: 'Bucket existe mas você não tem permissão para acessá-lo. Verifique as políticas RLS do storage.'
        };
      }
      return { exists: true, error: `Erro ao acessar bucket: ${testError.message}` };
    }

    return { exists: true };
  } catch (error: any) {
    logger.error('Exception checking bucket:', error);
    return { exists: false, error: error.message || 'Erro ao verificar bucket' };
  }
}
