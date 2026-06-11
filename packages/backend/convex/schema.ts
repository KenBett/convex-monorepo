import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  }),

  sessions: defineTable({
    userId: v.id("users"),
    expiresAt: v.number(),
    token: v.string(),
  }).index("by_token", ["token"]),

  accounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
  }),
});
