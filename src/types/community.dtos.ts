import type { ResourceType, PostStatus, TargetType } from "constants/index"
import type { ServiceResponseDTO } from "./service.dtos";


export interface CreatePostDTO {
  content?: string;
  media?: { type: ResourceType; url: string }[];
  tags?: string[];
  status?: PostStatus;
  attachedServices?: string[];
}

export interface UpdatePostDTO {
  content?: string;
  media?: { type: ResourceType; url: string }[];
  tags?: string[];
  status?: PostStatus;
  attachedServices?: string[];
}


export interface PostResponseDTO {
    _id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    authorAvatarUrl?: string;
    content?: string;
    media: {type: ResourceType; url: string}[];
    attachedServices?: ServiceResponseDTO[];
    likesCount: number;
    commentsCount: number;
    tags?: string[];
    status?: PostStatus; // default PUBLISHED
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCommentDTO {
  postId: string;
  parentId?: string; // null = comment gốc
  content: string;
}
export interface UpdateCommentDTO {
  content: string;
}
export interface CommentResponseDTO {
    _id: string;
    postId: string;
    parentId?: string;
    authorId: string;
    authorName:string;
    authorRole:string;
    authorAvatarUrl?:string;
    content: string;
    likesCount: number;
    repliesCount: number;
    createdAt: Date;
    updatedAt: Date;
}


export interface ReactionDTO {
 userId: string;
 targetType: TargetType;
 postId?: string;
 commentId?: string;
}
export interface ReactionResponseDTO {
    _id: string;
    userId: string;
    targetType: TargetType;
    postId?: string;
    commentId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface TagResponseDTO {
  _id: string;
  name: string;
  slug: string;
  postsCount: number;
}
export interface UserWallResponseDTO{
  _id: string;
  fullName: string;
  avatarUrl: string;
  role:string;
  muaBio?:string;
  muaPortfolioUrl?:string;
  muaRatingAverage?: number;
  muaBookingsCount?:number;
  postsCount: number;
  followersCount: number;
  followingsCount: number;
}