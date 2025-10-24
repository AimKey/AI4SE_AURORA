// apps/backend/src/controllers/artists.controller.ts
import type { Request, Response } from "express";
import { ArtistsService } from "../services/artists.service";
import type { 
  GetArtistsQueryDTO, 
  GetArtistServicesQueryDTO
} from "../types/artists.dtos";
import { getFinalSlots, getOriginalWorkingSlots } from "../services/schedule.service";
import type { ApiResponseDTO } from "../types";
import { parseAddonsQuery } from "../utils/artists.utils";

export class ArtistsController {
  private artistsService: ArtistsService;

  constructor() {
    this.artistsService = new ArtistsService();
  }
  
  /**
   * GET /api/artists
   * Get paginated list of artists with comprehensive filtering
   */
  async getArtists(req: Request, res: Response): Promise<void> {
    try {
      const query: GetArtistsQueryDTO = {
        q: req.query.q as string,
        location: req.query.location as string,
        occasion: req.query.occasion as string,
        style: req.query.style as string,
        rating: req.query.rating ? Number(req.query.rating) : undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        addons: parseAddonsQuery(req.query.addons as string | string[]),
        sort: req.query.sort as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      // Basic validation
      if (query.rating && (query.rating < 1 || query.rating > 5)) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
        return;
      }

      if (query.priceMin && query.priceMin < 0) {
        res.status(400).json({
          success: false,
          message: 'Minimum price cannot be negative'
        });
        return;
      }

      if (query.priceMax && query.priceMin && query.priceMax < query.priceMin) {
        res.status(400).json({
          success: false,
          message: 'Maximum price cannot be less than minimum price'
        });
        return;
      }

      const result = await this.artistsService.getArtists(query);
      
      // Return flat JSON response as requested
      res.status(200).json(result);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch artists'
      });
    }
  }

  /**
   * GET /api/artists/:id/services
   * Get paginated services for a specific artist
   */
  async getArtistServices(req: Request, res: Response): Promise<void> {
    try {
      const artistId = req.params.id;
      
      if (!artistId) {
        res.status(400).json({
          success: false,
          message: 'Artist ID is required'
        });
        return;
      }

      const query: GetArtistServicesQueryDTO = {
        category: req.query.category as any,
        q: req.query.q as string,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        addons: parseAddonsQuery(req.query.addons as string | string[]),
        sort: req.query.sort as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      // Basic validation
      if (query.priceMin && query.priceMin < 0) {
        res.status(400).json({
          success: false,
          message: 'Minimum price cannot be negative'
        });
        return;
      }

      if (query.priceMax && query.priceMin && query.priceMax < query.priceMin) {
        res.status(400).json({
          success: false,
          message: 'Maximum price cannot be less than minimum price'
        });
        return;
      }

      const result = await this.artistsService.getArtistServices(artistId, query);
      
      // Return flat JSON response
      res.status(200).json(result);
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Artist not found') {
        res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch artist services'
      });
    }
  }

  /**
   * GET /api/artists/:id
   * Get single artist by ID with basic info
   */
  async getArtistById(req: Request, res: Response): Promise<void> {
    try {
      const artistId = req.params.id;
      
      if (!artistId) {
        res.status(400).json({
          success: false,
          message: 'Artist ID is required'
        });
        return;
      }

      const result = await this.artistsService.getArtistById(artistId);
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Artist not found') {
        res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch artist'
      });
    }
  }

  /**
   * GET /api/artists/:id/portfolio
   * Get portfolio items for a specific artist
   */
  async getArtistPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const artistId = req.params.id;
      
      if (!artistId) {
        res.status(400).json({
          success: false,
          message: 'Artist ID is required'
        });
        return;
      }

      const query = {
        category: req.query.category as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.artistsService.getArtistPortfolio(artistId, query);
      
      res.status(200).json(result);
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Artist not found') {
        res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch artist portfolio'
      });
    }
  }

  /**
   * GET /api/artists/:id/detail
   * Get comprehensive artist details including services and portfolio
   */
  async getArtistDetail(req: Request, res: Response): Promise<void> {
    try {
      const artistId = req.params.id;
      
      if (!artistId) {
        res.status(400).json({
          success: false,
          message: 'Artist ID is required'
        });
        return;
      }

      const result = await this.artistsService.getArtistDetail(artistId);
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Artist not found') {
        res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
        return;
      }
      
      if (error instanceof Error && error.message === 'Invalid artist ID format') {
        res.status(400).json({
          success: false,
          message: 'Invalid artist ID format'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch artist details'
      });
    }
  }

  /**
   * POST /api/bookings
   * Simple booking creation endpoint
   */
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const { artistId, serviceId, dateISO, note } = req.body;

      // Basic validation
      if (!artistId || !serviceId || !dateISO) {
        res.status(400).json({
          success: false,
          message: 'Artist ID, service ID, and date are required'
        });
        return;
      }

      // Validate date format
      const bookingDate = new Date(dateISO);
      if (isNaN(bookingDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use ISO date format.'
        });
        return;
      }

      // Check if date is in the future
      if (bookingDate <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Booking date must be in the future'
        });
        return;
      }

      // TODO: Implement actual booking creation logic
      // For now, return a mock response
      const mockBookingId = `booking_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          bookingId: mockBookingId,
          artistId,
          serviceId,
          bookingDate: bookingDate.toISOString(),
          note: note || null,
          status: 'PENDING'
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create booking'
      });
    }
  }

  async getArtistServicesPackage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data =  await this.artistsService.getArtistServicesPackage(id);
      const response: ApiResponseDTO = { success: true, data };
      res.status(200).json(response);
    } catch (err) {
       const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to get services",
      };
      res.status(500).json(response);
    }
  }
}