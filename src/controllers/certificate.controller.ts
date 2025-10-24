import type { Request, Response } from "express";
import { CertificateService } from "../services/certificate.service";
import type { CreateCertificateDTO, UpdateCertificateDTO } from "../types/certificate.dto";
import type { ApiResponseDTO } from "../types/common.dtos";
import { cloudinary } from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { MUA } from "../models/muas.models";

const certificateService = new CertificateService();

export class CertificateController {
  private async getMuaIdFromUser(user: any): Promise<string | null> {
    try {
      if (user?.muaId) return String(user.muaId);
      const userId = user?.userId;
      if (!userId) return null;

      const mua = await MUA.findOne({ userId }).select("_id").lean();
      return mua ? String(mua._id) : null;
    } catch {
      return null;
    }
  }

  /**
   * Upload certificate image (multipart/form-data, field: "file")
   */
  async uploadCertificateImage(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: { code: "unauthorized", message: "Login required" },
        } as any;
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: { code: "forbidden", message: "MUA account not found" },
        } as any;
        res.status(403).json(response);
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

      const streamUpload = (buffer: Buffer) =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          const publicId = `certificates/${muaId}/${Date.now()}`;
          const stream = cloudinary.uploader.upload_stream(
            {
              public_id: publicId,
              resource_type: 'image',
              overwrite: false,
              invalidate: true,
              transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve(result);
            }
          );
          stream.end(buffer);
        });

      const result = await streamUpload(file.buffer);
      const image = {
        url: result.secure_url || result.url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: 'Certificate image uploaded successfully',
        data: image,
      } as any;
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error?.message || 'Failed to upload image',
        error: { code: 'internal_error', message: 'Failed to upload image' },
      } as any;
      res.status(500).json(response);
    }
  }

  /**
   * CREATE - Tạo certificate mới
   */
  async createCertificate(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: "unauthorized",
        };
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: "unauthorized",
        };
        res.status(403).json(response);
        return;
      }

      const data: CreateCertificateDTO = req.body;

      // Validate required fields
      if (!data.title || !data.issuer || !data.issueDate || !data.image) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "Title, issuer, issue date, and image are required"
        };
        res.status(400).json(response);
        return;
      }

      const certificate = await certificateService.createCertificate(muaId, data);

      const response: ApiResponseDTO = {
        status: 201,
        success: true,
        message: "Certificate created successfully",
        data: certificate
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 400,
        success: false,
        message: error instanceof Error ? error.message : "Failed to create certificate",
        error: { code: "bad_request", message: "Failed to create certificate" },
      } as any;
      res.status(400).json(response);
    }
  }

  /**
   * READ - Lấy danh sách certificates của MUA hiện tại
   */
  async getMyCertificates(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: "unauthorized",
        };
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: "unauthorized",
        };
        res.status(403).json(response);
        return;
      }

      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort: req.query.sort as string,
        q: req.query.q as string
      };

      const result = await certificateService.getMyCertificates(muaId, filters);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Certificates retrieved successfully",
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to retrieve certificates",
        error: { code: "internal_error", message: "Failed to retrieve certificates" },
      } as any;
      res.status(500).json(response);
    }
  }

  /**
   * READ - Lấy chi tiết certificate theo ID
   */
  async getCertificateById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: "unauthorized",
        };
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: "unauthorized",
        };
        res.status(403).json(response);
        return;
      }

      const { id: certificateId } = req.params;

      const certificate = await certificateService.getCertificateById(muaId, certificateId);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Certificate retrieved successfully",
        data: certificate
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 404,
        success: false,
        message: error instanceof Error ? error.message : "Certificate not found"
      };
      res.status(404).json(response);
    }
  }

  /**
   * UPDATE - Cập nhật certificate
   */
  async updateMyCertificate(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: "unauthorized",
        };
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: "unauthorized",
        };
        res.status(403).json(response);
        return;
      }

      const { id } = req.params;
      const data: UpdateCertificateDTO = req.body;

      const certificate = await certificateService.updateMyCertificate(muaId, id, data);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Certificate updated successfully",
        data: certificate
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 404,
        success: false,
        message: error instanceof Error ? error.message : "Failed to update certificate",
        error: { code: "not_found", message: "Failed to update certificate" },
      } as any;
      res.status(404).json(response);
    }
  }

  /**
   * DELETE - Xóa certificate
   */
  async deleteMyCertificate(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) {
        const response: ApiResponseDTO = {
          status: 401,
          success: false,
          message: "Unauthorized",
          error: "unauthorized",
        };
        res.status(401).json(response);
        return;
      }

      const muaId = await this.getMuaIdFromUser(authUser);
      if (!muaId) {
        const response: ApiResponseDTO = {
          status: 403,
          success: false,
          message: "MUA authentication required",
          error: "unauthorized",
        };
        res.status(403).json(response);
        return;
      }

      const { id } = req.params;

      await certificateService.deleteMyCertificate(muaId, id);

      const response: ApiResponseDTO = {
        status: 204,
        success: true,
        message: "Certificate deleted successfully"
      };
      res.status(204).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 404,
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete certificate",
        error: { code: "not_found", message: "Failed to delete certificate" },
      } as any;
      res.status(404).json(response);
    }
  }

  /**
   * PUBLIC - Lấy danh sách certificates của một MUA
   */
  async listPublicCertificates(req: Request, res: Response): Promise<void> {
    try {
      const { artistId } = req.params;

      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort: req.query.sort as string
      };

      const result = await certificateService.listPublicCertificates(artistId, filters);

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: "Public certificates retrieved successfully",
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : "Failed to retrieve certificates"
      };
      res.status(500).json(response);
    }
  }
}