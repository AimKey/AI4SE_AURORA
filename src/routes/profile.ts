import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.middleware';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();
const ctrl = new ProfileController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type. Only JPEG/PNG/WebP are allowed.'));
  },
});

// Upload avatar (multipart/form-data) - field name: "file"
router.post('/avatar', authenticateToken, upload.single('file'), (req, res) => ctrl.uploadAvatar(req, res));

// Bank Account routes
router.get('/bank-account', authenticateToken, (req, res) => ctrl.getBankAccount(req, res));
router.post('/bank-account', authenticateToken, (req, res) => ctrl.addBankAccount(req, res));
router.put('/bank-account', authenticateToken, (req, res) => ctrl.updateBankAccount(req, res));
router.delete('/bank-account', authenticateToken, (req, res) => ctrl.deleteBankAccount(req, res));

export default router;
