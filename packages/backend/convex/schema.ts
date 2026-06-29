import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  documents: defineTable({
    createdAt: v.number(),
    error: v.optional(v.string()),
    filename: v.optional(v.string()),
    ragEntryId: v.optional(v.string()),
    sourceType: v.union(v.literal("text"), v.literal("file")),
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error"),
    ),
    storageId: v.optional(v.id("_storage")),
    title: v.string(),
    uploadedBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_uploadedBy", ["uploadedBy"]),
});
