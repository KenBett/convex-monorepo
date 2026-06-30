import type { AuthProviderMaterializedConfig } from "@convex-dev/auth/server";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type CreateOrUpdateUserArgs = {
  existingUserId: Id<"users"> | null;
  type: "oauth" | "credentials" | "email" | "phone" | "verification";
  provider: AuthProviderMaterializedConfig;
  profile: Record<string, unknown> & {
    email?: string;
    phone?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  };
};

function toUserFields(
  profile: CreateOrUpdateUserArgs["profile"],
  emailVerified: boolean,
  phoneVerified: boolean,
): Partial<Doc<"users">> {
  const fields: Partial<Doc<"users">> = {};
  if (typeof profile.name === "string") {
    fields.name = profile.name;
  }
  if (typeof profile.email === "string") {
    fields.email = profile.email;
  }
  if (typeof profile.image === "string") {
    fields.image = profile.image;
  }
  if (typeof profile.phone === "string") {
    fields.phone = profile.phone;
  }
  if (emailVerified) {
    fields.emailVerificationTime = Date.now();
  }
  if (phoneVerified) {
    fields.phoneVerificationTime = Date.now();
  }
  return fields;
}

async function uniqueUserWithVerifiedEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
    .take(2);
  return users.length === 1 ? users[0] : null;
}

export async function createOrUpdateAuthUser(
  ctx: MutationCtx,
  args: CreateOrUpdateUserArgs,
): Promise<Id<"users">> {
  const {
    profile: {
      emailVerified: profileEmailVerified,
      phoneVerified: profilePhoneVerified,
      ...profile
    },
    provider,
    existingUserId,
  } = args;

  const emailVerified =
    profileEmailVerified ??
    (provider.type === "oauth" || provider.type === "oidc");
  const phoneVerified = profilePhoneVerified ?? false;
  const userData = toUserFields(profile, emailVerified, phoneVerified);

  if (existingUserId) {
    const existing = await ctx.db.get("users", existingUserId);
    if (existing) {
      await ctx.db.patch("users", existingUserId, userData);
      return existingUserId;
    }
  }

  if (typeof profile.email === "string" && emailVerified) {
    const linkedUser = await uniqueUserWithVerifiedEmail(ctx, profile.email);
    if (linkedUser) {
      await ctx.db.patch("users", linkedUser._id, userData);
      return linkedUser._id;
    }
  }

  return await ctx.db.insert("users", userData);
}
