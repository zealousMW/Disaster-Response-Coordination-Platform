// src/controllers/disasterController.js
import supabase from '../config/supabaseClient.js';
import { socketServer } from '../config/socketServer.js';
import { logger } from '../utils/logger.js';

// CREATE a new disaster
export const createDisaster = async (req, res, next) => {
  // FIX: Destructure 'tags' as an array, not 'tag' as a string.
  const { title, description, tags } = req.body;
  const owner_id = req.user.id;

  // FIX: Updated validation to check for a non-empty array of tags.
  if (!title || !description || !tags || !Array.isArray(tags) || tags.length === 0) {
    const error = new Error('Title, description, and at least one tag are required.');
    error.statusCode = 400; // Use statusCode for consistency
    return next(error);
  }

  // FIX: Corrected typo from 'anditTrail' to 'auditTrail'
  const auditTrail = [{
    action: 'create',
    user_id: owner_id,
    timestamp: new Date().toISOString(),
  }];

  try {
    const { data, error } = await supabase
      .from('disasters')
      // FIX: The object keys must match the column names in your database ('tags').
      .insert({ title, description, tags, owner_id, audit_trail: auditTrail })
      .select()
      .single();

    if (error) throw error;

    socketServer.io.emit('disaster_updated', { type: 'CREATE', payload: data });
    logger.info('Disaster created successfully', { disasterId: data.id, ownerId: owner_id });
    res.status(201).json(data);

  } catch (dbError) {
    logger.error('Error creating disaster', { error: dbError.message, ownerId: owner_id });
    next(dbError);
  }
};

// GET all disasters (with optional tag filtering)
export const getAllDisasters = async (req, res, next) => {
  const { tag } = req.query;
  try {
    let query = supabase.from('disasters').select('*').order('created_at', { ascending: false });

    if (tag) {
      // FIX: Use .contains() to check if an element exists in a TEXT[] array column.
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;
    if (error) throw error;

    logger.info('Fetched all disasters', { count: data.length, filterTag: tag || 'none' });
    res.status(200).json(data);

  } catch (dbError) {
    logger.error('Database error fetching disasters', { error: dbError.message });
    next(dbError);
  }
};


// UPDATE a disaster
export const updateDisaster = async (req, res, next) => {
  const { id } = req.params;
  // FIX: Use 'tags' consistently.
  const { title, description, tags } = req.body;
  const user = req.user;

  try {
    // 1. Fetch the record to authorize and get audit trail
    const { data: existing, error: fetchError } = await supabase
      .from('disasters')
      .select('owner_id, audit_trail')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError; // This will be caught by the outer try/catch
    if (!existing) {
        const error = new Error('Disaster not found');
        error.statusCode = 404;
        return next(error);
    }

    // 2. Authorize
    if (user.role !== 'admin' && existing.owner_id !== user.id) {
        const error = new Error('Forbidden: You do not have permission to edit this disaster.');
        error.statusCode = 403;
        return next(error);
    }
    
    // 3. Prepare update
    const newAuditEntry = {
        action: 'update',
        user_id: user.id,
        timestamp: new Date().toISOString()
    };
    const updatedAuditTrail = [...existing.audit_trail, newAuditEntry];

    // 4. Perform update
    const { data, error } = await supabase
      .from('disasters')
      // FIX: Use 'tags' to match the database column.
      .update({ title, description, tags, audit_trail: updatedAuditTrail })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;

    socketServer.io.emit('disaster_updated', { type: 'UPDATE', payload: data });
    logger.info('Disaster updated successfully', { disasterId: data.id, userId: user.id });
    res.status(200).json(data);

  } catch (dbError) {
    logger.error('Error during disaster update process', { disasterId: id, error: dbError.message });
    next(dbError);
  }
};


// DELETE a disaster (Admin only)
export const deleteDisaster = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  // FIX: Simplified authorization check to be more direct.
  if (user.role !== 'admin') {
    const error = new Error('Forbidden: Only admins can delete disasters.');
    error.statusCode = 403;
    return next(error);
  }

  try {
    // We don't need to fetch before deleting if only admins can do it.
    // The .eq('id', id) ensures we only delete the correct one.
    const { error } = await supabase.from('disasters').delete().eq('id', id);
    if (error) throw error;

    socketServer.io.emit('disaster_updated', { type: 'DELETE', payload: { id: parseInt(id) } }); // Ensure ID is a number if needed by frontend
    logger.warn('Disaster deleted', { disasterId: id, adminId: user.id });

    // FIX: Use 204 No Content for successful deletions. Do not send a body.
    res.status(204).send();

  } catch(dbError) {
    logger.error('Error deleting disaster', { disasterId: id, error: dbError.message });
    next(dbError);
  }
};