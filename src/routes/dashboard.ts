import { Router } from "express";
import { authenticateToken } from "middleware/auth.middleware";
import { DashboardController } from "@controllers/dashboard.controller";

const router = Router();
const ctrl = new DashboardController();

// Dashboard - Summary & Recent bookings for MUA
router.get("/mua/:muaId/summary", authenticateToken, (req, res) => ctrl.getMuaSummary(req, res));
router.get("/mua/:muaId/recent", authenticateToken, (req, res) => ctrl.getMuaRecent(req, res));

// Dashboard - Services management
router.get("/mua/:muaId/services", authenticateToken, (req, res) => ctrl.getMuaServices(req, res));
router.patch("/mua/:muaId/services/:serviceId/availability", authenticateToken, (req, res) => ctrl.setServiceAvailability(req, res));

// Dashboard - Service insights
router.get("/mua/:muaId/service-insights", authenticateToken, (req, res) => ctrl.getServiceInsights(req, res));
// Dashboard - Calendar events
router.get("/mua/:muaId/calendar", authenticateToken, (req, res) => ctrl.getMuaCalendarEvents(req, res));

export default router;
