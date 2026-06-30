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
    onboardingComplete: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal("farmer"), v.literal("buyer"))),
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
  farmerProfiles: defineTable({
    cooperativeName: v.string(),
    county: v.string(),
    mpesaNumber: v.string(),
    phoneNumber: v.string(),
    rating: v.optional(v.number()),
    userId: v.id("users"),
    verifiedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
  buyerProfiles: defineTable({
    businessName: v.string(),
    businessType: v.union(
      v.literal("hotel"),
      v.literal("supermarket"),
      v.literal("exporter"),
      v.literal("individual"),
    ),
    county: v.string(),
    phoneNumber: v.string(),
    userId: v.id("users"),
    verifiedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
  listings: defineTable({
    availableFrom: v.optional(v.number()),
    county: v.string(),
    crop: v.string(),
    description: v.string(),
    farmerId: v.id("farmerProfiles"),
    grade: v.optional(v.string()),
    pricePerKg: v.number(),
    quantityKg: v.number(),
    ragDocumentId: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("sold_out"),
      v.literal("expired"),
    ),
  })
    .index("by_crop", ["crop"])
    .index("by_farmer", ["farmerId"])
    .index("by_status", ["status"]),
  orders: defineTable({
    agreedPricePerKg: v.number(),
    buyerId: v.id("buyerProfiles"),
    createdAt: v.number(),
    farmerId: v.id("farmerProfiles"),
    listingId: v.id("listings"),
    mpesaCheckoutRequestId: v.optional(v.string()),
    quantityKg: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("escrowed"),
      v.literal("delivered"),
      v.literal("completed"),
      v.literal("disputed"),
      v.literal("cancelled"),
    ),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_farmer", ["farmerId"])
    .index("by_listing", ["listingId"]),
});
