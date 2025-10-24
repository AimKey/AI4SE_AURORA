import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { CertificateController } from "../controllers/certificate.controller";
import multer from "multer";

const router = Router();
const ctrl = new CertificateController();
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
// UPLOAD - Tải ảnh certificate (multipart/form-data) - field name: "file"
router.post(
  "/my/upload",
  authenticateToken,
  upload.single("file"),
  (req, res) => ctrl.uploadCertificateImage(req, res)
);

// CREATE - Tạo certificate mới
router.post("/my", authenticateToken, (req, res) => ctrl.createCertificate(req, res));

// READ - Lấy danh sách certificates của MUA hiện tại
router.get("/my", authenticateToken, (req, res) => ctrl.getMyCertificates(req, res));

// READ - Lấy chi tiết certificate theo ID
router.get("/my/:id", authenticateToken, (req, res) => ctrl.getCertificateById(req, res));

// UPDATE - Cập nhật certificate
router.patch("/my/:id", authenticateToken, (req, res) => ctrl.updateMyCertificate(req, res));

// DELETE - Xóa certificate
router.delete("/my/:id", authenticateToken, (req, res) => ctrl.deleteMyCertificate(req, res));

// PUBLIC ROUTES - No authentication required
// READ - Lấy danh sách certificates public của một MUA
router.get("/public/:artistId", (req, res) => ctrl.listPublicCertificates(req, res));

export default router;