import type { Request, Response } from 'express';
import type { ApiResponseDTO } from '../types/common.dtos';
import { uploadFile } from '../config/cloudinary';
import type { ResourceType } from 'constants/index';
import { unlink } from 'fs/promises';

export class UploadController {
  // POST /upload/url
  async uploadViaUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url, resourceType, folder, options } = req.body ?? {};

      if (!url || typeof url !== 'string') {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: 'Missing required field: url',
        };
        res.status(400).json(response);
        return;
      }

      const rType: ResourceType = ['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image';

      const result = await uploadFile(url, rType, {
        folder,
        ...(options && typeof options === 'object' ? options : {}),
      });

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: 'Uploaded successfully',
        data: {
          publicId: result.public_id,
          url: result.secure_url || result.url,
          resourceType: result.resource_type,
          format: (result as any).format,
          bytes: result.bytes,
          width: (result as any).width,
          height: (result as any).height,
          folder: (result as any).folder,
          createdAt: (result as any).created_at,
        },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error?.message || 'Upload failed',
      };
      res.status(500).json(response);
    }
  }

  // POST /upload/file (multipart/form-data with field name: `file`)
  async uploadFromForm(req: Request, res: Response): Promise<void> {
    let tempPath: string | undefined;
    try {
  const file = (req as any).file as { path: string } | undefined;
      const { resourceType, folder, options } = (req as any).body ?? {};

      if (!file) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: 'Missing file: please send multipart/form-data with key "file"',
        };
        res.status(400).json(response);
        return;
      }

  tempPath = file.path;
  const pathToUpload: string = tempPath;
      const rType: ResourceType = ['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image';

  const result = await uploadFile(pathToUpload, rType, {
        folder,
        ...(options && typeof options === 'object' ? options : {}),
      });

      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        message: 'Uploaded successfully',
        data: {
          publicId: result.public_id,
          url: result.secure_url || result.url,
          resourceType: result.resource_type,
          format: (result as any).format,
          bytes: result.bytes,
          width: (result as any).width,
          height: (result as any).height,
          folder: (result as any).asset_folder,
          createdAt: (result as any).created_at,
        },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error?.message || 'Upload failed',
      };
      res.status(500).json(response);
    } finally {
      if (tempPath) {
        try { await unlink(tempPath); } catch { /* ignore */ }
      }
    }
  }
}
