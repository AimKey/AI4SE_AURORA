import { BankAccount, Transaction, Wallet, Withdraw } from "models/transactions.model";
import type { CreateTransactionDTO, UpdateTransactionDTO, TransactionResponseDTO, PayOSCreateLinkInput, PayOSCreateLinkResult, PaymentWebhookResponse, WalletResponseDTO, WithdrawResponseDTO } from "types/transaction.dto";
import { createBooking, deleteRedisPendingBooking, getBookingById, getRedisPendingBooking } from "./booking.service";
import { BOOKING_STATUS, PAYMENT_METHODS, REFUND_REASON, TRANSACTION_STATUS, WITHDRAW_STATUS, type RefundReason, type TransactionStatus } from "constants/index";
import type { BookingResponseDTO } from "types";
import type { CreateBookingDTO, PendingBookingResponseDTO } from "types/booking.dtos";
import mongoose from "mongoose";
import { ServicePackage } from "@models/services.models";
import { User } from "@models/users.models";
import { fromUTC } from "utils/timeUtils";
import { Booking } from "@models/bookings.models";
import { createPayOSPaymentLink, makeRefund, makeWithdrawal } from "./payos.service";
import { MUA } from "@models/muas.models";
import { EmailService } from "./email.service";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// ==================== PayOS Integration ====================
// PayOS functions moved to payos.service.ts
// Re-export for backward compatibility
export { createPayOSPaymentLink, makeRefund,makeWithdrawal, generateOrderCode, getPayoutDetail, getPayoutList, buildPayoutListQuery } from "./payos.service";
// UTIL - map mongoose doc to DTO
function formatWithdrawResponse(withdraw: any): WithdrawResponseDTO {
  const withdrawTime = dayjs(withdraw.createdAt).tz("Asia/Ho_Chi_Minh");
  return {
    _id: String(withdraw._id),
    muaId: String(withdraw.muaId),
    amount: withdraw.amount || 0,
    currency: withdraw.currency || "VND",
    status: withdraw.status,
    withdrawTime: withdrawTime.format("HH:mm"),
    withdrawDate: withdrawTime.format("YYYY-MM-DD"),
  };
}

async function formatTransactionResponse(tx: any): Promise<TransactionResponseDTO> {
  // Attempt to extract friendly names from joined docs when available
  const booking =  await Booking.findById(tx.bookingId).exec();
  const serviceId = booking?.serviceId;
  const service = await ServicePackage.findById(serviceId).exec();
  const serviceName = service?.name;
  const customer = await User.findById(tx.customerId).select("fullName");
  const customerName = customer?.fullName;
  const rawDate = booking?.bookingDate;
  const bookingDay = rawDate ? fromUTC(rawDate) : dayjs();
 const startTime= bookingDay.format("HH:mm");
  const  endTime= bookingDay.add(booking && typeof booking.duration === "number" ? booking.duration : 0, 'minute').format("HH:mm");
  const bookingTime = `${startTime} - ${endTime}`;
  return {
    _id: String(tx._id),
    payoutId: tx.payoutId ? String(tx.payoutId) : '',   // id của lệnh payout nếu có
    bookingId: tx.bookingId ? String(tx.bookingId) : "",
    customerId: tx.customerId ? String(tx.customerId) : "",
    amount: typeof tx.amount === "number" ? tx.amount : 0,
    currency: tx.currency || "",
    status: tx.status || 'HOLD',
    paymentMethod: tx.paymentMethod,
   bookingDay,
    // extra friendly fields expected by DTO
    serviceName,
    customerName,
    bookingTime,
  } as TransactionResponseDTO;
}

// CREATE
export async function getCreateTransactionDTO(bookingData: BookingResponseDTO,amount:number,paymentReference:string,currency:string,status:TransactionStatus): Promise<CreateTransactionDTO> {
  try {
    return {
      bookingId: bookingData._id,
      customerId: bookingData?.customerId || '',
      amount: amount,
      currency,
      status,
      paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
      paymentReference,
    };
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error}`);
  }
}
export async function createTransaction(data: CreateTransactionDTO): Promise<TransactionResponseDTO> {
  try {
    const tx = await Transaction.create({
      bookingId: data.bookingId,
      customerId: data.customerId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
    });
    return formatTransactionResponse(tx);
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error}`);
  }
}

// ==================== PayOS Integration ====================
// PayOS functions moved to payos.service.ts
// Re-export for backward compatibility

