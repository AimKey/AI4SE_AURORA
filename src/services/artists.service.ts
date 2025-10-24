import mongoose from "mongoose";
import { MUA } from "../models/muas.models";
import { ServicePackage } from "../models/services.models";
import { Portfolio } from "../models/portfolios.models";
import { User } from "../models/users.models";
import type { 
  GetArtistsQueryDTO, 
  GetArtistServicesQueryDTO,
  ArtistsListResponseDTO,
  ServicesListResponseDTO,
  ArtistResponseDTO,
  ArtistServiceResponseDTO
} from "../types/artists.dtos";

import type { ServiceResponseDTO } from "../types/service.dtos";
import { MUA_STATUS } from "../constants/index";
import { 
  buildArtistMatchQuery,
  buildServiceMatchQuery,
  buildSortQuery,
  calculatePagination,
  parseAddonsQuery,
  normalizePagination
} from "../utils/artists.utils";

export class ArtistsService {
  
  /**
   * Get paginated list of artists with comprehensive filtering
   * Includes service preview (max 2 services per artist)
   */ 
  async getArtistServicesPackage(muaId: string): Promise<ServiceResponseDTO[]> {
    if (!mongoose.isValidObjectId(muaId)) return [];
    const _id = new mongoose.Types.ObjectId(muaId);
    
    // Check if MUA is approved first
    const mua = await MUA.findOne({ _id, status: MUA_STATUS.APPROVED });
    if (!mua) return [];
    
    const docs = await ServicePackage.find({ muaId: _id, isAvailable: { $ne: false } })
      .select("_id muaId name description price duration imageUrl isAvailable createdAt updatedAt")
      .sort({ price: 1 })
      .lean();
    return docs.map((d: any) => ({
      _id: String(d._id),
      muaId: String(d.muaId),
      name: d.name ?? "",
      description: d.description ?? "",
      imageUrl: d.imageUrl ?? "",
      duration: typeof d.duration === 'number' ? d.duration : 0,
      price: typeof d.price === 'number' ? d.price : 0,
      isActive: d.isAvailable !== false,
      createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt ?? Date.now()),
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt : new Date(d.updatedAt ?? d.createdAt ?? Date.now()),
    }));
  }

  async getArtists(query: GetArtistsQueryDTO): Promise<ArtistsListResponseDTO> {
    try {
      // Normalize pagination parameters
      const { page, limit, skip } = normalizePagination(query.page, query.limit);
      
      // Parse addons query parameter
      const addons = parseAddonsQuery(query.addons);
      const normalizedQuery = { ...query, addons };

      // Build match queries
      const artistMatch = buildArtistMatchQuery(normalizedQuery);
      const serviceMatch = buildServiceMatchQuery(normalizedQuery);
      const sortQuery = buildSortQuery(query.sort);

      // MongoDB aggregation pipeline
      const pipeline = [
        // Join with User collection to get fullName and avatarUrl
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        
        // Apply artist-level filters - only approved MUAs
        { $match: { ...artistMatch, status: MUA_STATUS.APPROVED, 'user.status': 'ACTIVE' } },
        
        // Join with ServicePackage collection
        {
          $lookup: {
            from: 'servicepackages',
            localField: '_id',
            foreignField: 'muaId',
            as: 'allServices'
          }
        },
        
        // Filter services based on query parameters
        {
          $addFields: {
            filteredServices: {
              $filter: {
                input: '$allServices',
                cond: this.buildServiceFilterCondition(serviceMatch)
              }
            }
          }
        },
        
        // Only include artists who have matching services (if service filters applied)
        ...(this.hasServiceFilters(normalizedQuery) ? [
          { $match: { 'filteredServices.0': { $exists: true } } }
        ] : []),
        
        // Lookup feedbacks to compute live rating and review count
        {
          $lookup: {
            from: 'feedbacks',
            let: { id: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$muaId', '$$id'] } } },
              { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } }
            ],
            as: 'fbStats'
          }
        },
        {
          $addFields: {
            ratingAverage: {
              $round: [ { $ifNull: [ { $arrayElemAt: ['$fbStats.avg', 0] }, '$ratingAverage', 0 ] }, 1 ]
            },
            feedbackCount: { $ifNull: [ { $arrayElemAt: ['$fbStats.cnt', 0] }, '$feedbackCount', 0 ] }
          }
        },
        
        // Calculate minPrice from all available services
        {
          $addFields: {
            minPrice: {
              $min: {
                $map: {
                  input: {
                    $filter: {
                      input: '$allServices',
                      cond: { $eq: ['$$this.isAvailable', true] }
                    }
                  },
                  in: '$$this.price'
                }
              }
            },
            // Get top 2 services for preview (sorted by bookingCount desc)
            servicePreview: {
              $slice: [
                {
                  $sortArray: {
                    input: '$filteredServices',
                    sortBy: { bookingCount: -1, createdAt: -1 }
                  }
                },
                2
              ]
            },
            totalServices: { $size: '$filteredServices' }
          }
        },
        
        // Apply sorting
        { $sort: sortQuery },
        
        // Facet for pagination
        {
          $facet: {
            items: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  fullName: '$user.fullName',
                  avatarUrl: '$user.avatarUrl',
                  location: 1,
                  bio: 1,
                  experienceYears: 1,
                  ratingAverage: 1,
                  feedbackCount: 1,
                  bookingCount: 1,
                  isVerified: 1,
                  minPrice: 1,
                  services: {
                    $map: {
                      input: '$servicePreview',
                      as: 'service',
                      in: {
                        _id: '$$service._id',
                        name: '$$service.name',
                        price: '$$service.price',
                        duration: '$$service.duration',
                        benefits: '$$service.benefits',
                        addons: '$$service.addons',
                        images: '$$service.images'
                      }
                    }
                  },
                  totalServices: 1
                }
              }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const result = await MUA.aggregate(pipeline);
      const items = result[0]?.items || [];
      const total = result[0]?.totalCount[0]?.count || 0;
      
      const pagination = calculatePagination(total, page, limit);

      return {
        items,
        total,
        pages: pagination.pages,
        page
      };
      
    } catch (error) {
      throw new Error(`Failed to fetch artists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get paginated services for a specific artist
   */
  async getArtistServices(
    artistId: string, 
    query: GetArtistServicesQueryDTO
  ): Promise<ServicesListResponseDTO> {
    try {
      // Verify artist exists and is approved
      const artist = await MUA.findOne({ 
        _id: artistId, 
        status: MUA_STATUS.APPROVED 
      });
      if (!artist) {
        throw new Error('Artist not found or not approved');
      }

      // Normalize pagination
      const { page, limit, skip } = normalizePagination(query.page, query.limit);
      
      // Build service match query
      const match: Record<string, any> = {
        muaId: artist._id,
        isAvailable: true
      };

      // Category filter
      if (query.category) {
        match.category = query.category;
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

      // Text search
      if (query.q) {
        match.$or = [
          { name: new RegExp(query.q, 'i') },
          { description: new RegExp(query.q, 'i') }
        ];
      }

      // Build sort query
      const sort = this.buildServiceSortQuery(query.sort);

      // Execute queries
      const [services, total] = await Promise.all([
        ServicePackage.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        ServicePackage.countDocuments(match)
      ]);

      const pagination = calculatePagination(total, page, limit);

      return {
        items: services.map(this.formatServiceResponseDTO),
        total,
        pages: pagination.pages,
        page
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single artist by ID with basic info
   */
  async getArtistById(artistId: string): Promise<ArtistResponseDTO> {
    try {
      const pipeline = [
        { $match: { _id: artistId, status: MUA_STATUS.APPROVED } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'servicepackages',
            localField: '_id',
            foreignField: 'muaId',
            as: 'services'
          }
        },
        {
          $project: {
            _id: 1,
            fullName: '$user.fullName',
            avatarUrl: '$user.avatarUrl',
            location: 1,
            bio: 1,
            experienceYears: 1,
            ratingAverage: 1,
            feedbackCount: 1,
            bookingCount: 1,
            isVerified: 1,
            minPrice: {
              $min: {
                $map: {
                  input: {
                    $filter: {
                      input: '$services',
                      cond: { $eq: ['$$this.isAvailable', true] }
                    }
                  },
                  in: '$$this.price'
                }
              }
            },
            totalServices: {
              $size: {
                $filter: {
                  input: '$services',
                  cond: { $eq: ['$$this.isAvailable', true] }
                }
              }
            }
          }
        }
      ];

      const result = await MUA.aggregate(pipeline);
      if (!result[0]) {
        throw new Error('Artist not found');
      }

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get portfolio items for a specific artist
   */
  async getArtistPortfolio(
    artistId: string, 
    query: { category?: string; page?: number; limit?: number }
  ): Promise<any> {
    try {
      // Convert string to ObjectId and verify artist exists and is approved
      const objectId = new mongoose.Types.ObjectId(artistId);
      const artist = await MUA.findOne({ 
        _id: objectId, 
        status: MUA_STATUS.APPROVED 
      });
      if (!artist) {
        throw new Error('Artist not found or not approved');
      }

      // Normalize pagination
      const { page, limit, skip } = normalizePagination(query.page, query.limit);
      
      // Build match query
      const match: Record<string, any> = {
        muaId: objectId
      };

      // Category filter
      if (query.category && query.category !== 'all') {
        match.category = query.category;
      }

      // Execute queries
      const [portfolioItems, total] = await Promise.all([
        Portfolio.find(match)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Portfolio.countDocuments(match)
      ]);

      const pagination = calculatePagination(total, page, limit);

      return {
        items: portfolioItems.map(this.formatPortfolioResponse),
        total,
        pages: pagination.pages,
        page
      };

    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        throw new Error('Invalid artist ID format');
      }
      throw error;
    }
  }

  /**
   * Get comprehensive artist details including services and portfolio
   */
  async getArtistDetail(artistId: string): Promise<any> {
    try {
      // Convert string to ObjectId
      const objectId = new mongoose.Types.ObjectId(artistId);
      
      // Get artist with user data
      const artistPipeline = [
        { $match: { _id: objectId, status: MUA_STATUS.APPROVED } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'servicepackages',
            localField: '_id',
            foreignField: 'muaId',
            as: 'services'
          }
        },
        {
          $project: {
            _id: 1,
            fullName: '$user.fullName',
            avatarUrl: '$user.avatarUrl',
            location: 1,
            bio: 1,
            experienceYears: 1,
            ratingAverage: 1,
            feedbackCount: 1,
            bookingCount: 1,
            isVerified: 1
          }
        }
      ];

      const [artistResult] = await MUA.aggregate(artistPipeline);
      if (!artistResult) {
        throw new Error('Artist not found');
      }

      // Get services
      const services = await ServicePackage.find({
        muaId: objectId,
        isAvailable: true
      })
      .sort({ bookingCount: -1, createdAt: -1 })
      .limit(20)
      .lean();

      // Get portfolio items
      const portfolioItems = await Portfolio.find({
        muaId: objectId
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      return {
        artist: artistResult,
        services: services.map(this.formatServiceResponseDTO),
        portfolio: portfolioItems.map(this.formatPortfolioResponse)
      };

    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        throw new Error('Invalid artist ID format');
      }
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Build MongoDB condition for service filtering in aggregation
   */
  private buildServiceFilterCondition(serviceMatch: Record<string, any>) {
    const conditions: any[] = [];

    Object.entries(serviceMatch).forEach(([key, value]) => {
      if (key === 'isAvailable') {
        conditions.push({ $eq: [`$$this.${key}`, value] });
      } else if (key === 'category') {
        conditions.push({ $eq: [`$$this.${key}`, value] });
      } else if (key === 'price' && typeof value === 'object') {
        if (value.$gte) conditions.push({ $gte: [`$$this.${key}`, value.$gte] });
        if (value.$lte) conditions.push({ $lte: [`$$this.${key}`, value.$lte] });
      } else if (key === 'addons' && value.$in) {
        conditions.push({ $gt: [{ $size: { $setIntersection: [`$$this.${key}`, value.$in] } }, 0] });
      }
    });

    return conditions.length > 0 ? { $and: conditions } : true;
  }

  /**
   * Check if query has service-related filters
   */
  private hasServiceFilters(query: GetArtistsQueryDTO): boolean {
    return !!(
      query.occasion && query.occasion !== 'all' ||
      query.style ||
      query.priceMin ||
      query.priceMax ||
      (query.addons && query.addons.length > 0)
    );
  }

  /**
   * Build sort query for services
   */
  private buildServiceSortQuery(sortKey?: string): Record<string, 1 | -1> {
    switch (sortKey) {
      case 'price_asc':
        return { price: 1 };
      case 'price_desc':
        return { price: -1 };
      case 'newest':
        return { createdAt: -1 };
      default:
        return { bookingCount: -1, createdAt: -1 };
    }
  }

  /**
   * Format service document to ServiceResponseDTO (for compatibility with existing API)
   */
  private formatServiceResponseDTO(service: any): ServiceResponseDTO {
    return {
      _id: service._id.toString(),
      muaId: service.muaId.toString(),
      name: service.name,
      description: service.description || '',
      imageUrl: service.images?.[0] || service.imageUrl || '',
      duration: service.duration,
      price: service.price,
      isActive: service.isAvailable !== false,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt || service.createdAt
    };
  }

  /**
   * Format service document to ArtistServiceResponseDTO (for artist-specific service data)
   */
  private formatArtistServiceResponse(service: any): ArtistServiceResponseDTO {
    return {
      _id: service._id.toString(),
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: service.category,
      addons: service.addons,
      benefits: service.benefits,
      images: service.images,
      isAvailable: service.isAvailable,
      bookingCount: service.bookingCount || 0,
      createdAt: service.createdAt
    };
  }

  /**
   * Format portfolio document to response DTO
   */
  private formatPortfolioResponse(portfolio: any) {
    return {
      _id: portfolio._id.toString(),
      title: portfolio.title,
      description: portfolio.description,
      category: portfolio.category,
      tags: portfolio.tags,
      media: portfolio.media,
      createdAt: portfolio.createdAt
    };
  }
}