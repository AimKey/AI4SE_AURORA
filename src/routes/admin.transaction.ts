import { Router } from "express";
import { AdminTransactionController } from "../controllers/admin.transaction.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { USER_ROLES } from "constants/index";

const router = Router();
const adminTransactionController = new AdminTransactionController();

// Apply admin authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole([USER_ROLES.ADMIN]));

// ==================== PAYOUT ROUTES ====================
router.get("/payouts", (req, res) => 
  adminTransactionController.getPayouts(req, res)
);

router.get("/payouts/:payoutId", (req, res) => 
  adminTransactionController.getPayoutById(req, res)
);

// ==================== WITHDRAWAL ROUTES ====================
router.get("/withdrawals", (req, res) => 
  adminTransactionController.getWithdrawals(req, res)
);

router.get("/withdrawals/:withdrawalId", (req, res) => 
  adminTransactionController.getWithdrawalById(req, res)
);

// ==================== TRANSACTION ROUTES ====================
router.get("/summary", (req, res) => 
  adminTransactionController.getTransactionSummary(req, res)
);

router.get("/", (req, res) => 
  adminTransactionController.getTransactions(req, res)
);

router.get("/:transactionId", (req, res) => 
  adminTransactionController.getTransactionById(req, res)
);

export default router;