export async function handlePayOSWebhook(data: PaymentWebhookResponse): Promise<TransactionResponseDTO | null> {
  // tìm booking và tạo booking
  const pb = await getRedisPendingBooking(data?.data?.orderCode);
  if(!pb){
    console.warn(`Pending booking with orderCode ${data?.data?.orderCode} not found. Possibly user cancelled.`);
    return null;
  }
  const b = mapPendingBookingToCreate(pb);
  const bookingData = await createBooking(b);
  if(bookingData){
     await deleteRedisPendingBooking(data?.data?.orderCode);
    }
  // check transaction đã tồn tại
  const existingTransaction = await Transaction.findOne({ bookingId:bookingData._id }).exec();
  if (existingTransaction) {
    console.log(`Transaction with reference ${data.data.reference} already exists. Skipping creation.`);
    return formatTransactionResponse(existingTransaction);
  }

  // tạo transaction HOLD
  const input = await getCreateTransactionDTO(
    bookingData,
    data.data.amount,
    data.data.reference,
    "VND",
    TRANSACTION_STATUS.HOLD
  );
  return await createTransaction(input);
}


// bookingDate: "2025-09-24"
// startTime: "12:30"

// ==================== MAPPERS ====================
function mapPendingBookingToCreate(pb: PendingBookingResponseDTO): CreateBookingDTO {
  // Combine bookingDate (YYYY-MM-DD) and startTime (HH:mm) into a Date
  const bookingDate = dayjs.tz(`${pb.bookingDate} ${pb.startTime}`, "YYYY-MM-DD HH:mm", "Asia/Ho_Chi_Minh");
  return {
    customerId: pb.customerId,
    serviceId: pb.serviceId,
    muaId: pb.artistId,
    bookingDate: bookingDate.toDate(),
    customerPhone: pb.customerPhone,
    duration: pb.duration,
    locationType: pb.locationType,
    address: pb.address,
    transportFee: pb.transportFee,
    totalPrice: pb.totalPrice,
    payed: pb.payed ?? false,
    note: pb.note,
  };
}
export async function handleBalanceConfirmBooking(bookingId:string):Promise<void>{
//update wallet
//update transaction
const bookingData = await getBookingById(bookingId);  
const muaWallet = await Wallet.findById(bookingData?.artistId).exec();

const transaction = await Transaction.findOne({ bookingId: bookingId }).exec();
if(transaction && transaction.status===TRANSACTION_STATUS.HOLD && muaWallet){
  muaWallet.balance += transaction.amount??0;
  await muaWallet.save();
  transaction.status = TRANSACTION_STATUS.CAPTURED;
  await transaction.save();
}
}
//haven't capture money to mua yet(mua cancel, user cancel)
export async function handleRefundBookingBeforeConfirm(bookingId:string, bookingStatus:any):Promise<void>{
//payout(tim customer, lay bank account tu user)
//update transaction
const refundReason: RefundReason = bookingStatus === BOOKING_STATUS.CANCELLED ? REFUND_REASON.CANCELLED : REFUND_REASON.REJECTED;
 const refundResponse = await makeRefund(bookingId,refundReason);
 if(refundResponse.code !== '00'){
  throw new Error(`Payout failed: ${refundResponse.desc} (code: ${refundResponse.code})`);
 }
 const transaction = await Transaction.findOne({ bookingId: bookingId }).exec();
 const booking = await Booking.findById(bookingId).exec();
 if(transaction &&( transaction.status===TRANSACTION_STATUS.HOLD || transaction.status===TRANSACTION_STATUS.PENDING_REFUND) ){
  transaction.status = TRANSACTION_STATUS.REFUNDED;
  transaction.payoutId = refundResponse.data.id;
  await transaction.save();
 }
 if(booking && booking.status === BOOKING_STATUS.PENDING){
  booking.status = bookingStatus;
  await booking.save();
 }

 // Send refund success notification to customer
 try {
   const customer = await User.findById(transaction?.customerId).exec();
   const service = await ServicePackage.findById(booking?.serviceId).exec();
   
   if (customer && customer.email) {
     const emailService = new EmailService();
     await emailService.sendRefundSuccessNotification(
       customer.email,
       customer.fullName || 'Customer',
       transaction?.amount || 0,
       bookingId,
       service?.name || 'Service',
       refundResponse.data.id
     );
   }
 } catch (emailError) {
   console.error('Failed to send refund success notification:', emailError);
   // Don't throw error here to avoid breaking the refund process
 }
}
export async function handleWithdrawalMUA(muaId:string):Promise<void>{
  const wallet = await Wallet.findOne({ muaId }).exec();
  if(!wallet){
    throw new Error(`Wallet for MUA ${muaId} not found`);
  }
  if(wallet.balance <=0){
    throw new Error(`Wallet for MUA ${muaId} has insufficient balance`);
  }
 
  const withdrawalAmount = wallet.balance; // Store the amount before reset
  const payoutResponse = await makeWithdrawal(muaId);
  if(payoutResponse.code !== '00'){
    throw new Error(`Payout failed: ${payoutResponse.desc} (code: ${payoutResponse.code})`);
  }
  const existingWithdraw = await Withdraw.findOne({ muaId: muaId, status: WITHDRAW_STATUS.PENDING }).exec();
  if (existingWithdraw) {
    existingWithdraw.status = WITHDRAW_STATUS.SUCCESS;
    existingWithdraw.reference= payoutResponse.data.id;
    await existingWithdraw.save();
  }
  //reset balance
  wallet.balance = 0;
  await wallet.save();

  // Send withdrawal success notification to MUA
  try {
    const mua = await MUA.findById(muaId).populate('userId').exec();
    const user = mua?.userId as any;
    
    if (user && user.email) {
      const emailService = new EmailService();
      await emailService.sendWithdrawalSuccessNotification(
        user.email,
        user.fullName || 'MUA',
        withdrawalAmount,
        muaId,
        payoutResponse.data.id
      );
    }
  } catch (emailError) {
    console.error('Failed to send withdrawal success notification:', emailError);
    // Don't throw error here to avoid breaking the withdrawal process
  }
}
// READ - by id
export async function getTransactionById(id: string): Promise<TransactionResponseDTO | null> {
  try {
    const tx = await Transaction.findById(id).exec();
    return tx ? formatTransactionResponse(tx) : null;
  } catch (error) {
    throw new Error(`Failed to get transaction: ${error}`);
  }
}

