import supabase from "../config/supabaseClient.js";
import { logger } from "../utils/logger.js";

export const getReports = async (req, res, next) => {

     const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('disaster_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching reports', { error: error.message, disasterId: id });
            return next(error);
        }

        logger.info('Reports fetched successfully', { count: data.length, disasterId: id });
        res.status(200).json(data);

  
}
    catch (dbError) {
        logger.error('Database error fetching reports', { error: dbError.message, disasterId: id });
        next(dbError);
    }

}