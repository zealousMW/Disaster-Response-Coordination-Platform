// src/services/scrapingService.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { cacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

// Correct FEMA RSS Feed URLs
const FEMA_RSS_FEEDS = {
  disasters: 'https://www.fema.gov/news/disasters_rss.fema',
  pressReleases: 'https://www.fema.gov/feeds/news.rss'
};

// Disaster type keywords for filtering
const DISASTER_KEYWORDS = {
  hurricane: ['hurricane', 'tropical storm', 'typhoon', 'cyclone'],
  flood: ['flood', 'flooding', 'flash flood', 'river flood', 'coastal flood'],
  fire: ['fire', 'wildfire', 'forest fire', 'brush fire', 'grass fire'],
  tornado: ['tornado', 'tornadoes', 'severe thunderstorm', 'straight-line winds'],
  earthquake: ['earthquake', 'seismic', 'tremor', 'aftershock'],
  winter: ['winter storm', 'blizzard', 'ice storm', 'snow storm', 'freeze'],
  drought: ['drought', 'dry conditions', 'water shortage'],
  severe_weather: ['severe weather', 'thunderstorm', 'hail', 'damaging winds']
};

/**
 * Fetch and parse RSS feed from FEMA
 * @param {string} feedUrl - RSS feed URL
 * @param {string} feedType - Type of feed (disasters/pressReleases)
 * @returns {Array} - Parsed RSS items
 */
const fetchRSSFeed = async (feedUrl, feedType) => {
  try {
    logger.info(`Fetching ${feedType} RSS feed`, { url: feedUrl });
    
    const response = await axios.get(feedUrl, {
      headers: { 
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'FEMA-Scraper/1.0'
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      logger.error(`Failed to fetch ${feedType} RSS`, { 
        status: response.status, 
        url: feedUrl 
      });
      return [];
    }

    // Parse XML to JavaScript object
    const parsed = await parseStringPromise(response.data, { 
      explicitArray: false, 
      trim: true,
      ignoreAttrs: false
    });
    
    // Handle different RSS structures
    const channel = parsed.rss?.channel || parsed.feed;
    if (!channel) {
      logger.error(`Invalid RSS structure for ${feedType}`, { url: feedUrl });
      return [];
    }

    const items = channel.item || channel.entry || [];
    const itemsArray = Array.isArray(items) ? items : [items];

    // Map to standardized format
    const mappedItems = itemsArray.map((item, index) => ({
      id: `${feedType}_${index}_${Date.now()}`,
      title: item.title || 'No title',
      description: (item.description || item.summary || 'No description')
        .replace(/<[^>]*>?/gm, ''), // Remove HTML tags
      link: item.link?.href || item.link || '#',
      pubDate: item.pubDate || item.published || item.updated || new Date().toISOString(),
      source: `FEMA ${feedType}`,
      feedType: feedType,
      extractedAt: new Date().toISOString()
    }));

    logger.info(`Successfully parsed ${feedType} RSS`, { 
      itemCount: mappedItems.length 
    });
    
    return mappedItems;

  } catch (error) {
    logger.error(`Error fetching ${feedType} RSS feed`, { 
      error: error.message, 
      url: feedUrl 
    });
    return [];
  }
};

/**
 * Get latest disasters from FEMA
 * @param {number} count - Number of latest disasters to return (default: 10)
 * @returns {Array} - Latest disaster declarations
 */
const getLatestDisasters = async (count = 10) => {
  const cacheKey = `latest-disasters:${count}`;
  
  // Check cache first
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    logger.info('Cache hit for latest disasters', { 
      count: cachedData.length,
      requestedCount: count 
    });
    return cachedData;
  }

  logger.info('Fetching latest disasters from FEMA', { requestedCount: count });

  try {
    // Fetch disaster declarations feed
    const disasters = await fetchRSSFeed(
      FEMA_RSS_FEEDS.disasters, 
      'disasters'
    );

    if (disasters.length === 0) {
      logger.warn('No disasters found in RSS feed');
      return [];
    }

    // Sort by publication date (newest first) and limit
    const latestDisasters = disasters
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, count);

    // Cache for 30 minutes (disasters don't change frequently)
    await cacheService.set(cacheKey, latestDisasters, 1800);
    
    logger.info('Successfully fetched and cached latest disasters', { 
      totalFound: disasters.length,
      returned: latestDisasters.length,
      requestedCount: count
    });

    return latestDisasters;

  } catch (error) {
    logger.error('Error getting latest disasters', { 
      error: error.message,
      requestedCount: count 
    });
    return [];
  }
};

