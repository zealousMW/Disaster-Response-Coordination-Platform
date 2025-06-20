import supabase from "../config/supabaseClient.js";
import { logger } from "../utils/logger.js";

export const findNearbyResources = async (req, res, next) => {
    const {lat , lon , radius = 10000} = req.query;
    if (!lat || !lon) {
        const error = new Error('Latitude and longitude are required.');
        error.statusCode = 400;
        return next(error);
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusMeters = parseInt(radius, 10);
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
        const error = new Error('Invalid latitude, longitude, or radius.');
        error.statusCode = 400;
        return next(error);
    }
    try{
        const {data, error} = await supabase.rpc('find_resources_near', {
            query_lat: latitude,
            query_lon: longitude,
            radius_meters: radiusMeters
        });

        if (error) {
            logger.error('Error finding nearby resources', { error: error.message, latitude, longitude, radius: radiusMeters });
            return next(error);
        }
        logger.info('Nearby resources found', { count: data.length, latitude, longitude, radius: radiusMeters });
        res.status(200).json(data);


    }
    catch (dbError) {
        logger.error('Database error finding nearby resources', { error: dbError.message, latitude, longitude, radius: radiusMeters });
        next(dbError);
    }
}