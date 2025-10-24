import mongoose from "mongoose";
import { Comment, Follow, Post, Reaction, Tag } from "@models/community.model";
import { User } from "@models/users.models";
import { POST_STATUS, TARGET_TYPES, USER_ROLES } from "constants/index";
import type {
  CreatePostDTO,
  UpdatePostDTO,
  PostResponseDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
  ReactionDTO,
  ReactionResponseDTO,
  CommentResponseDTO,
  TagResponseDTO,
  UserWallResponseDTO,
} from "types/community.dtos";
import type { ServiceResponseDTO } from "types/service.dtos";
import slugify from "slugify";
import { getIO } from "config/socket";
import { MUA } from "@models/muas.models";
import { config } from "config";

// Upsert and increment tags for provided tag names; returns array of slugs
const handleTags = async (tags: string[]) => {
  const slugs: string[] = [];
  for (const tagName of tags) {
    const slug = slugify(tagName, { lower: true, strict: true });
    slugs.push(slug);

    const existing = await Tag.findOne({ slug });
    if (existing) {
      await Tag.updateOne({ _id: existing._id }, { $inc: { postsCount: 1 } });
    } else {
      await Tag.create({ name: slug, slug, postsCount: 1 });
    }
  }
  return slugs;
};

// Adjust tag counts when tags change between versions
const adjustTagCounts = async (oldSlugs: string[], newTagNames: string[]) => {
  const newSlugs = newTagNames.map((t) => slugify(t, { lower: true, strict: true }));
  const oldSet = new Set(oldSlugs || []);
  const newSet = new Set(newSlugs);

  const toAdd: string[] = [];
  const toRemove: string[] = [];

  for (const s of newSet) if (!oldSet.has(s)) toAdd.push(s);
  for (const s of oldSet) if (!newSet.has(s)) toRemove.push(s);

  // Increment for added
  for (const slug of toAdd) {
    const existing = await Tag.findOne({ slug });
    if (existing) {
      await Tag.updateOne({ _id: existing._id }, { $inc: { postsCount: 1 } });
    } else {
      await Tag.create({ name: slug.replace(/-/g, " "), slug, postsCount: 1 });
    }
  }

  // Decrement for removed
  for (const slug of toRemove) {
    await Tag.updateOne({ slug }, { $inc: { postsCount: -1 } });
  }

  return newSlugs;
};

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const mapPostToDTO = async (postDoc: any): Promise<PostResponseDTO> => {
  const author = await User.findById(postDoc.authorId).select("fullName role avatarUrl");
  
  // Map attached services if they exist
  let attachedServices: ServiceResponseDTO[] | undefined = undefined;
  if (Array.isArray(postDoc.attachedServices) && postDoc.attachedServices.length > 0) {
    const serviceIds = postDoc.attachedServices.filter(Boolean);
    
    if (serviceIds.length > 0) {
      // Always populate service -> MUA -> user data
      const { ServicePackage } = require('../models');
      const populatedServices = await ServicePackage.find({
        _id: { $in: serviceIds }
      }).populate({
        path: 'muaId',
        populate: {
          path: 'userId',
          select: 'fullName avatarUrl role'
        }
      }).lean();
      
      attachedServices = populatedServices.map((service: any) => ({
        _id: String(service._id),
        muaId: String(service.muaId._id),
        muaName: service.muaId.userId?.fullName || 'Unknown MUA',
        muaAvatarUrl: service.muaId.userId?.avatarUrl,
        name: service.name,
        description: service.description,
        imageUrl: service.imageUrl,
        duration: service.duration,
        price: service.price,
        isActive: service.isAvailable ?? true, // Note: model uses isAvailable, DTO uses isActive
        createdAt: service.createdAt || new Date(),
        updatedAt: service.updatedAt || service.createdAt || new Date(),
      }));
    }
  }

  return {
    _id: String(postDoc._id),
    authorId: String(postDoc.authorId),
    authorName: author?.fullName ?? "",
    authorRole: author?.role ?? "USER",
    authorAvatarUrl: author?.avatarUrl,
    content: postDoc.content ?? undefined,
    media: Array.isArray(postDoc.media) ? postDoc.media : [],   // ✅ đổi từ images → media
    attachedServices,
    likesCount: postDoc.likesCount ?? 0,
    commentsCount: postDoc.commentsCount ?? 0,
    tags: Array.isArray(postDoc.tags) ? postDoc.tags : undefined,
    status: postDoc.status,
    createdAt: postDoc.createdAt ?? new Date(),
    updatedAt: postDoc.updatedAt ?? postDoc.createdAt ?? new Date(),
  };
};
  const mapReactionDTO = async (doc: any): Promise<ReactionResponseDTO> => {
    return {
      _id: String(doc._id),
      userId: String(doc.userId),
      targetType: doc.targetType,
      postId: doc.postId ? String(doc.postId) : undefined,
      commentId: doc.commentId ? String(doc.commentId) : undefined,
      createdAt: doc.createdAt ?? new Date(),
      updatedAt: doc.updatedAt ?? doc.createdAt ?? new Date(),
    };
  }
