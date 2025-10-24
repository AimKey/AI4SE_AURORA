import { v2 as cloudinary, type UploadApiResponse, type UploadApiOptions } from "cloudinary";
import { config } from "./index";
import type { ResourceType } from "constants/index";

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true,
});

interface UploadOptions extends UploadApiOptions {
  resource_type?: ResourceType;
}

/**
 * Upload file lên Cloudinary (hỗ trợ image, video, pdf, doc, ...)
 * @param filePath đường dẫn local hoặc URL
 * @param resource_type loại file (image | video | raw)
 */
export async function uploadFile(
  filePath: string,
  resource_type: ResourceType = "image",
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      ...options,
    });
    return result;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
}

export { cloudinary };
