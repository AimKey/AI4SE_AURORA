import type { Request, Response } from "express";
import { CommunityService } from "@services/community.service";
import type { ApiResponseDTO } from "../types";

export class CommunityController {
   
    private readonly service: CommunityService;

    constructor() {
        this.service = new CommunityService();
    }

    // POST /api/community/posts
    async createPost(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.createRealtimePost(userId, req.body);
            const response: ApiResponseDTO = { success: true, data };
            res.status(201).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to create post",
            };
            res.status(400).json(response);
        }
    }

    // GET /api/community/posts
    async listPosts(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit, authorId, tag, status, q, sort } = req.query as any;
            const data = await this.service.listPosts({
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                authorId: authorId as string,
                tag: tag as string,
                status: status as string,
                q: q as string,
                sort: sort === "newest" || sort === "popular" ? sort : undefined,
            });
            const response: ApiResponseDTO = {
                success: true,
                data: {
                    items: data.items,
                    total: data.total,
                    page: data.page,
                    pages: data.pages,
                },
            };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to list posts",
            };
            res.status(500).json(response);
        }
    }

    // GET /api/community/posts/:id
    async getPostById(req: Request, res: Response): Promise<void> {
        try {
            const data = await this.service.getPostById(req.params.id);
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to get post";
            const status = message === "Post not found" ? 404 : 500;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // POST /api/community/comments
    async createComment(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.createComment(userId, req.body);
            const response: ApiResponseDTO = { success: true, data };
            res.status(201).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to create comment",
            };
            res.status(400).json(response);
        }
    }

    // GET /api/community/comments/:id
    async getCommentById(req: Request, res: Response): Promise<void> {
        try {
            const data = await this.service.getCommentById(req.params.id);
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to get comment";
            const status = message === "Comment not found" ? 404 : 500;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // PATCH /api/community/comments/:id
    async updateComment(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.updateComment(req.params.id, userId, {
                content: req.body.content,
            });
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update comment";
            let status = 400;
            if (message === "Comment not found") status = 404;
            else if (message === "Forbidden") status = 403;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // DELETE /api/community/comments/:id
    async deleteComment(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.deleteComment(req.params.id, userId);
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete comment";
            let status = 400;
            if (message === "Comment not found") status = 404;
            else if (message === "Forbidden") status = 403;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // GET /api/community/posts/:id/comments
    async listCommentsByPost(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit } = req.query as any;
            const data = await this.service.listCommentsByPost(req.params.id, {
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            });
            const response: ApiResponseDTO = {
                success: true,
                data: {
                    items: data.items,
                    total: data.total,
                    page: data.page,
                    pages: data.pages,
                },
            };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to list comments",
            };
            res.status(500).json(response);
        }
    }

    // GET /api/community/comments/:id/replies
    async listRepliesByComment(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit } = req.query as any;
            const data = await this.service.listRepliesByComment(req.params.id, {
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            });
            const response: ApiResponseDTO = {
                success: true,
                data: {
                    items: data.items,
                    total: data.total,
                    page: data.page,
                    pages: data.pages,
                },
            };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to list replies",
            };
            res.status(500).json(response);
        }
    }

    // GET /api/community/users/:id/comments
    async listCommentsByUser(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit } = req.query as any;
            const data = await this.service.listCommentsByUser(req.params.id, {
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            });
            const response: ApiResponseDTO = {
                success: true,
                data: {
                    items: data.items,
                    total: data.total,
                    page: data.page,
                    pages: data.pages,
                },
            };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to list user comments",
            };
            res.status(500).json(response);
        }
    }

    // GET /api/community/tags/:tag/posts
    async getPostsByTag(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit } = req.query as any;
            const tag = req.params.tag;
            const data = await this.service.getPostsByTag(tag, {
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            });
            const response: ApiResponseDTO = {
                success: true,
                data: {
                    items: data.items,
                    total: data.total,
                    page: data.page,
                    pages: data.pages,
                },
            };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to get posts by tag",
            };
            res.status(500).json(response);
        }
    }

    // PATCH /api/community/posts/:id
    async updatePost(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.updateRealtimePost(req.params.id, userId, req.body);
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update post";
            let status = 400;
            if (message === "Post not found") status = 404;
            else if (message === "Forbidden") status = 403;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // DELETE /api/community/posts/:id
    async deletePost(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
           const data = await this.service.deleteRealtimePost(req.params.id, userId);
            const response: ApiResponseDTO = { success: true,data };
            res.status(200).json(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete post";
            let status = 400;
            if (message === "Post not found") status = 404;
            else if (message === "Forbidden") status = 403;
            const response: ApiResponseDTO = { success: false, message };
            res.status(status).json(response);
        }
    }

    // POST /api/community/reactions/like
    async like(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const data = await this.service.like({ ...req.body, userId });
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to like",
            };
            res.status(400).json(response);
        }
    }

    // POST /api/community/reactions/unlike
    async unlike(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            await this.service.unlike({ ...req.body, userId });
            const response: ApiResponseDTO = { success: true };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : "Failed to unlike",
            };
            res.status(400).json(response);
        }
    }

    // GET /api/community/reactions/my-liked-posts
    async getMyLikedPosts(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const postIdsParam = (req.query.postIds as string) || '';
            const postIds = postIdsParam ? postIdsParam.split(',').filter(Boolean) : undefined;
            const data = await this.service.listMyLikedPostIds(userId, postIds);
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : 'Failed to get liked posts',
            };
            res.status(500).json(response);
        }
    }
    // GET /api/community/reactions/my-liked-comments
    async getMyLikedComments(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId as string;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" } as ApiResponseDTO);
                return;
            }
            const commentIdsParam = (req.query.commentIds as string) || '';
            const commentIds = commentIdsParam ? commentIdsParam.split(',').filter(Boolean) : undefined;
            const data = await this.service.listMyLikedCommentIds(userId, { commentIds });
            const response: ApiResponseDTO = { success: true, data };
            res.status(200).json(response);
        } catch (err) {
            const response: ApiResponseDTO = {
                success: false,
                message: err instanceof Error ? err.message : 'Failed to get liked comments',
            };
            res.status(500).json(response);
        }
    }
        async getTrendingTags(req: Request, res: Response): Promise<void> {
            try {
                const limit = req.query.limit ? Number(req.query.limit) : undefined;
                const data = await this.service.getTrendingTags(limit);
                const response: ApiResponseDTO = { success: true, data };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get trending tags",
                };
                res.status(400).json(response);
            }
        }

        // GET /api/community/tags
        async getAllTags(req: Request, res: Response): Promise<void> {
            try {
                const data = await this.service.getAllTags();
                const response: ApiResponseDTO = { success: true, data };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get tags",
                };
                res.status(400).json(response);
            }
        }

        // POST /api/community/users/:id/follow
        async followUser(req: Request, res: Response): Promise<void> {
            try {
                const followerId = (req as any).user?.userId as string;
                if (!followerId) {
                    const response: ApiResponseDTO = { success: false, message: "Unauthorized" };
                    res.status(401).json(response);
                    return;
                }
                const followingId = req.params.id || (req.body && (req.body as { followingId?: string }).followingId);
                if (!followingId) {
                    const response: ApiResponseDTO = { success: false, message: "Missing followingId" };
                    res.status(400).json(response);
                    return;
                }
                await this.service.followUser(followerId, followingId);
                const response: ApiResponseDTO = { success: true };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to follow user",
                };
                res.status(400).json(response);
            }
        }

        // POST /api/community/users/:id/unfollow
        async unfollowUser(req: Request, res: Response): Promise<void> {
            try {
                const followerId = (req as any).user?.userId as string;
                if (!followerId) {
                    const response: ApiResponseDTO = { success: false, message: "Unauthorized" };
                    res.status(401).json(response);
                    return;
                }
                const followingId = req.params.id || (req.body && (req.body as { followingId?: string }).followingId);
                if (!followingId) {
                    const response: ApiResponseDTO = { success: false, message: "Missing followingId" };
                    res.status(400).json(response);
                    return;
                }
                await this.service.unfollowUser(followerId, followingId);
                const response: ApiResponseDTO = { success: true };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to unfollow user",
                };
                res.status(400).json(response);
            }
        }

        // GET /api/community/users/:id/wall
        async getUserWall(req: Request, res: Response): Promise<void> {
            try {
                const userId = req.params.id;
                const data = await this.service.getUserWall(userId);
                const response: ApiResponseDTO = { success: true, data };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get user wall",
                };
                res.status(400).json(response);
            }
        }

        // GET /api/community/users/:id/following
        async getFollowing(req: Request, res: Response): Promise<void> {
            try {
                const userId = req.params.id;
                const data = await this.service.getFollowing(userId);
                const response: ApiResponseDTO = { success: true, data };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get following",
                };
                res.status(400).json(response);
            }
        }

        // GET /api/community/users/:id/is-following
        async isFollowing(req: Request, res: Response): Promise<void> {
            try {
                const followerId = (req as any).user?.userId as string;
                if (!followerId) {
                    const response: ApiResponseDTO = { success: false, message: "Unauthorized" };
                    res.status(401).json(response);
                    return;
                }
                const targetId = req.params.id;
                const data = await this.service.isFollowing(followerId, targetId);
                const response: ApiResponseDTO = { success: true, data };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to check following",
                };
                res.status(400).json(response);
            }
        }
        async getTopActiveMuas(req: Request, res: Response): Promise<void> {
            try {
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const docs = await this.service.getTopActiveMuas(limit);
            const response: ApiResponseDTO = { success: true, data: docs };
            res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get top active users",
                };
                res.status(400).json(response);
            }
        }
        async getFollowingUsers(req: Request, res: Response): Promise<void> {
            try {
                const userId = (req as any).user?.userId as string;
                if (!userId) {
                    const response: ApiResponseDTO = { success: false, message: "Unauthorized" };
                    res.status(401).json(response);
                    return;
                }
                const limit = req.query.limit ? Number(req.query.limit) : 10;
                const docs = await this.service.getFollowingUsers(userId, limit);
                const response: ApiResponseDTO<any> = { success: true, data: docs };
                 res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get following users",
                };
                res.status(400).json(response);
            }
        }
        async getPostsByFollowingUsers(req: Request, res: Response): Promise<void> {
            try {
                const userId = (req as any).user?.userId as string;
                if (!userId) {
                    const response: ApiResponseDTO = { success: false, message: "Unauthorized" };
                    res.status(401).json(response);
                    return;
                }
                const page = req.query.page ? Number(req.query.page) : 1;
                const limit = req.query.limit ? Number(req.query.limit) : 10;
                const docs = await this.service.getPostsByFollowingUsers(userId,{page,limit} );
                const response: ApiResponseDTO<any> = { success: true, data: docs };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to get posts by following users",
                };
                res.status(400).json(response);
            }
        }

        // GET /api/community/services/search
        async searchServices(req: Request, res: Response): Promise<void> {
            try {
                const { q, page, limit } = req.query as any;
                const data = await this.service.searchServices({
                    q: q as string,
                    page: page ? Number(page) : undefined,
                    limit: limit ? Number(limit) : undefined,
                });
                const response: ApiResponseDTO = {
                    success: true,
                    data: {
                        items: data.items,
                        total: data.total,
                        page: data.page,
                        pages: data.pages,
                    },
                };
                res.status(200).json(response);
            } catch (err) {
                const response: ApiResponseDTO = {
                    success: false,
                    message: err instanceof Error ? err.message : "Failed to search services",
                };
                res.status(500).json(response);
            }
        }
    }