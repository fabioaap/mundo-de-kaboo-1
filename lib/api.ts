import { supabase } from './supabase';
import { Collection, CollectionResource } from '../types';
import { logger } from './logger';

export const api = {
  /**
   * Fetch all collections/books
   */
  async getCollections(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching collections:', error);
      return [];
    }
    return data || [];
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
      return await this.getCollectionById(id);
    }
    
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
    return true;
  }
};