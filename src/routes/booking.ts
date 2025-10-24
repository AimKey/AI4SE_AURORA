import { Router } from "express";
import { authenticateToken } from "middleware/auth.middleware";
import { BookingController } from "@controllers/booking.controller";

const router = Router();
const ctrl = new BookingController();

// CREATE - Tạo booking mới
router.post("/", authenticateToken, (req, res) => ctrl.create(req, res));
router.post("/pending", authenticateToken, (req, res) => ctrl.setRedisPendingBooking(req, res));

// READ - Lấy booking theo ID
router.get("/by-id/:id", authenticateToken, (req, res) => ctrl.getById(req, res));

// READ - Lấy tất cả bookings với phân trang và filter
router.get("/", authenticateToken, (req, res) => ctrl.getAll(req, res));

// READ - Lấy bookings theo customer ID
router.get("/customer/:customerId", authenticateToken, (req, res) => ctrl.getByCustomer(req, res));

// READ - Lấy bookings theo MUA ID
router.get("/mua/:muaId", authenticateToken, (req, res) => ctrl.getByMUA(req, res));

// READ - Lấy bookings theo ngày
router.get("/date/:date", authenticateToken, (req, res) => ctrl.getByDate(req, res));

// READ - Lấy available time slots
router.get("/available-slots", authenticateToken, (req, res) => ctrl.getAvailableSlots(req, res));
// READ - Lấy available time slots theo tháng
router.get("/available-slots/monthly", authenticateToken, (req, res) => ctrl.getMonthlyAvailable(req, res));
//Read
router.get("/available-mua/:day", (req, res) => ctrl.getAvailableMuaServicesByDay(req, res));
// UPDATE - Cập nhật booking
router.put("/:id", authenticateToken, (req, res) => ctrl.update(req, res));

// UPDATE - Cập nhật status booking
router.patch("/:id/status", authenticateToken, (req, res) => ctrl.updateStatus(req, res));

// UPDATE - Accept booking request (MUA calendar)
router.patch("/:id/accept", authenticateToken, (req, res) => ctrl.acceptBooking(req, res));

// UPDATE - Reject booking request (MUA calendar)
router.patch("/:id/reject", authenticateToken, (req, res) => ctrl.rejectBooking(req, res));

// PATCH - Mark booking as COMPLETED
router.patch("/:id/complete", authenticateToken, (req, res) => ctrl.markCompleted(req, res));

// DELETE - Cancel booking (soft delete)
router.patch("/:id/cancel", authenticateToken, (req, res) => ctrl.cancel(req, res));

// DELETE - Xóa booking hoàn toàn (hard delete)
router.delete("/:id", authenticateToken, (req, res) => ctrl.delete(req, res));

export default router;