const mapCommentToDTO = async (commentDoc: any): Promise<CommentResponseDTO> => {
  const author = await User.findById(commentDoc.authorId).select("fullName role avatarUrl");
  // Note: In a real app, consider caching author info to reduce DB calls
  return {
    _id: String(commentDoc._id),
    postId: String(commentDoc.postId),
    parentId: commentDoc.parentId ? String(commentDoc.parentId) : undefined,
    authorId: String(commentDoc.authorId),
    authorName: author?.fullName ?? "",
    authorRole: author?.role ?? "USER",
    authorAvatarUrl: author?.avatarUrl,
    content: commentDoc.content,
    likesCount: typeof commentDoc.likesCount === "number" ? commentDoc.likesCount : 0,
    repliesCount: typeof commentDoc.repliesCount === "number" ? commentDoc.repliesCount : 0,
    createdAt: commentDoc.createdAt ?? new Date(),
    updatedAt: commentDoc.updatedAt ?? commentDoc.createdAt ?? new Date(),
 };
};
const mapTagToDTO = (tagDoc: any): TagResponseDTO => {
  return {
    _id: String(tagDoc._id),
    name: tagDoc.name,
    slug: tagDoc.slug,
    postsCount: tagDoc.postsCount,
  };
}
// Emit socket event only if Socket.IO is initialized
const safeEmit = (event: string, payload: any) => {
  try {
    const io = getIO();
    io.emit(event, payload);
  } catch {
    // Socket not initialized yet; ignore
  }
};

export class CommunityService {
  // Create a new post
async createRealtimePost(authorId: string, dto: CreatePostDTO): Promise<PostResponseDTO> {
  const tagsInput = dto.tags?.filter(Boolean) ?? [];
  const slugs = tagsInput.length ? await handleTags(tagsInput) : [];

  // Process attached services
  const attachedServiceIds = dto.attachedServices?.filter(Boolean).map(id => toObjectId(id)) ?? [];

  const post = await Post.create({
    authorId: toObjectId(authorId),
    content: dto.content,
    media: dto.media ?? [],  // ✅ thay vì images
    tags: slugs,
    attachedServices: attachedServiceIds,
    status: dto.status ?? POST_STATUS.PUBLISHED,
  });

  const postDTO = await mapPostToDTO(post);
  safeEmit("newPost", postDTO);
  return postDTO;
}


