import { GoogleGenAI, Type } from '@google/genai'; 

import NodeGeocoder from 'node-geocoder';
import { logger } from '../utils/logger.js';

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
logger.info('Google GenAI client initialized successfully.');

const config = {
    thinkingConfig: {
      thinkingBudget: 0,
    },
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["location"],
      properties: {
        location: {
          type: Type.STRING,
        },
      },
    },
    systemInstruction: [
        {
          text: `From the disaster description, extract the most specific location name (like a city, neighborhood, or landmark). Respond with ONLY a JSON object with a single key "location". For example: {"location": "Manhattan, NYC"}. If no location is found, respond with {"location": null}`,
        }
    ],
  };
  const model = 'gemini-2.5-flash-lite-preview-06-17';

  const geocoderOptions = {
  provider: 'openstreetmap',
};
const geocoder = NodeGeocoder(geocoderOptions);

const extractLocation = async (description) => {
try{
      const contents = [{
      role: 'user',
      parts: [{ text: description }],
    }];

    const response = await ai.models.generateContent({
        model,
        config,
        contents,
        
    });
    const text = response.text;
    logger.info('Location extraction response received', {  text });
    const responseText = response.text;
    const data = JSON.parse(responseText);

    if(data && data.location){

        const location = data.location
        logger.info('Extracted location:', { location });
        return location;

    }
    logger.warn('No location found in the response', { responseText });
    return null;
}
catch (error) {
    logger.error('Error extracting location:', { error: error.message, description });
    throw new Error('Failed to extract location from description');
  }
  


}


const geocodeLocationName = async (locationName) => {
    if (!locationName) {
        logger.warn('No location name provided for geocoding');
        return null;
    }
    try{
        const res = await geocoder.geocode(locationName);
        if(res && res.length > 0) {
            const { latitude, longitude } = res[0];
            logger.info('Geocoded location', { locationName, latitude, longitude });
            return { latitude, longitude };
        }
        return null;

    }
    catch (error){
            logger.error('Error geocoding location:', { error: error.message, locationName });
            return null;
    }
}

export const extractAndGeocode = async (description) => {
    const locationName = await extractLocation(description);
    if (!locationName) {
        logger.warn('No location name extracted from description');
        return null;
    }
    const geocodedLocation = await geocodeLocationName(locationName);
    if (!geocodedLocation) {
        logger.warn('Failed to geocode the extracted location', { locationName });
        return null;
    }
    return {
        locationName,
        lat: geocodedLocation.latitude, 
        lon: geocodedLocation.longitude,
    };
}
