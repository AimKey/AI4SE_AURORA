// apps/backend/src/controllers/artist-schedule.controller.ts
import type { Request, Response } from "express";
import { ArtistsService } from "../services/artists.service";
import { getFinalSlots, getOriginalWorkingSlots, getPendingBookingSlots } from "../services/schedule.service";
import { addWorkingSlot, addOverrideSlot, addBlockedSlot, updateWorkingSlot, updateOverrideSlot, updateBlockedSlot, deleteWorkingSlot, deleteOverrideSlot, deleteBlockedSlot } from "../services/slot.service";
import type { ApiResponseDTO } from "../types";

export class ArtistsScheduleController {
  // ====================== WORKING SLOT ======================

  // Add
  async addWorkingSlot(req: Request, res: Response) {
    const { muaId, weekday, startTime, endTime, note } = req.body;
    try {
      const slot = await addWorkingSlot(muaId, weekday, startTime, endTime, note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(201).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to add working slot",
      };
      res.status(400).json(response);
    }
  }

  // Update
  async updateWorkingSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    const { weekday, startTime, endTime, note } = req.body;
    try {
      const slot = await updateWorkingSlot(slotId, weekday, startTime, endTime, note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to update working slot",
      };
      res.status(400).json(response);
    }
  }

  // Delete
  async deleteWorkingSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    try {
      const deleted = await deleteWorkingSlot(slotId);
      const response: ApiResponseDTO = { success: true, data: deleted };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to delete working slot",
      };
      res.status(400).json(response);
    }
  }

  // ====================== OVERRIDE SLOT ======================

  // Add
  async addOverrideSlot(req: Request, res: Response) {
    const { muaId, overrideStart, overrideEnd, note } = req.body;
    try {
      const slot = await addOverrideSlot(muaId, new Date(overrideStart), new Date(overrideEnd), note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(201).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to add override slot",
      };
      res.status(400).json(response);
    }
  }

  // Update
  async updateOverrideSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    const { overrideStart, overrideEnd, note } = req.body;
    try {
      const slot = await updateOverrideSlot(slotId, new Date(overrideStart), new Date(overrideEnd), note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to update override slot",
      };
      res.status(400).json(response);
    }
  }

  // Delete
  async deleteOverrideSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    try {
      const deleted = await deleteOverrideSlot(slotId);
      const response: ApiResponseDTO = { success: true, data: deleted };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to delete override slot",
      };
      res.status(400).json(response);
    }
  }

  // ====================== BLOCKED SLOT ======================

  // Add
  async addBlockedSlot(req: Request, res: Response) {
    const { muaId, blockStart, blockEnd, note } = req.body;
    try {
      const slot = await addBlockedSlot(muaId, new Date(blockStart), new Date(blockEnd), note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(201).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to add blocked slot",
      };
      res.status(400).json(response);
    }
  }

  // Update
  async updateBlockedSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    const { blockStart, blockEnd, note } = req.body;
    try {
      const slot = await updateBlockedSlot(slotId, new Date(blockStart), new Date(blockEnd), note);
      const response: ApiResponseDTO = { success: true, data: slot };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to update blocked slot",
      };
      res.status(400).json(response);
    }
  }

  // Delete
  async deleteBlockedSlot(req: Request, res: Response) {
    const { slotId } = req.params;
    try {
      const deleted = await deleteBlockedSlot(slotId);
      const response: ApiResponseDTO = { success: true, data: deleted };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to delete blocked slot",
      };
      res.status(400).json(response);
    }
  }

  // ====================== GET WEEKLY SLOTS ======================

  async getArtistWeeklyFinalSlots(req: Request, res: Response) {
    const { muaId } = req.params;
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: "weekStart is required" });
    try {
      const data = await getFinalSlots(muaId, weekStart as string);
      const response: ApiResponseDTO = { success: true, data };
      res.status(200).json(response);
    } catch (err) {
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to get weekly final slots",
      };
      res.status(500).json(response);
    }
  }

  async getArtistWeeklyOriginalSlots(req: Request, res: Response) {
    const { muaId } = req.params;
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: "weekStart is required" });

    try {
      const data = await getOriginalWorkingSlots(muaId, weekStart as string);
      const response: ApiResponseDTO = { success: true, data };
      res.status(200).json(response);
    } catch (err) {
      console.error(err);
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to get weekly original slots",
      };
      res.status(500).json(response);
    }
  }

  async getPendingBookings(req:Request,res:Response){
    const {muaId} = req.params;
    const {pageNumber = '1', pageSize = '10'} = req.query;
    
    console.log("🔍 Controller - getPendingBookings called:", {
      muaId,
      pageNumber,
      pageSize,
      queryParams: req.query
    });
    
    try{
      const data = await getPendingBookingSlots(muaId, Number(pageNumber), Number(pageSize))
      const response: ApiResponseDTO = { success: true, data };
      res.status(200).json(response);
    }catch(err){
      console.error("❌ Controller error:", err);
      const response: ApiResponseDTO = {
        success: false,
        message: err instanceof Error ? err.message : "Failed to get weekly pending bookings",
      };
      res.status(500).json(response);
    }
  }
}