  // Create a new comment
  async createComment(authorId: string, dto: CreateCommentDTO): Promise<CommentResponseDTO> {
    // Verify that the post exists
    const post = await Post.findById(dto.postId);
    if (!post) throw new Error("Post not found");

    // If parentId is provided, verify the parent comment exists and belongs to the same post
    if (dto.parentId) {
      const parentComment = await Comment.findById(dto.parentId);
      if (!parentComment) throw new Error("Parent comment not found");
      if ((parentComment.postId as any).toString() !== dto.postId) throw new Error("Parent comment doesn't belong to this post");
    }

    const comment = await Comment.create({
      postId: toObjectId(dto.postId),
      parentId: dto.parentId ? toObjectId(dto.parentId) : null,
      authorId: toObjectId(authorId),
      content: dto.content,
      likesCount: 0,
      repliesCount: 0,
    });

    // Increment comments count on the post
    await Post.updateOne({ _id: dto.postId }, { $inc: { commentsCount: 1 } });
    const updatedPost = await Post.findById(dto.postId);
    if (updatedPost) {
      const updatedPostDTO = await mapPostToDTO(updatedPost);
      console.log('Emitting postUpdated after comment create:', updatedPostDTO._id, 'commentsCount:', updatedPostDTO.commentsCount);
      safeEmit("postUpdated", updatedPostDTO);
    }

    // If this is a reply, increment replies count on parent comment
    if (dto.parentId) {
      await Comment.updateOne({ _id: dto.parentId }, { $inc: { repliesCount: 1 } });
    }

    const commentDTO = await mapCommentToDTO(comment);
    
    // Emit socket event for realtime updates to specific post room
    const io = getIO();
    const roomName = `post:${dto.postId}`;
    
    if (dto.parentId) {
      // This is a reply
      io.to(roomName).emit("comment:reply", {
        postId: dto.postId,
        parentCommentId: dto.parentId,
        reply: commentDTO,
      });
    } else {
      // This is a top-level comment
      io.to(roomName).emit("comment:new", {
        postId: dto.postId,
        comment: commentDTO,
      });
    }
    
    return commentDTO;
  }

  // Get comment by id
  async getCommentById(commentId: string): Promise<CommentResponseDTO> {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error("Comment not found");
    return mapCommentToDTO(comment);
  }

  // Update comment (author only)
  async updateComment(commentId: string, authorId: string, dto: UpdateCommentDTO): Promise<CommentResponseDTO> {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error("Comment not found");
    if (!(comment.authorId as mongoose.Types.ObjectId).equals(authorId)) throw new Error("Forbidden");

    comment.content = dto.content;
    await comment.save();

    const commentDTO = await mapCommentToDTO(comment);
    
    // Emit socket event for realtime updates to specific post room
    const io = getIO();
    const roomName = `post:${(comment.postId as any).toString()}`;
    io.to(roomName).emit("comment:update", {
      commentId: commentId,
      content: dto.content,
      isReply: !!comment.parentId,
      parentCommentId: comment.parentId ? (comment.parentId as any).toString() : undefined,
    });
    
    return commentDTO;
  }

  // Delete comment (author only)
  async deleteComment(commentId: string, authorId: string): Promise<any> {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error("Comment not found");
    if (!(comment.authorId as mongoose.Types.ObjectId).equals(authorId)) throw new Error("Forbidden");

    // Remove all reactions on this comment
    await Reaction.deleteMany({ commentId: comment._id });

    // If this comment has replies, we could either:
    // 1. Delete all replies (cascade delete)
    // 2. Keep replies but mark parent as deleted
    // For now, let's do cascade delete for simplicity
    const replies = await Comment.find({ parentId: comment._id });
    for (const reply of replies) {
      await Reaction.deleteMany({ commentId: reply._id });
    }
    await Comment.deleteMany({ parentId: comment._id });
    
    // Decrement comments count on the post (1 for comment + number of replies)
    const totalDeletedComments = 1 + replies.length;
    await Post.updateOne({ _id: comment.postId }, { $inc: { commentsCount: -totalDeletedComments } });
    const updatedPost = await Post.findById(comment.postId);
    if (updatedPost) {
      const updatedPostDTO = await mapPostToDTO(updatedPost);
      console.log('Emitting postUpdated after comment delete:', updatedPostDTO._id, 'commentsCount:', updatedPostDTO.commentsCount);
      safeEmit("postUpdated", updatedPostDTO);
    }

    // If this was a reply, decrement replies count on parent
    if (comment.parentId) {
      await Comment.updateOne({ _id: comment.parentId }, { $inc: { repliesCount: -1 } });
    }

    await Comment.deleteOne({ _id: comment._id });
    
    // Emit socket event for realtime updates to specific post room
    const io = getIO();
    const roomName = `post:${(comment.postId as any).toString()}`;
    io.to(roomName).emit("comment:delete", {
      commentId: commentId,
      isReply: !!comment.parentId,
      parentCommentId: comment.parentId ? (comment.parentId as any).toString() : undefined,
    });
    
    return { commentId };
  }

