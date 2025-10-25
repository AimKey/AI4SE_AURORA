// apps/backend/src/controllers/booking.controller.ts
import type { Request, Response } from "express";
import {
  createBooking,
  getBookingById,
  getAllBookings,
  getBookingsByCustomer,
  getBookingsByMUA,
  getBookingsByDate,
  updateBooking,
  updateBookingStatus,
  cancelBooking,
  // deleteBooking,
  getAvailableSlotsOfService,
  getAvailableMonthlySlots,
  // getAvailableMuaServicesByDay,
  createRedisPendingBooking,
  markBookingCompleted
} from "../services/booking.service";
import type { CreateBookingDTO, UpdateBookingDTO } from "../types/booking.dtos";
import type { ApiResponseDTO } from "types";
import { handleBalanceConfirmBooking, handleRefundBookingBeforeConfirm } from "@services/transaction.service";
import { BOOKING_STATUS } from "constants/index";
import { MUA } from "@models/muas.models";

export class BookingController {

  // READ - Lấy available slots
  // async getAvailableSlots(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { muaId, serviceId, day, duration } = req.query as Record<string, string>;

  //     if (!muaId || !serviceId || !day || !duration) {
  //       const response: ApiResponseDTO = {
  //         status: 400,
  //         success: false,
  //         message: "Missing required parameters: muaId, serviceId, day, duration"
  //       };
  //       res.status(400).json(response);
  //       return;
  //     }

  //     const data = await getAvailableSlotsOfService(
  //       muaId,
  //       serviceId,
  //       day,
  //       Number(duration)
  //     );

  //     const response: ApiResponseDTO = {
  //       status: 200,
  //       success: true,
  //       message: "Available slots retrieved successfully",
  //       data
  //     };

  //     res.status(200).json(response);
  //   } catch (error) {
  //     const response: ApiResponseDTO = {
  //       status: 500,
  //       success: false,
  //       message: error instanceof Error ? error.message : "Failed to get available slots"
  //     };
  //     res.status(500).json(response);
  //   }
  // }

  // READ - Lấy available slots theo tháng
  async getMonthlyAvailable(req: Request, res: Response): Promise<void> {
    try {
      const { muaId, year, month, duration } = req.query as Record<string, string>;

      if (!muaId || !year || !month || !duration) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "Missing required parameters: muaId, year, month, duration"
        };
        res.status(400).json(response);
        return;
      }

