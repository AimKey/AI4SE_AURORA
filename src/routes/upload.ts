import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new UploadController();
const upload = multer({ dest: 'tmp/' });

// Upload via public URL
router.post('/url', authenticateToken, (req, res) => controller.uploadViaUrl(req, res));
// Upload via multipart/form-data with field name "file"
router.post('/file', authenticateToken, upload.single('file'), (req, res) => controller.uploadFromForm(req, res));

export default router;
