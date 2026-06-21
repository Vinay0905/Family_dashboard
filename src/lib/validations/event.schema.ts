import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional(),
  category: z.enum(["family", "school", "work", "travel", "birthday", "medical", "other"]).default("other"),
  location: z.string().max(300).optional(),
  is_personal: z.boolean().default(false),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;