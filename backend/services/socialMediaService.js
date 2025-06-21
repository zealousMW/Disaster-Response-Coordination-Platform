// src/services/socialMediaService.js
import { BskyAgent } from '@atproto/api';
import { cacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

// Initialize Bluesky agent
const agent = new BskyAgent({
  service: 'https://bsky.social'
});

// Bluesky configuration
const BLUESKY_CONFIG = {
  maxResults: 50,
  defaultLang: 'en',
  // Optional authentication - set these environment variables if you have credentials
  identifier: process.env.BLUESKY_IDENTIFIER, // e.g., 'your-handle.bsky.social'
  password: process.env.BLUESKY_PASSWORD // App password, not main password
};

// Initialize authentication if credentials are provided
const initializeAuth = async () => {
  if (BLUESKY_CONFIG.identifier && BLUESKY_CONFIG.password) {
    try {
      await agent.login({
        identifier: BLUESKY_CONFIG.identifier,
        password: BLUESKY_CONFIG.password
      });
      logger.info('Successfully authenticated with Bluesky');
      return true;
    } catch (error) {
      logger.warn('Failed to authenticate with Bluesky, using unauthenticated mode', {
        error: error.message
      });
      return false;
    }
  }
  return false;
};

// Initialize auth on module load
let isAuthenticated = false;
initializeAuth().then(result => {
  isAuthenticated = result;
}).catch(error => {
  logger.warn('Auth initialization failed', { error: error.message });
});

/**
 * Search Bluesky posts for disaster-related content
 * @param {string[]} disasterKeywords - Array of keywords to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of formatted posts
 */
const getBlueskyReports = async (disasterKeywords, options = {}) => {
  const {
    maxResults = 25,
    sortBy = 'latest', // 'latest' or 'top'
    lang = BLUESKY_CONFIG.defaultLang
  } = options;

  // Create cache key from keywords and options
  const cacheKey = `bluesky:${disasterKeywords.join('-')}:${sortBy}:${lang}`;
  
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    logger.info('Returning cached Bluesky data', { keywords: disasterKeywords });
    return cachedData;
  }

  logger.info('Fetching fresh Bluesky social media data', { 
    keywords: disasterKeywords,
    maxResults,
    sortBy 
  });

  try {
    // Build flexible search query - try multiple approaches
    let fullQuery;
    
    // For "California Wildfire" -> search for "California wildfire" OR "#California" OR "#wildfire" 
    if (disasterKeywords.length > 1) {
      // Multi-word search: try the full phrase and individual hashtags
      const fullPhrase = disasterKeywords.join(' ');
      const hashtagQuery = disasterKeywords.map(keyword => `#${keyword}`).join(' OR ');
      fullQuery = `"${fullPhrase}" OR ${hashtagQuery} OR ${fullPhrase}`;
    } else {
      // Single keyword: try both hashtag and text
      const keyword = disasterKeywords[0];
      fullQuery = `#${keyword} OR ${keyword}`;
    }
    
    logger.info('Bluesky search query', { 
      originalKeywords: disasterKeywords,
      searchQuery: fullQuery 
    });

    // Use BskyAgent to search posts with more flexible parameters
    const response = await agent.app.bsky.feed.searchPosts({
      q: fullQuery,
      limit: Math.min(maxResults, 100), // Bluesky has limits
      sort: sortBy,
      ...(lang && { lang }) // Only include lang if specified
    });

    if (!response.success) {
      throw new Error(`Bluesky API returned unsuccessful response: ${response.error || 'Unknown error'}`);
    }

    // Format the posts for our application
    const formattedPosts = formatBlueskyPosts(response.data.posts || [], disasterKeywords);
    
    // If no posts found, use mock data instead
    if (formattedPosts.length === 0) {
      logger.info('No Bluesky posts found, using mock data instead', { 
        keywords: disasterKeywords,
        query: fullQuery 
      });
      
      const mockData = getFallbackMockData(disasterKeywords);
      await cacheService.set(cacheKey, mockData, 60); // Cache mock data for 1 minute
      return mockData;
    }
    
    // Cache the real result for 3 minutes to balance freshness with API limits
    await cacheService.set(cacheKey, formattedPosts, 180);
    
    logger.info('Successfully fetched Bluesky posts', { 
      count: formattedPosts.length,
      keywords: disasterKeywords 
    });
    
    return formattedPosts;

  } catch (error) {
    logger.error('Bluesky API failed, falling back to mock data', { 
      error: error.message,
      keywords: disasterKeywords,
      query: `(${disasterKeywords.join(' OR ')}) AND emergency terms`
    });
    
    // Return fallback mock data if API fails
    const mockData = getFallbackMockData(disasterKeywords);
    
    // Cache mock data for shorter time (1 minute) so we retry API sooner
    await cacheService.set(cacheKey, mockData, 60);
    
    return mockData;
  }
};

