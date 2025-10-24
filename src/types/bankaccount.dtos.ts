// ===== BANK ACCOUNT DTOs =====
export interface CreateBankAccountDTO {
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  bankLogo?: string;
  bankBin: string;
  swiftCode?: string;
}

export interface UpdateBankAccountDTO {
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
  bankBin?: string;
  bankLogo?: string;
  swiftCode?: string;
}

export interface BankAccountResponseDTO {
  _id: string;
  userId: string;
  accountNumber: string;
  accountName: string;
  bankLogo?: string;
  bankName: string;
  bankCode: string;
  bankBin: string;
  swiftCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
