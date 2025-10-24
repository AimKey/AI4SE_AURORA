import { Certificate } from "../models/portfolios.models";
import { MUA } from "../models/muas.models";
import type { 
  CreateCertificateDTO, 
  UpdateCertificateDTO, 
  CertificateResponseDTO 
} from "../types/certificate.dto";
import type { PaginatedResponseDTO } from "../types/common.dtos";
import { Types } from "mongoose";

export class CertificateService {
  /**
   * Tạo certificate mới cho MUA
   */
  async createCertificate(
    muaId: string, 
    data: CreateCertificateDTO
  ): Promise<CertificateResponseDTO> {
    // Validate MUA exists
    const mua = await MUA.findById(muaId);
    if (!mua) {
      throw new Error("MUA not found");
    }

    const certificate = await Certificate.create({
      muaId: new Types.ObjectId(muaId),
      title: data.title,
      issuer: data.issuer,
      description: data.description,
      issueDate: new Date(data.issueDate),
      expireDate: data.expireDate ? new Date(data.expireDate) : undefined,
      image: data.image
    });

    return this.mapToResponseDTO(certificate);
  }

  /**
   * Lấy danh sách certificates của MUA hiện tại
   */
  async getMyCertificates(
    muaId: string,
    filters: {
      page?: number;
      limit?: number;
      sort?: string;
      q?: string;
    }
  ): Promise<PaginatedResponseDTO<CertificateResponseDTO>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { muaId: new Types.ObjectId(muaId) };

    // Search by title, issuer, description
    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { issuer: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } }
      ];
    }

    // Sort
    let sortOption: any = { createdAt: -1 }; // newest first
    if (filters.sort === "alphabetical") {
      sortOption = { title: 1 };
    } else if (filters.sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (filters.sort === "issueDate") {
      sortOption = { issueDate: -1 };
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(query).sort(sortOption).skip(skip).limit(limit),
      Certificate.countDocuments(query)
    ]);

    return {
      data: certificates.map(c => this.mapToResponseDTO(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy chi tiết certificate theo ID (của MUA hiện tại)
   */
  async getCertificateById(
    muaId: string, 
    certificateId: string
  ): Promise<CertificateResponseDTO> {
    const certificate = await Certificate.findOne({
      _id: new Types.ObjectId(certificateId),
      muaId: new Types.ObjectId(muaId)
    });

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    return this.mapToResponseDTO(certificate);
  }

  /**
   * Cập nhật certificate của MUA hiện tại
   */
  async updateMyCertificate(
    muaId: string,
    certificateId: string,
    data: UpdateCertificateDTO
  ): Promise<CertificateResponseDTO> {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // Convert dates if provided
    if (data.issueDate) {
      updateData.issueDate = new Date(data.issueDate);
    }
    if (data.expireDate) {
      updateData.expireDate = new Date(data.expireDate);
    }

    const certificate = await Certificate.findOneAndUpdate(
      {
        _id: new Types.ObjectId(certificateId),
        muaId: new Types.ObjectId(muaId)
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    return this.mapToResponseDTO(certificate);
  }

  /**
   * Xóa certificate của MUA hiện tại
   */
  async deleteMyCertificate(muaId: string, certificateId: string): Promise<void> {
    const result = await Certificate.deleteOne({
      _id: new Types.ObjectId(certificateId),
      muaId: new Types.ObjectId(muaId)
    });

    if (result.deletedCount === 0) {
      throw new Error("Certificate not found");
    }
  }

  /**
   * Lấy danh sách certificates public của một MUA (cho khách xem)
   */
  async listPublicCertificates(
    artistId: string,
    filters: {
      page?: number;
      limit?: number;
      sort?: string;
    }
  ): Promise<PaginatedResponseDTO<CertificateResponseDTO>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      muaId: new Types.ObjectId(artistId)
    };

    // Sort
    let sortOption: any = { issueDate: -1 }; // newest certificates first
    if (filters.sort === "alphabetical") {
      sortOption = { title: 1 };
    } else if (filters.sort === "oldest") {
      sortOption = { issueDate: 1 };
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(query).sort(sortOption).skip(skip).limit(limit),
      Certificate.countDocuments(query)
    ]);

    return {
      data: certificates.map(c => this.mapToResponseDTO(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Map model sang DTO response
   */
  private mapToResponseDTO(certificate: any): CertificateResponseDTO {
    return {
      _id: certificate._id.toString(),
      muaId: certificate.muaId.toString(),
      title: certificate.title,
      issuer: certificate.issuer,
      description: certificate.description,
      issueDate: certificate.issueDate.toISOString(),
      expireDate: certificate.expireDate ? certificate.expireDate.toISOString() : undefined,
      image: certificate.image,
      createdAt: certificate.createdAt.toISOString(),
      updatedAt: certificate.updatedAt.toISOString()
    };
  }
}