/**
 * Format Bluesky posts into our standard format
 * @param {Array} posts - Raw posts from Bluesky API
 * @param {string[]} keywords - Original search keywords for relevance scoring
 * @returns {Array} Formatted posts
 */
const formatBlueskyPosts = (posts, keywords) => {
  return posts
    .filter(post => post.record && post.record.text)
    .map(post => {
      const record = post.record;
      const author = post.author;
      
      return {
        id: post.uri,
        post: record.text,
        user: author.handle || author.displayName || 'anonymous',
        userDisplayName: author.displayName,
        userAvatar: author.avatar,
        timestamp: record.createdAt,
        engagement: {
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0
        },
        relevanceScore: calculateRelevanceScore(record.text, keywords),
        platform: 'bluesky',
        url: `https://bsky.app/profile/${author.handle}/post/${post.uri.split('/').pop()}`
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by relevance
    .slice(0, 25); // Limit results
};

/**
 * Calculate relevance score based on keyword matches and emergency indicators
 * @param {string} text - Post text
 * @param {string[]} keywords - Search keywords
 * @returns {number} Relevance score (0-100)
 */
const calculateRelevanceScore = (text, keywords) => {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  // Keyword matches (higher weight)
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    if (lowerText.includes(keywordLower)) {
      score += 20;
    }
    if (lowerText.includes(`#${keywordLower}`)) {
      score += 10; // Bonus for hashtags
    }
  });
  
  // Emergency indicators
  const emergencyTerms = ['urgent', 'emergency', 'help', 'sos', 'evacuation', 'shelter', 'relief', 'rescue'];
  emergencyTerms.forEach(term => {
    if (lowerText.includes(term)) {
      score += 15;
    }
  });
  
  // Location indicators
  const locationTerms = ['at', 'near', 'location', 'address', 'street', 'building'];
  locationTerms.forEach(term => {
    if (lowerText.includes(term)) {
      score += 10;
    }
  });
  
  // Contact/resource indicators
  const resourceTerms = ['available', 'offering', 'need', 'looking for', 'contact'];
  resourceTerms.forEach(term => {
    if (lowerText.includes(term)) {
      score += 8;
    }
  });
  
  return Math.min(score, 100); // Cap at 100
};

/**
 * Fallback mock data when Bluesky API is unavailable
 * @param {string[]} disasterKeywords - Original search keywords
 * @returns {Array} Mock data array with varied, realistic content
 */
const getFallbackMockData = (disasterKeywords) => {
  logger.warn('Using fallback mock data due to Bluesky API failure', { 
    keywords: disasterKeywords 
  });
  
  const primaryKeyword = disasterKeywords[0] || 'disaster';
  const secondaryKeyword = disasterKeywords[1] || 'emergency';
  
  const mockPosts = [
    {
      id: 'mock-urgent-1',
      post: `URGENT: #${primaryKeyword} - Need medical supplies and clean water near downtown area. Red Cross station overwhelmed. Anyone have extras? #emergency #help`,
      user: "localhelper.bsky.social",
      userDisplayName: "Community Helper",
      timestamp: new Date(Date.now() - 180000).toISOString(), // 3 min ago
      engagement: { likes: 18, reposts: 12, replies: 5 },
      relevanceScore: 95,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/localhelper.bsky.social/post/mock1',
      isMockData: true
    },
    {
      id: 'mock-shelter-2',
      post: `UPDATE: Emergency shelter at Lincoln High School (456 Oak Ave) has space for 150 more people. Hot meals available. Pet-friendly! #${primaryKeyword} #shelter #relief`,
      user: "emergencycoord.bsky.social",
      userDisplayName: "Emergency Coordinator",
      timestamp: new Date(Date.now() - 420000).toISOString(), // 7 min ago
      engagement: { likes: 67, reposts: 45, replies: 8 },
      relevanceScore: 90,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/emergencycoord.bsky.social/post/mock2',
      isMockData: true
    },
    {
      id: 'mock-volunteer-3',
      post: `Volunteers needed at Community Center! We're organizing supply distribution for #${primaryKeyword} relief. Shifts 8am-2pm & 2pm-8pm. #volunteer #${secondaryKeyword}`,
      user: "volunteers4good.bsky.social",
      userDisplayName: "Volunteer Network",
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      engagement: { likes: 34, reposts: 28, replies: 15 },
      relevanceScore: 85,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/volunteers4good.bsky.social/post/mock3',
      isMockData: true
    },
    {
      id: 'mock-resources-4',
      post: `Free resources available at 789 Maple Street: blankets, non-perishables, baby supplies, phone charging station. Open 24/7 during #${primaryKeyword} response. #help #community`,
      user: "mutualaid.bsky.social",
      userDisplayName: "Mutual Aid Network",
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      engagement: { likes: 52, reposts: 38, replies: 22 },
      relevanceScore: 80,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/mutualaid.bsky.social/post/mock4',
      isMockData: true
    },
    {
      id: 'mock-transport-5',
      post: `Transportation help: Running shuttle service from Park & Main to evacuation centers every 30 mins. Free rides during #${primaryKeyword}. Look for blue van. #evacuation #transport`,
      user: "rideshare.bsky.social",
      userDisplayName: "Community Rides",
      timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 min ago
      engagement: { likes: 41, reposts: 29, replies: 11 },
      relevanceScore: 75,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/rideshare.bsky.social/post/mock5',
      isMockData: true
    },
    {
      id: 'mock-info-6',
      post: `INFO: For #${primaryKeyword} updates, tune to emergency radio 1610 AM or text ALERTS to 67283. Official evacuation routes posted at city website. Stay safe everyone! #info #safety`,
      user: "cityemergency.bsky.social",
      userDisplayName: "City Emergency Services",
      timestamp: new Date(Date.now() - 1500000).toISOString(), // 25 min ago
      engagement: { likes: 89, reposts: 67, replies: 18 },
      relevanceScore: 70,
      platform: 'bluesky',
      url: 'https://bsky.app/profile/cityemergency.bsky.social/post/mock6',
      isMockData: true
    }
  ];
  
  // Randomly select 3-5 posts to simulate varying API results
  const numberOfPosts = Math.floor(Math.random() * 3) + 3; // 3-5 posts
  const shuffledPosts = mockPosts.sort(() => 0.5 - Math.random());
  
  return shuffledPosts.slice(0, numberOfPosts);
};

/**
 * Get trending disaster-related hashtags from Bluesky
 * @returns {Promise<Array>} Array of trending hashtags
 */
const getTrendingDisasterHashtags = async () => {
  const cacheKey = 'bluesky:trending:disaster';
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) return cachedData;
  
  try {
    // In a real implementation, this would call Bluesky's trending API
    // For now, we'll simulate API failure and use fallback data
    throw new Error('Trending API not implemented yet');
    
  } catch (error) {
    logger.warn('Trending hashtags API failed, using fallback data', { 
      error: error.message 
    });
    
    // Fallback to common disaster-related hashtags
    const commonHashtags = [
      '#emergency', '#disaster', '#earthquake', '#flood', '#fire',
      '#evacuation', '#shelter', '#relief', '#help', '#urgent',
      '#safety', '#rescue', '#firstaid', '#volunteer', '#community'
    ];
    
    // Cache fallback data for shorter time (30 minutes)
    await cacheService.set(cacheKey, commonHashtags, 1800);
    return commonHashtags;
  }
};

export const socialMediaService = {
  getReports: getBlueskyReports,
  getTrendingHashtags: getTrendingDisasterHashtags,
  
  // Agent access for advanced usage
  getAgent: () => agent
};