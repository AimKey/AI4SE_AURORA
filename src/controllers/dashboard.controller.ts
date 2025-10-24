import type { Request, Response } from "express";
import type { ApiResponseDTO } from "types";
import { getMuaDashboardSummary, getRecentBookingsByMUA, getMuaServices, getMuaCalendarEvents, setServiceAvailability, getServiceInsights } from "@services/dashboard.service";


export class DashboardController {
  // GET /dashboard/mua/:muaId/summary
  async getMuaSummary(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "muaId is required",
        };
        res.status(400).json(response);
        return;
      }
      const data = await getMuaDashboardSummary(muaId);
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "MUA dashboard summary retrieved successfully",
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get MUA dashboard summary",
      };
      res.status(500).json(response);
    }
  }

  // GET /dashboard/mua/:muaId/recent?limit=5
  async getMuaRecent(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      const { limit = "5" } = req.query as Record<string, string>;
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "muaId is required",
        };
        res.status(400).json(response);
        return;
      }
      const data = await getRecentBookingsByMUA(muaId, Number(limit));
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "MUA recent bookings retrieved successfully",
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get MUA recent bookings",
      };
      res.status(500).json(response);
    }
  }

  // GET /dashboard/mua/:muaId/services
  async getMuaServices(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "muaId is required",
        };
        res.status(400).json(response);
        return;
      }
      const data = await getMuaServices(muaId);
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "MUA services retrieved successfully",
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get MUA services",
      };
      res.status(500).json(response);
    }
  }

  // GET /dashboard/mua/:muaId/service-insights?limit=5
  async getServiceInsights(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      const { limit = "5" } = req.query as Record<string, string>;
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "muaId is required",
        };
        res.status(400).json(response);
        return;
      }
      const data = await getServiceInsights(muaId, Number(limit));
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Service insights retrieved successfully",
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get service insights",
      };
      res.status(500).json(response);
    }
  }

  // GET /dashboard/mua/:muaId/calendar?year=2024&month=12
  async getMuaCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      const { year = new Date().getFullYear().toString(), month = (new Date().getMonth() + 1).toString() } = req.query as Record<string, string>;
      
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "muaId is required",
        };
        res.status(400).json(response);
        return;
      }
      
      const data = await getMuaCalendarEvents(muaId, Number(year), Number(month));
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "MUA calendar events retrieved successfully",
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get MUA calendar events",
      };
      res.status(500).json(response);
    }
  }

  // PATCH /dashboard/mua/:muaId/services/:serviceId/availability
  async setServiceAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params as { serviceId: string };
      const { isAvailable } = req.body as { isAvailable: boolean };
      if (typeof isAvailable !== 'boolean') {
        res.status(400).json({ status: 400, success: false, message: 'isAvailable must be boolean' });
        return;
      }
      const updated = await setServiceAvailability(serviceId, isAvailable);
      res.status(200).json({ status: 200, success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ status: 500, success: false, message: error?.message || 'Failed to set availability' });
    }
  }
}
