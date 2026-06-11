import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const getUser = query({
  args: {
    id: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      emailVerified: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    // TODO: Add role checks here
    return await ctx.db.get("users", args.id);
  },
});
