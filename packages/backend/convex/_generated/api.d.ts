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
import type * as lib_auth from "../lib/auth.js";
import type * as lib_createAuthUser from "../lib/createAuthUser.js";
import type * as lib_listingImages from "../lib/listingImages.js";
import type * as lib_listings from "../lib/listings.js";
import type * as lib_rag from "../lib/rag.js";
import type * as lib_roles from "../lib/roles.js";
import type * as listings from "../listings.js";
import type * as listings_buyerChatHttp from "../listings/buyerChatHttp.js";
import type * as listings_buyerChatParse from "../listings/buyerChatParse.js";
import type * as listings_buyerSearchIntentParse from "../listings/buyerSearchIntentParse.js";
import type * as listings_buyerSourcing from "../listings/buyerSourcing.js";
import type * as listings_ragDebug from "../listings/ragDebug.js";
import type * as listings_ragSync from "../listings/ragSync.js";
import type * as listings_search from "../listings/search.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/createAuthUser": typeof lib_createAuthUser;
  "lib/listingImages": typeof lib_listingImages;
  "lib/listings": typeof lib_listings;
  "lib/rag": typeof lib_rag;
  "lib/roles": typeof lib_roles;
  listings: typeof listings;
  "listings/buyerChatHttp": typeof listings_buyerChatHttp;
  "listings/buyerChatParse": typeof listings_buyerChatParse;
  "listings/buyerSearchIntentParse": typeof listings_buyerSearchIntentParse;
  "listings/buyerSourcing": typeof listings_buyerSourcing;
  "listings/ragDebug": typeof listings_ragDebug;
  "listings/ragSync": typeof listings_ragSync;
  "listings/search": typeof listings_search;
  users: typeof users;
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
