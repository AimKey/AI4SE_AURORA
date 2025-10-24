import type { BankAccountResponseDTO, CreateBankAccountDTO, UpdateBankAccountDTO } from 'types/bankaccount.dtos';
import { BankAccount } from '../models/transactions.model';
import mongoose from 'mongoose';

export class BankAccountService {
  
  // ==================== BANK ACCOUNT CRUD ====================

  /**
   * Get bank account by user ID
   */
  async getBankAccountByUserId(userId: string): Promise<BankAccountResponseDTO | null> {
    const bankAccount = await BankAccount.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!bankAccount) {
      return null;
    }
    return this.formatBankAccountResponse(bankAccount);
  }

  /**
   * Create new bank account
   */
  async createBankAccount(bankAccountData: CreateBankAccountDTO): Promise<BankAccountResponseDTO> {
    // Check if user already has a bank account
    const existingAccount = await BankAccount.findOne({ userId: new mongoose.Types.ObjectId(bankAccountData.userId) });
    if (existingAccount) {
      throw new Error('User already has a bank account. Use update instead.');
    }

    const bankAccount = new BankAccount({
      ...bankAccountData,
      userId: new mongoose.Types.ObjectId(bankAccountData.userId),
    });
    
    const savedAccount = await bankAccount.save();
    return this.formatBankAccountResponse(savedAccount);
  }

  /**
   * Update bank account by user ID
   */
  async updateBankAccount(userId: string, bankAccountData: UpdateBankAccountDTO): Promise<BankAccountResponseDTO | null> {
    const updatedAccount = await BankAccount.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { ...bankAccountData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedAccount) {
      return null;
    }
    
    return this.formatBankAccountResponse(updatedAccount);
  }

  /**
   * Delete bank account by user ID
   */
  async deleteBankAccount(userId: string): Promise<boolean> {
    const result = await BankAccount.findOneAndDelete({ userId: new mongoose.Types.ObjectId(userId) });
    return result !== null;
  }

  /**
   * Get bank account by ID
   */
  async getBankAccountById(id: string): Promise<BankAccountResponseDTO | null> {
    const bankAccount = await BankAccount.findById(id);
    if (!bankAccount) {
      return null;
    }
    return this.formatBankAccountResponse(bankAccount);
  }

  /**
   * Get all bank accounts with pagination
   */
  async getAllBankAccounts(page: number = 1, pageSize: number = 10): Promise<{
    accounts: BankAccountResponseDTO[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * pageSize;
    
    const [accounts, total] = await Promise.all([
      BankAccount.find()
        .populate('userId', 'fullName email')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      BankAccount.countDocuments()
    ]);

    const formattedAccounts = accounts.map(account => this.formatBankAccountResponse(account));

    return {
      accounts: formattedAccounts,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Format bank account response
   */
  private formatBankAccountResponse(account: any): BankAccountResponseDTO {
    return {
      _id: account._id.toString(),
      userId: account.userId.toString(),
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      bankLogo: account.bankLogo,
      bankBin: account.bankBin,
      swiftCode: account.swiftCode,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}
export const bankAccountService = new BankAccountService();