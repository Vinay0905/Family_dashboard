import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  due_date: z.string().date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.string().uuid().optional(),
  is_personal: z.boolean().default(false),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;