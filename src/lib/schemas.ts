import { z } from "zod";

export const PriorityEnum = z.enum(["low", "medium", "high"]);
export type Priority = z.infer<typeof PriorityEnum>;

export const StatusEnum = z.enum(["pending", "in_progress", "completed"]);
export type Status = z.infer<typeof StatusEnum>;

export const ClientLiteSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
});
export type ClientLite = z.infer<typeof ClientLiteSchema>;

export const ClientSchema = ClientLiteSchema;
export type Client = z.infer<typeof ClientSchema>;

export const ActionItemSchema = z.object({
  id: z.number(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  critical: z.boolean().nullable().optional(),
  client: ClientLiteSchema.nullable().optional(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const CommentSchema = z.object({
  id: z.number(),
  text: z.string().nullable().optional(),
  action_item: z.number().nullable().optional(),
  comment_parent: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
}).passthrough();
export type Comment = z.infer<typeof CommentSchema>;

export const CreateActionItemSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: PriorityEnum,
  critical: z.boolean(),
});
export type CreateActionItemInput = z.infer<typeof CreateActionItemSchema>;

export const UpdateActionItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: PriorityEnum.optional(),
  status: StatusEnum.optional(),
  critical: z.boolean().optional(),
});
export type UpdateActionItemInput = z.infer<typeof UpdateActionItemSchema>;

export const PostCommentSchema = z.object({
  action_item: z.number().int().positive(),
  text: z.string().min(1, "Comment cannot be empty"),
});
export type PostCommentInput = z.infer<typeof PostCommentSchema>;

export const PostSubCommentSchema = z.object({
  comment_parent: z.number().int().positive(),
  text: z.string().min(1, "Reply cannot be empty"),
});
export type PostSubCommentInput = z.infer<typeof PostSubCommentSchema>;
