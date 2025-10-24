import { Portfolio } from "../models/portfolios.models";
import { MUA } from "../models/muas.models";
import type { CreatePortfolioDTO, UpdatePortfolioDTO, PortfolioResponseDTO } from "../types/portfolio.dto";
import type { PaginatedResponseDTO } from "../types/common.dtos";
import { Types } from "mongoose";

export class PortfolioService {
  /**
   * Tạo portfolio mới cho MUA
   * @param muaId - ID của MUA từ token
   * @param data - Dữ liệu portfolio
   */
  async createPortfolio(muaId: string, data: CreatePortfolioDTO): Promise<PortfolioResponseDTO> {
    // Validate MUA exists
    const mua = await MUA.findById(muaId);
    if (!mua) {
      throw new Error("MUA not found");
    }

    const portfolio = await Portfolio.create({
      muaId: new Types.ObjectId(muaId),
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      images: data.images,
      isPublished: data.isPublished !== undefined ? data.isPublished : true
    });

    return this.mapToResponseDTO(portfolio);
  }

  /**
   * Lấy danh sách portfolio của MUA hiện tại
   * @param muaId - ID của MUA từ token
   * @param filters - Các filter: page, limit, category, tags, sort, q
   */
  async getMyPortfolios(
    muaId: string,
    filters: {
      page?: number;
      limit?: number;
      category?: string;
      tags?: string;
      sort?: string;
      q?: string;
    }
  ): Promise<PaginatedResponseDTO<PortfolioResponseDTO>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { muaId: new Types.ObjectId(muaId) };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.tags) {
      const tagArray = filters.tags.split(",").map(t => t.trim());
      query.tags = { $all: tagArray };  
    }

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } },
        { tags: { $in: [new RegExp(filters.q, "i")] } }  
      ];
    }

    // Sort
    let sortOption: any = { createdAt: -1 }; 
    if (filters.sort === "alphabetical") {
      sortOption = { title: 1 }; 
    } else if (filters.sort === "oldest") {
      sortOption = { createdAt: 1 }; 
    }

    const [portfolios, total] = await Promise.all([
      Portfolio.find(query).sort(sortOption).skip(skip).limit(limit),
      Portfolio.countDocuments(query)
    ]);

    return {
      data: portfolios.map(p => this.mapToResponseDTO(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy chi tiết portfolio theo ID (của MUA hiện tại)
   * @param muaId - ID của MUA từ token
   * @param portfolioId - ID của portfolio
   */
  async getPortfolioById(muaId: string, portfolioId: string): Promise<PortfolioResponseDTO> {
    const portfolio = await Portfolio.findOne({
      _id: new Types.ObjectId(portfolioId),
      muaId: new Types.ObjectId(muaId)
    });

    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    return this.mapToResponseDTO(portfolio);
  }

  /**
   * Cập nhật portfolio của MUA hiện tại
   * @param muaId - ID của MUA từ token
   * @param portfolioId - ID của portfolio
   * @param data - Dữ liệu cập nhật
   */
  async updateMyPortfolio(
    muaId: string,
    portfolioId: string,
    data: UpdatePortfolioDTO
  ): Promise<PortfolioResponseDTO> {
    const portfolio = await Portfolio.findOneAndUpdate(
      {
        _id: new Types.ObjectId(portfolioId),
        muaId: new Types.ObjectId(muaId)
      },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    return this.mapToResponseDTO(portfolio);
  }

  /**
   * Xóa portfolio của MUA hiện tại
   * @param muaId - ID của MUA từ token
   * @param portfolioId - ID của portfolio
   */
  async deleteMyPortfolio(muaId: string, portfolioId: string): Promise<void> {
    const result = await Portfolio.deleteOne({
      _id: new Types.ObjectId(portfolioId),
      muaId: new Types.ObjectId(muaId)
    });

    if (result.deletedCount === 0) {
      throw new Error("Portfolio not found");
    }
  }

  /**
   * Lấy danh sách portfolio public của một MUA (cho khách xem)
   * @param artistId - ID của MUA cần xem
   * @param filters - Các filter: page, limit, category, tags, sort, q
   */
  async listPublicPortfolios(
    artistId: string,
    filters: {
      page?: number;
      limit?: number;
      category?: string;
      tags?: string;
      sort?: string;
      q?: string;
    }
  ): Promise<PaginatedResponseDTO<PortfolioResponseDTO>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build query - chỉ lấy portfolio public
    const query: any = {
      muaId: new Types.ObjectId(artistId),
      isPublished: true
    };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.tags) {
      const tagArray = filters.tags.split(",").map(t => t.trim());
      query.tags = { $all: tagArray };  
    }

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } },
        { tags: { $in: [new RegExp(filters.q, "i")] } }  
      ];
    }

    // Sort
    let sortOption: any = { createdAt: -1 }; 
    if (filters.sort === "alphabetical") {
      sortOption = { title: 1 }; 
    } else if (filters.sort === "oldest") {
      sortOption = { createdAt: 1 }; 
    }

    const [portfolios, total] = await Promise.all([
      Portfolio.find(query).sort(sortOption).skip(skip).limit(limit),
      Portfolio.countDocuments(query)
    ]);

    return {
      data: portfolios.map(p => this.mapToResponseDTO(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy chi tiết portfolio public theo ID
   * @param portfolioId - ID của portfolio
   */
  async getPortfolioPublicById(portfolioId: string): Promise<PortfolioResponseDTO> {
    const portfolio = await Portfolio.findOne({
      _id: new Types.ObjectId(portfolioId),
      isPublished: true
    });

    if (!portfolio) {
      throw new Error("Portfolio not found or not published");
    }

    return this.mapToResponseDTO(portfolio);
  }

  /**
   * Map model sang DTO response tối giản
   */
  private mapToResponseDTO(portfolio: any): PortfolioResponseDTO {
    return {
      _id: portfolio._id.toString(),
      muaId: portfolio.muaId.toString(),
      title: portfolio.title,
      description: portfolio.description,
      category: portfolio.category, 
      tags: portfolio.tags || [],
      images: portfolio.images || [],
      createdAt: portfolio.createdAt.toISOString(),
      updatedAt: portfolio.updatedAt.toISOString(),
      isPublished: portfolio.isPublished
    };
  }
}