      const y = Number(year);
      const m = Number(month); // 1-12
      const dur = Number(duration);
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(dur) || m < 1 || m > 12) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "Invalid numeric parameters"
        };
        res.status(400).json(response);
        return;
      }

      // Build a representative day in that month (use first day)
      const day = `${y}-${String(m).padStart(2, "0")}-01`;
      const data = await getAvailableMonthlySlots(muaId, day, dur);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Monthly available slots retrieved successfully",
        data
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get monthly available slots"
      };
      res.status(500).json(response);
    }
  }

  //READ - lấy mua thỏa mãn day 
  // async getAvailableMuaServicesByDay(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { day } = req.params;
  //     const data = await getAvailableMuaServicesByDay(day);
  //     const response: ApiResponseDTO = {
  //       status: 200,
  //       success: true,
  //       message: "Available services retrieved successfully",
  //       data
  //     };
  //     res.status(200).json(response);
  //   } catch (error) {
  //     const response: ApiResponseDTO = {
  //       status: 500,
  //       success: false,
  //       message: error instanceof Error ? error.message : "Failed to get available services"
  //     };
  //     res.status(500).json(response);
  //   }
  // }

  // CREATE - Tạo booking mới
  async create(req: Request, res: Response): Promise<void> {
    try {
      const bookingData: CreateBookingDTO = req.body;
      const data = await createBooking(bookingData);

      const response: ApiResponseDTO = {
        status: 201,
        success: true,
        message: "Booking created successfully",
        data
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to create booking"
      };
      res.status(500).json(response);
    }
  }
  async setRedisPendingBooking(req: Request, res: Response): Promise<void> {
    try {
      const bookingData: CreateBookingDTO = req.body;
      const data = await createRedisPendingBooking(bookingData);

      const response: ApiResponseDTO = {
        status: 201,
        success: true,
        message: "Pending booking created successfully",
        data
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to create redis pending booking"
      };
      res.status(500).json(response);
    }
  }
  // READ - Lấy booking theo ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await getBookingById(id);

      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking retrieved successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get booking"
      };
      res.status(500).json(response);
    }
  }

  // READ - Lấy tất cả bookings với phân trang
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = "1",
        pageSize = "10",
        status
      } = req.query as Record<string, string>;

      const data = await getAllBookings(
        Number(page),
        Number(pageSize),
        status
      );

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Bookings retrieved successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get bookings"
      };
      res.status(500).json(response);
    }
  }

  // READ - Lấy bookings theo customer ID
  async getByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const {
        page = "1",
        pageSize = "10"
      } = req.query as Record<string, string>;

      const data = await getBookingsByCustomer(
        customerId,
        Number(page),
        Number(pageSize)
      );

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Customer bookings retrieved successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get customer bookings"
      };
      res.status(500).json(response);
    }
  }

  // READ - Lấy bookings theo MUA ID
  async getByMUA(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params;
      const {
        page = "1",
        pageSize = "10"
      } = req.query as Record<string, string>;

      const data = await getBookingsByMUA(
        muaId,
        Number(page),
        Number(pageSize)
      );

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "MUA bookings retrieved successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get MUA bookings"
      };
      res.status(500).json(response);
    }
  }

  // READ - Lấy bookings theo ngày
  async getByDate(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      const { muaId } = req.query as Record<string, string>;

      const data = await getBookingsByDate(date, muaId);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Bookings by date retrieved successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to get bookings by date"
      };
      res.status(500).json(response);
    }
  }

  // UPDATE - Cập nhật booking
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateBookingDTO = req.body;

      const data = await updateBooking(id, updateData);

      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking updated successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to update booking"
      };
      res.status(500).json(response);
    }
  }

  // UPDATE - Cập nhật status booking
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "Status is required"
        };
        res.status(400).json(response);
        return;
      }

      const data = await updateBookingStatus(id, status);

      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking status updated successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to update booking status"
      };
      res.status(500).json(response);
    }
  }

  // UPDATE - Accept booking request (MUA calendar)
  async acceptBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const data = await updateBookingStatus(id, BOOKING_STATUS.CONFIRMED);
      await handleBalanceConfirmBooking(id);
      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking accepted successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to accept booking"
      };
      res.status(500).json(response);
    }
  }

  // UPDATE - Reject booking request (MUA calendar)
  async rejectBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await handleRefundBookingBeforeConfirm(id, BOOKING_STATUS.REJECTED);
      const data = await updateBookingStatus(id, BOOKING_STATUS.REJECTED);
      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking rejected successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to reject booking"
      };
      res.status(500).json(response);
    }
  }

  // PATCH - Mark booking as COMPLETED (MUA ownership required)
  async markCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user: any = (req as any).user;
      let muaIdFromReq: string | undefined = user?.muaId;

      // If token doesn't carry muaId, resolve from userId -> MUA document
      if (!muaIdFromReq) {
        const userId = user?.userId || user?.id;
        if (userId) {
          const muaDoc = await MUA.findOne({ userId }).select("_id").lean();
          if (muaDoc?._id) {
            muaIdFromReq = String(muaDoc._id);
          }
        }
      }

      if (!muaIdFromReq) {
        res.status(401).json({ code: "unauthorized", message: "Unauthorized" });
        return;
      }

      const data = await markBookingCompleted(id, String(muaIdFromReq));

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking marked as completed",
        data
      };
      res.status(200).json(response);
    } catch (e: any) {
      const status = e?.status || 500;
      const code = e?.code || "internal_error";
      const message = e?.message || "Internal server error";
      const details = e?.details;
      res.status(status).json({ code, message, ...(details ? { details } : {}) });
    }
  }

  // DELETE - Cancel booking (soft delete)
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await cancelBooking(id);

      if (!data) {
        const response: ApiResponseDTO = {
          status: 404,
          success: false,
          message: "Booking not found"
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Booking cancelled successfully",
        data
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to cancel booking"
      };
      res.status(500).json(response);
    }
  }

  // DELETE - Xóa booking hoàn toàn (hard delete)
  // async delete(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { id } = req.params;
  //     const success = await deleteBooking(id);

  //     if (!success) {
  //       const response: ApiResponseDTO = {
  //         status: 404,
  //         success: false,
  //         message: "Booking not found"
  //       };
  //       res.status(404).json(response);
  //       return;
  //     }

  //     const response: ApiResponseDTO = {
  //       status: 200,
  //       success: true,
  //       message: "Booking deleted successfully"
  //     };

  //     res.status(200).json(response);
  //   } catch (error) {
  //     const response: ApiResponseDTO = {
  //       status: 500,
  //       success: false,
  //       message: error instanceof Error ? error.message : "Failed to delete booking"
  //     };
  //     res.status(500).json(response);
  //   }
  // }
}
