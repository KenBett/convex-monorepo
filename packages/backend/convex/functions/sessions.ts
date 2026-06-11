import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

export const createSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  returns: v.id("sessions"),
  handler: async (ctx, args): Promise<Id<"sessions">> => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
    });
  },
});

export const getSession = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      _creationTime: v.number(),
      userId: v.id("users"),
      expiresAt: v.number(),
      token: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<Doc<"sessions"> | null> => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});
