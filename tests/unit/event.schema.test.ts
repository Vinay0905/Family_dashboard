import { describe, expect, it } from "vitest";
import { createEventSchema } from "@/lib/validations/event.schema";

describe("createEventSchema", () => {
  it("accepts a valid event", () => {
    const result = createEventSchema.safeParse({
      title: "School meeting",
      start_at: new Date().toISOString(),
      category: "school",
      is_personal: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createEventSchema.safeParse({
      title: "",
      start_at: new Date().toISOString(),
      category: "school",
      is_personal: false,
    });

    expect(result.success).toBe(false);
  });
});
