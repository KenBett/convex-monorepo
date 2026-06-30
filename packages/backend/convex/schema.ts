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
    imageStorageId: v.id("_storage"),
    pricePerKg: v.number(),
    quantityKg: v.number(),
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
    cancelledReason: v.optional(v.string()),
    createdAt: v.number(),
    farmerId: v.id("farmerProfiles"),
    listingId: v.id("listings"),
    mpesaCheckoutRequestId: v.optional(v.string()),
    mpesaPhoneNumber: v.optional(v.string()),
    mpesaReceiptNumber: v.optional(v.string()),
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
    .index("by_checkout_request_id", ["mpesaCheckoutRequestId"])
    .index("by_farmer", ["farmerId"])
    .index("by_listing", ["listingId"]),
});
