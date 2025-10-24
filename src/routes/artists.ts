import { Router } from "express";
import { ArtistsController } from "../controllers/artists.controller";
import { authenticateToken } from "../middleware/auth.middleware"; 

const router = Router();
const artistsController = new ArtistsController();


// router.get("/", (req, res) => ctrl.list(req, res));
// router.get("/:id", (req, res) => ctrl.getDetail(req, res));
router.get("/:id/services-package", (req, res) => artistsController.getArtistServicesPackage(req, res));

// Public routes (no authentication required)
router.get('/', artistsController.getArtists.bind(artistsController));
router.get('/:id', artistsController.getArtistById.bind(artistsController));
router.get('/:id/detail', artistsController.getArtistDetail.bind(artistsController));
router.get('/:id/services', artistsController.getArtistServices.bind(artistsController));
router.get('/:id/portfolio', artistsController.getArtistPortfolio.bind(artistsController));

// Booking route (TODO: add authentication middleware when ready)
router.post('/bookings', artistsController.createBooking.bind(artistsController));

export default router;