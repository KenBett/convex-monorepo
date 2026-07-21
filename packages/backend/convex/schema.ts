import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const listingTagValidator = v.union(
  v.literal("organic"),
  v.literal("export_grade"),
  v.literal("washed"),
  v.literal("sorted"),
  v.literal("cold_chain"),
  v.literal("pesticide_free"),
  v.literal("irrigated"),
  v.literal("dried"),
  v.literal("fresh_picked"),
  v.literal("bulk_ready"),
  v.literal("sample_available"),
  v.literal("traceable"),
  v.literal("weekly_supply"),
);

const listingPackagingValidator = v.union(
  v.literal("bulk"),
  v.literal("crates"),
  v.literal("gunny_bags"),
  v.literal("bags"),
);

const listingCertificationValidator = v.union(
  v.literal("kepsa"),
  v.literal("globalgap"),
  v.literal("fairtrade"),
  v.literal("organic_certified"),
);

const profileLocationFields = {
  locationCapturedAt: v.optional(v.number()),
  locationLabel: v.optional(v.string()),
  /** Required on new profiles via mutations; optional in schema until after wipe. */
  locationLat: v.optional(v.number()),
  locationLng: v.optional(v.number()),
};

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
    role: v.optional(
      v.union(v.literal("farmer"), v.literal("buyer"), v.literal("driver")),
    ),
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
    ...profileLocationFields,
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
    ...profileLocationFields,
  }).index("by_userId", ["userId"]),
  listings: defineTable({
    availableFrom: v.optional(v.number()),
    certifications: v.optional(v.array(listingCertificationValidator)),
    county: v.string(),
    crop: v.string(),
    /** Demo Pinterest image search — /demo/listings only; never shown to buyers. */
    demoPinterestQuery: v.optional(v.string()),
    /** Demo rehearsal prompt — never shown to buyers/farmers; /demo/listings only. */
    demoSearchPrompt: v.optional(v.string()),
    description: v.string(),
    farmerId: v.id("farmerProfiles"),
    grade: v.optional(v.string()),
    harvestWindowLabel: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    minOrderKg: v.optional(v.number()),
    packaging: v.optional(listingPackagingValidator),
    packUnitKg: v.optional(v.number()),
    pricePerKg: v.number(),
    quantityKg: v.number(),
    sizeOrCalibre: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("sold_out"),
      v.literal("expired"),
    ),
    tags: v.optional(v.array(listingTagValidator)),
    variety: v.optional(v.string()),
  })
    .index("by_crop", ["crop"])
    .index("by_crop_and_status", ["crop", "status"])
    .index("by_farmer", ["farmerId"])
    .index("by_status", ["status"]),
  orders: defineTable({
    agreedPricePerKg: v.number(),
    buyerBusinessName: v.optional(v.string()),
    buyerId: v.id("buyerProfiles"),
    cancelledReason: v.optional(v.string()),
    county: v.optional(v.string()),
    createdAt: v.number(),
    crop: v.optional(v.string()),
    farmerId: v.id("farmerProfiles"),
    listingId: v.id("listings"),
    mpesaCheckoutRequestId: v.optional(v.string()),
    mpesaPhoneNumber: v.optional(v.string()),
    mpesaReceiptNumber: v.optional(v.string()),
    neededByLabel: v.optional(v.string()),
    neededByMs: v.optional(v.number()),
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
  drives: defineTable({
    assignedDriverUserId: v.id("users"),
    countyA: v.string(),
    countyB: v.string(),
    createdAt: v.number(),
    crop: v.string(),
    deliveredAt: v.optional(v.number()),
    dropoffLat: v.optional(v.number()),
    dropoffLng: v.optional(v.number()),
    grade: v.optional(v.string()),
    neededByLabel: v.optional(v.string()),
    neededByMs: v.optional(v.number()),
    orderId: v.id("orders"),
    pickedUpAt: v.optional(v.number()),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pointALabel: v.string(),
    pointBLabel: v.string(),
    quantityKg: v.number(),
    status: v.union(
      v.literal("assigned"),
      v.literal("picked_up"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  })
    .index("by_driver", ["assignedDriverUserId"])
    .index("by_order", ["orderId"]),
});
