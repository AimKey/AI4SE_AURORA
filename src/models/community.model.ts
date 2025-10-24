import { RESOURCE_TYPES, POST_STATUS, TARGET_TYPES } from "constants/index";
import { model, Schema, Types } from "mongoose";

const PostSchema = new Schema({
  authorId: { type: Types.ObjectId, ref: "User", required: true },
  content:  { type: String },
  media: [
    {
      type: {type: String,enum:Object.values(RESOURCE_TYPES), required: true,},
      url: { type: String, required: true },
    },
  ],
  tags:     [{ type: String, index: true }], // lưu slug hoặc name (multikey index)
  likesCount:    { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  status:  { type: String, enum: Object.values(POST_STATUS), default:POST_STATUS.PUBLISHED},
  attachedServices: [{ type: Types.ObjectId, ref: "ServicePackage" }], // nếu cần
}, { timestamps: true });

const CommentSchema = new Schema({
  postId:   { type: Types.ObjectId, ref: "Post", required: true },
  authorId: { type: Types.ObjectId, ref: "User", required: true },
  parentId: { type: Types.ObjectId, ref: "Comment", default: null }, // null = comment gốc
  content:  { type: String, required: true },
  likesCount: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },
}, { timestamps: true });

const ReactionSchema = new Schema({
  userId:   { type: Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: Object.values(TARGET_TYPES), required: true },
  postId: { type: Types.ObjectId,ref:'Post', default: null },
  commentId: { type: Types.ObjectId,ref:'Comment', default: null },
}, { timestamps: true });

ReactionSchema.index({ userId: 1, postId: 1,commentId: 1, targetType: 1 }, { unique: true });

const TagSchema = new Schema({
  name:  { type: String, required: true },          // tên hiển thị
  slug:  { type: String, required: true, unique: true }, // normalized
  description: { type: String },
  postsCount: { type: Number, default: 0 },
}, { timestamps: true });

const FollowSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // chỉ cần createdAt
);
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = model("Follow", FollowSchema);
export const Tag = model("Tag", TagSchema);
export const Reaction = model("Reaction", ReactionSchema);
export const Comment = model("Comment", CommentSchema);
export const Post = model("Post", PostSchema);
