import { Router } from "express";
import { authenticateToken } from "middleware/auth.middleware";
import { ArtistsScheduleController } from "@controllers/artist-schedule.controller";

const router = Router();
const ctrl = new ArtistsScheduleController();

router.get("/:muaId/week/final", authenticateToken, (req, res) => ctrl.getArtistWeeklyFinalSlots(req, res));
router.get("/:muaId/week/original", authenticateToken, (req, res) => ctrl.getArtistWeeklyOriginalSlots(req, res));
router.get("/:muaId/booking/pending", authenticateToken, (req, res) => ctrl.getPendingBookings(req, res));
router.post("/:muaId/slot/working", authenticateToken, (req, res) => ctrl.addWorkingSlot(req, res));
router.post("/:muaId/slot/override", authenticateToken, (req, res) => ctrl.addOverrideSlot(req, res));
router.post("/:muaId/slot/blocked", authenticateToken, (req, res) => ctrl.addBlockedSlot(req, res));
 router.put("/:muaId/slot/working/:slotId", authenticateToken, (req, res) => ctrl.updateWorkingSlot(req, res));
 router.put("/:muaId/slot/override/:slotId", authenticateToken, (req, res) => ctrl.updateOverrideSlot(req, res));
 router.put("/:muaId/slot/blocked/:slotId", authenticateToken, (req, res) => ctrl.updateBlockedSlot(req, res));
 router.delete("/:muaId/slot/working/:slotId", authenticateToken, (req, res) => ctrl.deleteWorkingSlot(req, res));
 router.delete("/:muaId/slot/override/:slotId", authenticateToken, (req, res) => ctrl.deleteOverrideSlot(req, res));
 router.delete("/:muaId/slot/blocked/:slotId", authenticateToken, (req, res) => ctrl.deleteBlockedSlot(req, res));


export default router;
