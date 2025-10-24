import type { Request, Response } from 'express';
import type { ApiResponseDTO } from '../types/common.dtos';
import { cloudinary } from '../config/cloudinary';
import { AuthService } from '../services/auth.service';
import type { UploadApiResponse } from 'cloudinary';
import { bankAccountService } from '@services/bankaccount.service';
import type { CreateBankAccountDTO, UpdateBankAccountDTO } from 'types/bankaccount.dtos';

const authService = new AuthService();

export class ProfileController {
  // POST /profile/avatar (multipart/form-data with field name: file)
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file || !file.buffer) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: 'Missing file: please send multipart/form-data with key "file"',
        } as any;
        res.status(400).json(response);
        return;
      }

      // Upload to Cloudinary using upload_stream and in-memory buffer
      const streamUpload = (buffer: Buffer) =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              public_id: `avatars/${userId}`,
              resource_type: 'image',
              overwrite: true,
              invalidate: true,
              transformation: [
                { width: 512, height: 512, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve(result);
            }
          );
          stream.end(buffer);
        });

      const result = await streamUpload(file.buffer);
      const avatarUrl = result.secure_url || result.url;

      // Optionally persist in DB (explicit save step)
      const updatedUser = await authService.updateProfile(userId, { avatarUrl });

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: 'Avatar uploaded successfully',
        data: { avatarUrl, public_id: result.public_id, user: updatedUser },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const isCloudNameDisabled = typeof error?.message === 'string' && error.message.toLowerCase().includes('cloud_name is disabled');
      const status = isCloudNameDisabled ? 401 : 500;
      const response: ApiResponseDTO = {
        status,
        success: false,
        message: error?.message || 'Failed to upload avatar',
      };
      res.status(status).json(response);
    }
  }
  async getBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }
      const data = await bankAccountService.getBankAccountByUserId(userId);
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: 'Bank account retrieved successfully',
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get bank account',
      };
      res.status(500).json(response);
    }
  }
  
  async addBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const bankAccountData: CreateBankAccountDTO = req.body;
      const createdAccount = await bankAccountService.createBankAccount({
        ...bankAccountData,
        userId
      });

      if (!createdAccount) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Failed to add bank account',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        success: true,
        message: 'Bank account added successfully',
        data: createdAccount,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add bank account',
      };
      res.status(500).json(response);
    }
  }
  async updateBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const bankAccountData: UpdateBankAccountDTO = req.body;
      const updatedAccount = await bankAccountService.updateBankAccount(userId, bankAccountData);

      if (!updatedAccount) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Failed to update bank account',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        success: true,
        message: 'Bank account updated successfully',
        data: updatedAccount,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update bank account',
      };
      res.status(500).json(response);
    }
  }
  async deleteBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const deletedAccount = await bankAccountService.deleteBankAccount(userId);

      if (!deletedAccount) {
        const response: ApiResponseDTO = {
          success: false,
          message: 'Failed to delete bank account',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponseDTO = {
        success: true,
        message: 'Bank account deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete bank account',
      };
      res.status(500).json(response);
    }
  }

}