/**
 * Get official updates (press releases) with filtering options
 * @param {Object} options - Filtering options
 * @param {number} options.count - Number of updates to return (default: 10)
 * @param {Array} options.disasterTypes - Filter by disaster types
 * @param {Array} options.keywords - Additional keywords to filter by
 * @param {string} options.dateFrom - Filter from date (ISO string)
 * @param {Array} options.states - Filter by states
 * @returns {Array} - Filtered official updates
 */
const getOfficialUpdates = async (options = {}) => {
  const {
    count = 10,
    disasterTypes = [],
    keywords = [],
    dateFrom = null,
    states = []
  } = options;

  const cacheKey = `official-updates:${JSON.stringify(options)}`;
  
  // Check cache first
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    logger.info('Cache hit for official updates', { 
      count: cachedData.length,
      filters: options 
    });
    return cachedData;
  }

  logger.info('Fetching official updates from FEMA', { 
    requestedCount: count,
    filters: options 
  });

  try {
    // Fetch both press releases and disasters
    const [pressReleases, disasters] = await Promise.all([
      fetchRSSFeed(FEMA_RSS_FEEDS.pressReleases, 'pressReleases'),
      fetchRSSFeed(FEMA_RSS_FEEDS.disasters, 'disasters')
    ]);

    // Combine all items
    let allItems = [...pressReleases, ...disasters];

    if (allItems.length === 0) {
      logger.warn('No official updates found');
      return [];
    }

    // Apply filters
    let filteredItems = allItems;

    // Filter by disaster types
    if (disasterTypes.length > 0) {
      filteredItems = filteredItems.filter(item => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return disasterTypes.some(disasterType => {
          const typeKeywords = DISASTER_KEYWORDS[disasterType] || [disasterType];
          return typeKeywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
        });
      });
    }

    // Filter by additional keywords
    if (keywords.length > 0) {
      filteredItems = filteredItems.filter(item => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    // Filter by states
    if (states.length > 0) {
      filteredItems = filteredItems.filter(item => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return states.some(state => 
          searchText.includes(state.toLowerCase())
        );
      });
    }

    // Filter by date
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredItems = filteredItems.filter(item => 
        new Date(item.pubDate) >= fromDate
      );
    }

    // Sort by publication date (newest first) and limit
    const finalUpdates = filteredItems
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, count);

    // Cache for 1 hour (press releases update more frequently)
    await cacheService.set(cacheKey, finalUpdates, 3600);
    
    logger.info('Successfully fetched and cached official updates', { 
      totalFound: allItems.length,
      afterFilters: filteredItems.length,
      returned: finalUpdates.length,
      filters: options
    });

    return finalUpdates;

  } catch (error) {
    logger.error('Error getting official updates', { 
      error: error.message,
      filters: options 
    });
    return [];
  }
};

/**
 * Get disaster statistics from current feeds
 * @returns {Object} - Statistics by disaster type
 */
const getDisasterStats = async () => {
  const cacheKey = 'disaster-stats';
  
  // Check cache first
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    logger.info('Cache hit for disaster stats');
    return cachedData;
  }

  logger.info('Calculating disaster statistics');

  try {
    // Get all current items
    const allUpdates = await getOfficialUpdates({ count: 100 });
    
    const stats = {};
    
    // Initialize stats
    Object.keys(DISASTER_KEYWORDS).forEach(type => {
      stats[type] = { count: 0, latestDate: null };
    });

    // Count by disaster type
    allUpdates.forEach(item => {
      const searchText = `${item.title} ${item.description}`.toLowerCase();
      
      Object.keys(DISASTER_KEYWORDS).forEach(disasterType => {
        const keywords = DISASTER_KEYWORDS[disasterType];
        const matches = keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
        
        if (matches) {
          stats[disasterType].count++;
          const itemDate = new Date(item.pubDate);
          if (!stats[disasterType].latestDate || itemDate > new Date(stats[disasterType].latestDate)) {
            stats[disasterType].latestDate = item.pubDate;
          }
        }
      });
    });

    // Add metadata
    const statsWithMeta = {
      ...stats,
      metadata: {
        totalItems: allUpdates.length,
        generatedAt: new Date().toISOString(),
        totalDisasterTypes: Object.values(stats).filter(s => s.count > 0).length
      }
    };

    // Cache for 2 hours
    await cacheService.set(cacheKey, statsWithMeta, 7200);
    
    logger.info('Successfully calculated disaster statistics', { 
      totalTypes: statsWithMeta.metadata.totalDisasterTypes,
      totalItems: statsWithMeta.metadata.totalItems
    });

    return statsWithMeta;

  } catch (error) {
    logger.error('Error calculating disaster stats', { error: error.message });
    return { metadata: { error: error.message } };
  }
};

export const scrapingService = {
  getLatestDisasters,
  getOfficialUpdates,
  getDisasterStats,
  // Legacy support
  getUpdates: getOfficialUpdates
};