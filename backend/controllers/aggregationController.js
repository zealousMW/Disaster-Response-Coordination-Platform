// src/controllers/aggregationController.js
import { socialMediaService } from '../services/socialMediaService.js';
import { scrapingService } from '../services/scrapingService.js';
import { verificationService } from '../services/verificationService.js';
import supabase from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

// GET /disasters/:id/social-media
export const getSocialMedia = async (req, res, next) => {
  const { id } = req.params;
  try {
    // Fetch disaster to get keywords from its tags or title
    const { data: disaster, error } = await supabase.from('disasters').select('title, location_name').eq('id', id).single();
    if (error || !disaster) {
      const err = new Error('Disaster not found');
      err.statusCode = 404;
      return next(err);
    }
    
    const keywords = [ ...(disaster.tags || []), disaster.title ];
    const reports = await socialMediaService.getReports([disaster.title]);
    res.status(200).json(reports);
  } catch (err) {
    next(err);
  }
};

// GET /official-updates
export const getOfficialUpdates = async (req, res, next) => {
  try {
    const updates = await scrapingService.getUpdates();
    res.status(200).json(updates);
  } catch (err) {
    next(err);
  }
};

// POST /verify-image
export const verifyImage = async (req, res, next) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    const error = new Error('imageUrl is required in the request body.');
    error.statusCode = 400;
    return next(error);
  }
  
  try {
    const result = await verificationService.verifyImageSimple(imageUrl);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};