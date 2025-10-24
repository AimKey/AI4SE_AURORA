import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { PortfolioController } from "../controllers/portfolio.controller";
import multer from "multer";

const router = Router();
const ctrl = new PortfolioController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Invalid file type. Only JPEG/PNG/WebP are allowed."));
  },
});

// PRIVATE ROUTES - Require MUA authentication
// CREATE - Tạo portfolio mới
router.post("/my", authenticateToken, (req, res) => ctrl.createPortfolio(req, res));

// UPLOAD - Tải ảnh portfolio (multipart/form-data) - field name: "file"
router.post(
  "/my/upload",
  authenticateToken,
  upload.single("file"),
  (req, res) => ctrl.uploadPortfolioImage(req, res)
);

// READ - Lấy danh sách portfolio của MUA hiện tại
router.get("/my", authenticateToken, (req, res) => ctrl.getMyPortfolios(req, res));

// READ - Lấy chi tiết portfolio theo ID
router.get("/my/:id", authenticateToken, (req, res) => ctrl.getPortfolioById(req, res));

// UPDATE - Cập nhật portfolio
router.patch("/my/:id", authenticateToken, (req, res) => ctrl.updateMyPortfolio(req, res));

// DELETE - Xóa portfolio
router.delete("/my/:id", authenticateToken, (req, res) => ctrl.deleteMyPortfolio(req, res));

// PUBLIC ROUTES - No authentication required
// READ - Lấy danh sách portfolio public của một MUA
router.get("/public/:artistId", (req, res) => ctrl.listPublicPortfolios(req, res));

// READ - Lấy chi tiết portfolio public theo ID
router.get("/public/item/:id", (req, res) => ctrl.getPortfolioPublicById(req, res));

export default router;
