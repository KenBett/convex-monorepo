/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as knowledgeSpeech from "../knowledgeSpeech.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_createAuthUser from "../lib/createAuthUser.js";
import type * as lib_listings from "../lib/listings.js";
import type * as lib_rag from "../lib/rag.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_voicePipeline from "../lib/voicePipeline.js";
import type * as lib_voiceQueryCache from "../lib/voiceQueryCache.js";
import type * as listings from "../listings.js";
import type * as listings_ragSync from "../listings/ragSync.js";
import type * as users from "../users.js";
import type * as voiceStream from "../voiceStream.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  knowledge: typeof knowledge;
  knowledgeSpeech: typeof knowledgeSpeech;
  "lib/auth": typeof lib_auth;
  "lib/createAuthUser": typeof lib_createAuthUser;
  "lib/listings": typeof lib_listings;
  "lib/rag": typeof lib_rag;
  "lib/roles": typeof lib_roles;
  "lib/voicePipeline": typeof lib_voicePipeline;
  "lib/voiceQueryCache": typeof lib_voiceQueryCache;
  listings: typeof listings;
  "listings/ragSync": typeof listings_ragSync;
  users: typeof users;
  voiceStream: typeof voiceStream;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
};
