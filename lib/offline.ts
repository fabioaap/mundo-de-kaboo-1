import { Collection } from '../types';

const CACHE_NAME = 'kaboo-offline-v1';
const STORAGE_KEY = 'offline_collections';

export const offlineManager = {
  /**
   * Verifica se uma coleção está marcada como offline
   */
  isOffline: (id: string): boolean => {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return list.includes(id);
    } catch { 
      return false; 
    }
  },

  /**
   * Salva a coleção para uso offline (Cache + LocalStorage)
   */
  enableOffline: async (collection: Collection): Promise<void> => {
    // 1. Atualizar LocalStorage
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!list.includes(collection.id)) {
      list.push(collection.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // 2. Cachear Assets (Imagens, Áudio, Vídeo, PDF)
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Filtra URLs válidas
        const urlsToCache = [
          collection.cover_image,
          collection.audio_url,
          collection.video_url,
          collection.pdf_url
        ].filter((url): url is string => !!url && url.startsWith('http'));

        // Tenta cachear cada recurso. Usamos Promise.allSettled para que se um falhar (ex: CORS), 
        // os outros continuem sendo salvos.
        await Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(e => console.warn(`Falha ao cachear ${url}:`, e))
          )
        );
      } catch (e) {
        console.error('Erro ao acessar Cache API:', e);
      }
    }
  },

  /**
   * Remove a coleção do modo offline
   */
  disableOffline: async (id: string): Promise<void> => {
    // 1. Atualizar LocalStorage
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list = list.filter((item: string) => item !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    // Nota: Em uma implementação completa, deveríamos iterar sobre as chaves do cache
    // e deletar os arquivos específicos. Para este escopo, remover da lista de permissão é suficiente.
  }
};