  // List comments for a post (sorted by likes desc then createdAt desc)
  async listCommentsByPost(postId: string, query: { page?: number; limit?: number }): Promise<{ items: CommentResponseDTO[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { postId: toObjectId(postId), parentId: null };
    const [docs, total] = await Promise.all([
      Comment.find(filter).sort({ likesCount: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Comment.countDocuments(filter),
    ]);

    const items = await Promise.all(docs.map((d) => mapCommentToDTO(d)));
    const pages = Math.ceil(total / limit) || 1;
    return { items, total, page, pages };
  }

  // List replies for a comment
  async listRepliesByComment(commentId: string, query: { page?: number; limit?: number }): Promise<{ items: CommentResponseDTO[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { parentId: toObjectId(commentId) };
    const [docs, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(), // replies sorted by oldest first
      Comment.countDocuments(filter),
    ]);

    const items = await Promise.all(docs.map((d) => mapCommentToDTO(d)));
    const pages = Math.ceil(total / limit) || 1;
    return { items, total, page, pages };
  }

  // List comments by user
  async listCommentsByUser(userId: string, query: { page?: number; limit?: number }): Promise<{ items: CommentResponseDTO[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { authorId: toObjectId(userId) };
    const [docs, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Comment.countDocuments(filter),
    ]);

    const items = await Promise.all(docs.map((d) => mapCommentToDTO(d)));
    const pages = Math.ceil(total / limit) || 1;
    return { items, total, page, pages };
  }

  // List posts with optional filters, pagination, and sorting
  async listPosts(query: {
    page?: number;
    limit?: number;
    authorId?: string;
    tag?: string;
    status?: string;
    q?: string;
    sort?: 'newest' | 'popular';
  }): Promise<{ items: PostResponseDTO[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.authorId) filter.authorId = toObjectId(query.authorId);
    if (query.tag) filter.tags = query.tag;
    if (query.status) filter.status = query.status;
    if (query.q) {
      const regex = new RegExp(query.q, "i");
      filter.$or = [{ title: regex }, { content: regex }];
    }

    // Sorting
    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (typeof query.sort === 'string' && query.sort.toLowerCase() === 'popular') {
      sort = { likesCount: -1, createdAt: -1 };
    }

    const [docs, total] = await Promise.all([
      Post.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    const items = await Promise.all(docs.map((d) => mapPostToDTO(d)));
    const pages = Math.ceil(total / limit) || 1;
    return { items, total, page, pages };
  }

  // Get post by id
  async getPostById(postId: string): Promise<PostResponseDTO> {
    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");
    return mapPostToDTO(post);
  }

  // Update post (author only). If tags change, adjust Tag.postsCount
async updateRealtimePost(postId: string, authorId: string, dto: UpdatePostDTO): Promise<PostResponseDTO> {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");
  if (!(post.authorId as mongoose.Types.ObjectId).equals(authorId)) throw new Error("Forbidden");

  if (dto.tags) {
    const oldSlugs = Array.isArray(post.tags) ? (post.tags as string[]) : [];
    post.tags = await adjustTagCounts(oldSlugs, dto.tags);
  }

  if (dto.content !== undefined) post.content = dto.content;
  if (dto.media !== undefined) post.set('media', dto.media);   // ✅ update media thay vì images
  if (dto.attachedServices !== undefined) {
    const attachedServiceIds = dto.attachedServices.filter(Boolean).map(id => toObjectId(id));
    post.set('attachedServices', attachedServiceIds);
  }
  if (dto.status !== undefined) post.status = dto.status;

  await post.save();
  const postDTO = await mapPostToDTO(post);
  safeEmit("postUpdated", postDTO);
  return postDTO;
}

  // Delete post (author only). Decrement tag counts and remove reactions
  async deleteRealtimePost(postId: string, authorId: string): Promise<any> {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Post not found");
    }
    if (!(post.authorId as mongoose.Types.ObjectId).equals(authorId)) {
      throw new Error("Forbidden");
    }

    const slugs = Array.isArray(post.tags) ? (post.tags as string[]) : [];
    for (const slug of slugs) {
      await Tag.updateOne({ slug }, { $inc: { postsCount: -1 } });
    }

    await Reaction.deleteMany({ postId: post._id });
    // Note: comments cleanup can be added if required
    await Post.deleteOne({ _id: post._id });
    safeEmit("postDeleted", { postId: postId });
    console.log(`Post ${postId} deleted`);
    return { postId };
  }

  // Like a post or comment
  async like(data: ReactionDTO): Promise<ReactionResponseDTO> {
    if (!Object.values(TARGET_TYPES).includes(data.targetType)) {
      throw new Error("Invalid target type");
    }

    const payload: any = {
      userId: toObjectId(data.userId),
      targetType: data.targetType,
      postId: data.postId ? toObjectId(data.postId) : undefined,
      commentId: data.commentId ? toObjectId(data.commentId) : undefined,
    };

    if (data.targetType === TARGET_TYPES.POST) {
      if (!data.postId) {
        throw new Error("postId is required for POST reaction");
      }
      const exists = await Reaction.findOne({
        userId: payload.userId,
        targetType: data.targetType,
        postId: payload.postId,
        commentId: null,
      });
      if (exists) return await mapReactionDTO(exists);

      const reaction = await Reaction.create({
        userId: payload.userId,
        targetType: data.targetType,
        postId: payload.postId,
        commentId: null,
      });

      await Post.updateOne({ _id: payload.postId }, { $inc: { likesCount: 1 } });
  const reactionDTO =await mapReactionDTO(reaction);
  safeEmit("postLiked", { postId: reactionDTO.postId, userId: data.userId });
      return reactionDTO;
    } else {
      if (!data.commentId) {
        throw new Error("commentId is required for COMMENT reaction");
      }

      const exists = await Reaction.findOne({
        userId: payload.userId,
        targetType: data.targetType,
        commentId: payload.commentId,
        postId: null,
      });
      if (exists) return await mapReactionDTO(exists);

      const reaction = await Reaction.create({
        userId: payload.userId,
        targetType: data.targetType,
        postId: null,
        commentId: payload.commentId,
      });

      await Comment.updateOne(
        { _id: payload.commentId },
        { $inc: { likesCount: 1 } }
      );
      
      // Get updated comment to get the new like count
      const updatedComment = await Comment.findById(payload.commentId);
      const reactionDTO = await mapReactionDTO(reaction);
      
      // Emit socket event with updated like count to specific post room
      const io = getIO();
      const comment = await Comment.findById(payload.commentId);
      if (comment) {
        const roomName = `post:${(comment.postId as any).toString()}`;
        io.to(roomName).emit("comment:like", {
          commentId: reactionDTO.commentId,
          isLiked: true,
          likeCount: updatedComment?.likesCount || 0,
        });
      }
      
      return reactionDTO;
    }
  }

  // Unlike a post or comment
  async unlike(data: ReactionDTO): Promise<void> {
    if (!Object.values(TARGET_TYPES).includes(data.targetType)) {
      throw new Error("Invalid target type");
    }

    const query: any = {
      userId: toObjectId(data.userId),
      targetType: data.targetType,
    };

    if (data.targetType === TARGET_TYPES.POST) {
      if (!data.postId) {
        throw new Error("postId is required for POST reaction");
      }
      query.postId = toObjectId(data.postId);
      query.commentId = null;
      const deleted = await Reaction.findOneAndDelete(query);
      if (deleted) {
        await Post.updateOne({ _id: query.postId }, { $inc: { likesCount: -1 } });
        safeEmit("postUnliked", { postId: query.postId, userId: data.userId });
      }
    } else {
      if (!data.commentId) {
        throw new Error("commentId is required for COMMENT reaction");
      }
      query.commentId = toObjectId(data.commentId);
      query.postId = null;
      const deleted = await Reaction.findOneAndDelete(query);
      if (deleted) {
        await Comment.updateOne(
          { _id: query.commentId },
          { $inc: { likesCount: -1 } }
        );
        
        // Get updated comment to get the new like count
        const updatedComment = await Comment.findById(query.commentId);
        
        // Emit socket event with updated like count to specific post room
        const io = getIO();
        const comment = await Comment.findById(query.commentId);
        if (comment) {
          const roomName = `post:${(comment.postId as any).toString()}`;
          io.to(roomName).emit("comment:like", {
            commentId: query.commentId.toString(),
            isLiked: false,
            likeCount: updatedComment?.likesCount || 0,
          });
        }
      }
    }
  }

  // List postIds the user has liked (optionally filtered by provided postIds)
  async listMyLikedPostIds(userId: string, postIds?: string[]): Promise<string[]> {
    const filter: any = {
      userId: toObjectId(userId),
      targetType: TARGET_TYPES.POST,
    };
    if (postIds?.length) {
      filter.postId = { $in: postIds.map((id) => toObjectId(id)) };
    } else {
      filter.postId = { $ne: null };
    }
    const docs = await Reaction.find(filter).select('postId').lean();
    return docs.map((d: any) => String(d.postId));
  }
  async listMyLikedCommentIds(userId: string, opts?: { commentIds?: string[]; postId?: string }): Promise<string[]> {
    const filter: any = {
      userId: toObjectId(userId),
      targetType: TARGET_TYPES.COMMENT,
    };
    if (opts?.commentIds?.length) {
      filter.commentId = { $in: opts.commentIds.map((id) => toObjectId(id)) };
    } else if (opts?.postId) {
      const comments = await Comment.find({ postId: toObjectId(opts.postId) }).select('_id').lean();
      const cids = comments.map((c: any) => c._id);
      if (!cids.length) return [];
      filter.commentId = { $in: cids };
    } else {
      filter.commentId = { $ne: null };
    }
    const docs = await Reaction.find(filter).select('commentId').lean();
    return docs.map((d: any) => String(d.commentId));
  }
  async getPostsByTag(tag: string, query: { page?: number; limit?: number }): Promise<{ items: PostResponseDTO[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const filter: any = { tags: tag };
    const [docs, total] = await Promise.all([
      // Sort by popularity first (likesCount desc), then newest
      Post.find(filter)
        .sort({ likesCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);
    const items = await Promise.all(docs.map((d: any) => mapPostToDTO(d)));
    return { items, total, page, pages: Math.ceil(total / limit) };
  }
  async getTrendingTags(limit: number = 10): Promise<TagResponseDTO[]> {
    const docs = await Tag.find().sort({ postsCount: -1 }).limit(limit).lean();
    return docs.map((d: any) =>  mapTagToDTO(d));
  }
  async getAllTags(): Promise<TagResponseDTO[]> {
    const docs = await Tag.find().sort({ name: 1 }).lean();
    return docs.map((d: any) => mapTagToDTO(d));
  }
  
//follow, unfollow
 async  followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error("Cannot follow yourself");

  const follow = await Follow.create({ followerId, followingId });

  // tăng cache
  await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
  await User.findByIdAndUpdate(followingId, { $inc: { followerCount: 1 } });

  // realtime event
  safeEmit("userFollowed", { followerId, followingId });

  return follow;
}

// Unfollow a user
 async  unfollowUser(followerId: string, followingId: string) {
  const res = await Follow.findOneAndDelete({ followerId, followingId });

  if (res) {
    // giảm cache
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } });
    // realtime event
    safeEmit("userUnfollowed", { followerId, followingId });
  }

  return res;
}

  //user wall
  async getUserWall(userId:string):Promise<UserWallResponseDTO>{
    const user = await User.findById(userId).lean();
    const postsCount = await Post.countDocuments({ authorId: toObjectId(userId) });
    const followersCount = await Follow.countDocuments({followingId:userId});
    const followingsCount = await Follow.countDocuments({followerId:userId});
    let muaBio = "";
    let muaPortfolioUrl = "";
    let muaRatingAverage = 0;
    let muaBookingsCount = 0;
    if(user?.role === USER_ROLES.ARTIST){
      const muaObject = await MUA.findOne({userId:toObjectId(userId)}).lean();
      muaBio = muaObject?.bio || "";
      muaPortfolioUrl = config.clientOrigin + "/user/artists/portfolio/" + muaObject?._id || "";
      muaRatingAverage= muaObject?.ratingAverage || 0;
      muaBookingsCount = muaObject?.bookingCount || 0;
    }
    return {
     _id: user?._id || "",
      fullName: user?.fullName || "",
      avatarUrl: user?.avatarUrl || "",
      role: user?.role || "",
      postsCount: postsCount || 0,
      followersCount:followersCount || 0,
      followingsCount:followingsCount || 0,
      muaBio: muaBio,
      muaPortfolioUrl: muaPortfolioUrl,
      muaRatingAverage: muaRatingAverage,
      muaBookingsCount: muaBookingsCount,
    }
  }

  // Following helpers
  async getFollowing(userId: string): Promise<string[]> {
    const docs = await Follow.find({ followerId: toObjectId(userId) }).select('followingId').lean();
    return docs.map((d: any) => String(d.followingId));
  }

  async isFollowing(followerId: string, targetId: string): Promise<boolean> {
    const doc = await Follow.findOne({ followerId: toObjectId(followerId), followingId: toObjectId(targetId) }).lean();
    return !!doc;
  }

  async getTopActiveMuas(limit:number): Promise<UserWallResponseDTO[]> {
    const docs = await MUA.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id", // userId
          ratingAverage: "$ratingAverage",
        },
      },
      // Sort by followerCount desc, then ratingAverage desc
      { $sort: { followerCount: -1, ratingAverage: -1 } },
      { $limit: limit },
    ]);

    // Hydrate each user using existing getUserWall to ensure consistent DTO
    const results = await Promise.all(
      docs.map((d: any) => this.getUserWall(String(d._id)))
    );
    return results;
  }
  async getFollowingUsers(userId:string, limit:number): Promise<UserWallResponseDTO[]> {
  const docs = await Follow.aggregate([
  { $match: { followerId: toObjectId(userId) } },   // match trước
  {
    $lookup: {
      from: "users",
      localField: "followingId",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },
  {
    $project: {
      _id: "$user._id",
    },
  },
  { $limit: limit },
]);


    // Hydrate each user using existing getUserWall to ensure consistent DTO
    const results = await Promise.all(
      docs.map((d: any) => this.getUserWall(String(d._id)))
    );
    return results;
  }
  async getPostsByFollowingUsers(userId:string, query: { page?: number; limit?: number }): Promise<{ items: PostResponseDTO[]; total: number; page: number; pages: number }> {
    const followingIds = await this.getFollowing(userId);
    if(!followingIds.length) return {items:[], total:0, page:1, pages:1};
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const total = await Post.countDocuments({ authorId: { $in: followingIds } });
    const posts = await Post.find({ authorId: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return {
      items: await Promise.all(posts.map((p) => mapPostToDTO(p))),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    }
  }

  // Search services by name or MUA name
  async searchServices(query: { 
    q?: string; 
    page?: number; 
    limit?: number; 
  }): Promise<{ items: ServiceResponseDTO[]; total: number; page: number; pages: number }> {
    const { ServicePackage, User, MUA } = require('../models');
    
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    
    let filter: any = { isAvailable: true };
    
    if (query.q) {
      const searchRegex = new RegExp(query.q, 'i');
      
      // First find Users with role MUA whose names match the query
      const matchingUsers = await User.find({
        role: 'ARTIST',
        fullName: searchRegex
      }).select('_id');
      
      const userIds = matchingUsers.map((user: any) => user._id);
      
      // Then find MUAs based on these user IDs
      const matchingMuas = await MUA.find({
        userId: { $in: userIds }
      }).select('_id');
      
      const muaIds = matchingMuas.map((mua: any) => mua._id);
      
      // Search services by service name OR MUA name
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { muaId: { $in: muaIds } }
      ];
    }
    
    const total = await ServicePackage.countDocuments(filter);
    
    const services = await ServicePackage.find(filter)
      .populate({
        path: 'muaId',
        populate: {
          path: 'userId',
          select: 'fullName avatarUrl role'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const items = services.map((service: any) => ({
      _id: String(service._id),
      muaId: String(service.muaId._id),
      muaName: service.muaId.userId?.fullName || 'Unknown MUA',
      muaAvatarUrl: service.muaId.userId?.avatarUrl,
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price,
      duration: service.duration,
      images: service.imageUrl ? [service.imageUrl] : [],
      isActive: service.isAvailable,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    }));
    
    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }
}


