import { REFUND_REASON, TRANSACTION_STATUS, WITHDRAW_STATUS } from "constants/index";
import { model, Schema } from "mongoose";

const BankAccountSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  bankName: { type: String, required: true },
  bankLogo: { type: String }, // optional nếu cần
  bankCode: { type: String, required: true },
  bankBin: { type: String, required: true },
  swiftCode: { type: String } // optional nếu cần
}, { timestamps: true });

const WalletSchema = new Schema({
  muaId: { type: Schema.Types.ObjectId, ref: "MUA", required: true, unique: true },
  balance: { type: Number, default: 0 },          // số dư khả dụng (được CAPTURED)
  currency: { type: String, default: "VND" }
}, { timestamps: true });

const TransactionSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: Number,
  currency: String,
  status: { type: String, enum: Object.values(TRANSACTION_STATUS), default: TRANSACTION_STATUS.HOLD },
  paymentMethod: String,
  paymentReference: String,
  payoutId: String,       
  refundReason: { type: String, enum: Object.values(REFUND_REASON), default: REFUND_REASON.CANCELLED },
}, { timestamps: true });

const WithdrawSchema = new Schema({
  muaId: { type: Schema.Types.ObjectId, ref: 'MUA', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'VND' },
  status: { type: String, enum: Object.values(WITHDRAW_STATUS), default: WITHDRAW_STATUS.PENDING },
  reference: String,       
}, { timestamps: true });


export const Transaction = model("Transaction", TransactionSchema);
export const Withdraw = model("Withdraw", WithdrawSchema);
export const Wallet = model("Wallet", WalletSchema);
export const BankAccount = model("BankAccount", BankAccountSchema);