// READ - list with pagination and optional filters
export async function getTransactions(
  page: number = 1,
  pageSize: number = 10,
  filters?: { customerId?: string; bookingId?: string; status?: 'HOLD' | 'CAPTURED' | 'REFUNDED' }
): Promise<{ transactions: TransactionResponseDTO[]; total: number; page: number; totalPages: number }> {
  try {
    const skip = (page - 1) * pageSize;
    const query: any = {};
    if (filters?.customerId) query.customerId = filters.customerId;
    if (filters?.bookingId) query.bookingId = filters.bookingId;
    if (filters?.status) query.status = filters.status;

    const [docs, total] = await Promise.all([
      Transaction.find(query).skip(skip).limit(pageSize).sort({ createdAt: -1 }).exec(),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions: await Promise.all(docs.map(formatTransactionResponse)),
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    throw new Error(`Failed to get transactions: ${error}`);
  }
}

export async function getMUAWallet(muaId: string): Promise<WalletResponseDTO | null> {
  try {
    const wallet = await Wallet.findOne({ muaId }).exec();
    if (!wallet) return null;
    return {
      _id: String(wallet._id),
      muaId: wallet.muaId.toString(),
      balance: wallet.balance,
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  } catch (error) {
    throw new Error(`Failed to get MUA wallet: ${error}`);
  }
}
// READ - list by booking.muaId with optional status and pagination
export async function getTransactionsByMuaId(
  muaId: string,
  page: number = 1,
  pageSize: number = 10,
  status?: TransactionStatus
): Promise<{ transactions: TransactionResponseDTO[]; total: number; page: number; totalPages: number }>{
  try {
    const matchStage: any = {};
    if (status) matchStage.status = status;

    const pipeline: any[] = [
      // Optional status filter at transaction level first
      Object.keys(matchStage).length ? { $match: matchStage } : null,
      // Join Booking to filter by muaId
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
      { $unwind: '$booking' },
      { $match: { 'booking.muaId': new mongoose.Types.ObjectId(muaId) } },
      // Join Service via booking.serviceId
      { $lookup: { from: 'services', localField: 'booking.serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      // Facet for pagination + total count
      {
        $facet: {
          docs: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
          ],
          count: [ { $count: 'total' } ]
        }
      }
    ].filter(Boolean);

    const aggRes = await (Transaction as any).aggregate(pipeline);
    const facet = aggRes[0] || { docs: [], count: [] };
    const total = facet.count[0]?.total || 0;
    // Note: formatTransactionResponse maps only transaction fields.
    // If you need booking/service fields in the response, extend the DTO and mapper accordingly.
    const transactions = await Promise.all((facet.docs || []).map(formatTransactionResponse));
    return { transactions, total, page, totalPages: Math.ceil(total / pageSize) };
  } catch (error) {
    throw new Error(`Failed to get transactions by muaId: ${error}`);
  }
}

// UPDATE
export async function updateTransaction(id: string, data: UpdateTransactionDTO): Promise<TransactionResponseDTO | null> {
  try {
    const tx = await Transaction.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).exec();
    return tx ? formatTransactionResponse(tx) : null;
  } catch (error) {
    throw new Error(`Failed to update transaction: ${error}`);
  }
}

// DELETE
export async function deleteTransaction(id: string): Promise<boolean> {
  try {
    const res = await Transaction.findByIdAndDelete(id).exec();
    return !!res;
  } catch (error) {
    throw new Error(`Failed to delete transaction: ${error}`);
  }
}

// READ - list withdrawals by muaId with pagination
export async function getWithdrawalsByMuaId(
  muaId: string,
  page: number = 1,
  pageSize: number = 10,
  status?: string
): Promise<{ withdrawals: WithdrawResponseDTO[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;
    const query: any = { muaId: new mongoose.Types.ObjectId(muaId) };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const [docs, total] = await Promise.all([
      Withdraw.find(query)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      Withdraw.countDocuments(query),
    ]);

    const withdrawals = docs.map(formatWithdrawResponse);

    return {
      withdrawals,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    };
}

















