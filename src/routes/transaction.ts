import { Router } from "express";
import { TransactionController } from "@controllers/transaction.controller";
import { authenticateToken } from "middleware/auth.middleware";

const router = Router();
const ctrl = new TransactionController();

// Create PayOS payment link
router.post("/payment-link", (req, res) => ctrl.createTransactionLink(req, res));

// PayOS webhook endpoint
router.post("/webhook", (req, res) => ctrl.webhookHandler(req, res));

//Payout
router.post("/refund/:bookingId",authenticateToken, (req, res) => ctrl.makeRefundBeforeConfirm(req, res));
router.post("/withdrawal/:muaId",authenticateToken, (req, res) => ctrl.makeWithdrawal(req, res));
router.get("/withdrawals/:muaId",authenticateToken, (req, res) => ctrl.fetchWithdrawalsByMuaId(req, res));
// Get transactions by MUA ID with optional pagination and status filtering
router.get("/mua/:muaId",authenticateToken, (req, res) => ctrl.fetchTransactionsByMuaId(req, res));
//mua wallet
router.get("/wallet/:muaId",authenticateToken, (req, res) => ctrl.fetchWalletByMuaId(req, res));
export default router;
