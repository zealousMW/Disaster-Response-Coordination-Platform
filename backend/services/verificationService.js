import {
  GoogleGenAI,
  Type,
} from '@google/genai';
import mime from 'mime';
import https from 'https';
import http from 'http';
import { cacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        const error = new Error(`Failed to download image: ${response.statusCode}`);
        logger.error('Image download failed', { url, statusCode: response.statusCode });
        reject(error); // Fixed: was missing reject call
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function verifyImage(imageUrl) {
  const cacheKey = `verify-image:${imageUrl}`;
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    logger.info('Cache hit for image verification', { imageUrl });
    return cachedData;
  }
  
  try {
    logger.info('Downloading image for verification', { imageUrl });
    const imageBuffer = await downloadImage(imageUrl);
    logger.info('Image downloaded successfully', { imageUrl, size: imageBuffer.length });
    
    // Get MIME type from URL extension
    const mimeType = mime.getType(imageUrl) || 'image/jpeg';
    
    // Convert buffer to base64
    const base64Data = imageBuffer.toString('base64');
    
    // Initialize Gemini AI
     const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    thinkingConfig: {
      thinkingBudget: -1,
    },
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["is_authentic", "disaster_context", "confidence_score", "raw_analysis"],
      properties: {
        is_authentic: {
          type: Type.STRING,
        },
        disaster_context: {
          type: Type.STRING,
        },
        confidence_score: {
          type: Type.STRING,
        },
        raw_analysis: {
          type: Type.STRING,
        },
      },
    },
    systemInstruction: [
        {
          text: `Analyze the image allegedly from a disaster ,Is it related to a real-world disaster like a flood, fire, or earthquake? Does it show any obvious signs of digital manipulation or being AI-generated? Respond with a JSON object with keys: "is_authentic" (boolean), "disaster_context" (string, e.g., "Appears to be a real photo of a building fire."), "confidence_score" (number between 0 and 1), and "raw_analysis" (string, your detailed reasoning).\` 100 words`,
        }
    ],
  };
    
    const model = 'gemini-2.5-flash';
    
    // Fixed: Correct structure based on API documentation
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: 'Analyze this disaster image for authenticity',
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ];
    
    logger.info('Sending image verification request to Gemini AI', { imageUrl, mimeType });
    
    // Fixed: Use correct method call structure
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    
    const result = JSON.parse(response.text);
    
    // Cache the result
    await cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    
    logger.info('Image verification response received', { result });
    return result;
    
  } catch (error) {
    logger.error('Error verifying image', { error: error.message, imageUrl });
    throw error;
  }
}

// Alternative simpler version based on the API documentation

// Helper function to extract JSON from markdown code blocks
function extractJsonFromResponse(text) {
  try {
    // First try to parse directly as JSON
    return JSON.parse(text);
  } catch (error) {
    // If that fails, try to extract from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        logger.error('Failed to parse JSON from markdown block', { text, error: parseError.message });
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
    // If no markdown blocks found, try to find JSON-like content
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      } catch (parseError) {
        logger.error('Failed to parse extracted JSON', { text, error: parseError.message });
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
}

async function verifyImageSimple(imageUrl) {
  try {
    logger.info('Downloading image for verification', { imageUrl });
    
    // Use fetch instead of manual http/https
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const imageArrayBuffer = await response.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
    const mimeType = mime.getType(imageUrl) || 'image/jpeg';
    
    // Initialize Gemini AI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64ImageData,
              },
            },
            { 
              text: "Analyze this disaster image for authenticity. Is it related to a real-world disaster? Does it show signs of digital manipulation or being AI-generated? Provide your analysis in JSON format with keys: is_authentic (boolean), disaster_context (string), confidence_score (number 0-1), raw_analysis (string)." 
            }
          ],
        }
      ],
    });
    
    logger.info('Image verification response received');
    if (!result || !result.text) {
      throw new Error('Invalid response from Gemini AI');
    }
    logger.info('Parsed image verification result', { result: result.text });
    const parsedResult = extractJsonFromResponse(result.text);

    return parsedResult;
    
  } catch (error) {
    logger.error('Error verifying image', { error: error.message, imageUrl });
    throw error;
  }
}

export const verificationService = {
  verifyImage,
  verifyImageSimple,
};