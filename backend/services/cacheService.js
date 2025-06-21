// src/services/cacheService.js
import supabase from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

const get = async (key) => {
  try {
    const { data, error } = await supabase
      .from('cache')
      .select('value, expires_at')
      .eq('key', key)
      .single();

    if (error) {
      // 'PGRST116' is the code for 'No rows found', which is not a true error here.
      if (error.code !== 'PGRST116') throw error;
      return null; // Cache miss
    }

    if (new Date(data.expires_at) > new Date()) {
      logger.info('Cache hit', { key });
      return data.value; // Cache hit and valid
    }

    logger.info('Cache stale', { key });
    return null; // Cache hit but expired
  } catch (err) {
    logger.error('Error getting from cache', { key, error: err.message });
    return null;
  }
};

const set = async (key, value, ttlSeconds = 3600) => { // Default TTL: 1 hour
  try {
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await supabase
      .from('cache')
      .upsert({ key, value, expires_at }); // Upsert handles both INSERT and UPDATE

    if (error) throw error;
    
    logger.info('Cache set', { key, ttl: `${ttlSeconds}s` });
  } catch (err) {
    logger.error('Error setting cache', { key, error: err.message });
  }
};

export const cacheService = { get, set };