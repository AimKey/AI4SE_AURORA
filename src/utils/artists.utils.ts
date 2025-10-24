import type { GetArtistsQueryDTO } from '../types/artists.dtos';
import { SERVICE_CATEGORIES, SERVICE_ADDONS } from '../constants';

/**
 * Build MongoDB aggregation match stage for artist filtering
 * @param query - Query parameters from request
 * @returns MongoDB match object
 */
export function buildArtistMatchQuery(query: GetArtistsQueryDTO): Record<string, any> {
  const match: Record<string, any> = {};

  // Name and location search - combined text search
  if (query.q) {
    match.$or = [
      // Search in user's fullName (will be matched after $lookup)
      { 'user.fullName': new RegExp(query.q, 'i') },
      // Search in artist's location
      { location: new RegExp(query.q, 'i') }
    ];
  }

  // Specific location filter (if provided separately)
  if (query.location && query.location !== 'all' && query.location !== query.q) {
    match.location = new RegExp(query.location, 'i');
  }

  // Rating filter (minimum rating)
  if (query.rating && query.rating > 0) {
    match.ratingAverage = { $gte: query.rating };
  }

  return match;
}

/**
 * Build MongoDB aggregation match stage for service filtering
 * @param query - Query parameters from request
 * @returns MongoDB match object for services
 */
export function buildServiceMatchQuery(query: GetArtistsQueryDTO): Record<string, any> {
  const match: Record<string, any> = { isAvailable: true };

  // Category/occasion filter
  if (query.occasion && query.occasion !== 'all') {
    const categoryMap: Record<string, string> = {
      'bridal': SERVICE_CATEGORIES.BRIDAL,
      'party': SERVICE_CATEGORIES.PARTY,
      'wedding_guest': SERVICE_CATEGORIES.WEDDING_GUEST,
      'graduation': SERVICE_CATEGORIES.GRADUATION,
      'prom': SERVICE_CATEGORIES.PROM,
      'daily': SERVICE_CATEGORIES.DAILY,
      'special_event': SERVICE_CATEGORIES.SPECIAL_EVENT
    };
    
    if (categoryMap[query.occasion]) {
      match.category = categoryMap[query.occasion];
    }
  }

  // Price range filter
  if (query.priceMin || query.priceMax) {
    match.price = {};
    if (query.priceMin) match.price.$gte = query.priceMin;
    if (query.priceMax) match.price.$lte = query.priceMax;
  }

  // Add-ons filter
  if (query.addons && query.addons.length > 0) {
    match.addons = { $in: query.addons };
  }

  // Text search for style/tone in service name and description
  if (query.style || query.q) {
    const searchTerms = [query.style, query.q].filter(Boolean);
    if (searchTerms.length > 0) {
      match.$or = searchTerms.map(term => ({
        $or: [
          { name: new RegExp(term!, 'i') },
          { description: new RegExp(term!, 'i') }
        ]
      }));
    }
  }

  return match;
}

/**
 * Build MongoDB sort stage based on sort parameter
 * @param sortKey - Sort parameter from request
 * @returns MongoDB sort object
 */
export function buildSortQuery(sortKey?: string): Record<string, 1 | -1> {
  switch (sortKey) {
    case 'rating_desc':
      return { ratingAverage: -1, feedbackCount: -1 };
    case 'price_asc':
      return { minPrice: 1 };
    case 'price_desc':
      return { minPrice: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'popular':
      return { bookingCount: -1, ratingAverage: -1 };
    default:
      return { ratingAverage: -1, feedbackCount: -1 }; // Default to rating
  }
}

/**
 * Calculate pagination metadata
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function calculatePagination(total: number, page: number, limit: number) {
  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    pages,
    limit,
    hasNext,
    hasPrev
  };
}

/**
 * Format price to VND currency string
 * @param price - Price in VND
 * @returns Formatted price string
 */
export function formatVND(price: number): string {
  return price.toLocaleString('vi-VN') + ' VND';
}

/**
 * Parse addons from query parameter (supports both array and comma-separated string)
 * @param addons - Addons from query parameter
 * @returns Array of valid addon strings
 */
export function parseAddonsQuery(addons?: string | string[]): string[] {
  if (!addons) return [];
  
  const addonArray = Array.isArray(addons) 
    ? addons 
    : addons.split(',').map(a => a.trim());
    
  // Filter to only valid addon values
  const validAddons = Object.values(SERVICE_ADDONS);
  return addonArray.filter(addon => validAddons.includes(addon as any));
}

/**
 * Validate and normalize pagination parameters
 * @param page - Page number from query
 * @param limit - Limit from query
 * @returns Normalized pagination parameters
 */
export function normalizePagination(page?: string | number, limit?: string | number) {
  const normalizedPage = Math.max(1, parseInt(String(page || 1)));
  const normalizedLimit = Math.min(50, Math.max(1, parseInt(String(limit || 12))));
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit
  };
}
