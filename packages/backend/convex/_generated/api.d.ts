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
import type * as dev_wipeDevDeployment from "../dev/wipeDevDeployment.js";
import type * as drives from "../drives.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_buyerNeededBy from "../lib/buyerNeededBy.js";
import type * as lib_createAuthUser from "../lib/createAuthUser.js";
import type * as lib_driveCoords from "../lib/driveCoords.js";
import type * as lib_fulfillment from "../lib/fulfillment.js";
import type * as lib_listingAttributes from "../lib/listingAttributes.js";
import type * as lib_listingImages from "../lib/listingImages.js";
import type * as lib_listings from "../lib/listings.js";
import type * as lib_orders from "../lib/orders.js";
import type * as lib_rag from "../lib/rag.js";
import type * as lib_roles from "../lib/roles.js";
import type * as listings from "../listings.js";
import type * as listings_buyerChatContext from "../listings/buyerChatContext.js";
import type * as listings_buyerChatHttp from "../listings/buyerChatHttp.js";
import type * as listings_buyerChatListingAnswer from "../listings/buyerChatListingAnswer.js";
import type * as listings_buyerChatMessages from "../listings/buyerChatMessages.js";
import type * as listings_buyerChatOrchestrate from "../listings/buyerChatOrchestrate.js";
import type * as listings_buyerChatParse from "../listings/buyerChatParse.js";
import type * as listings_buyerChatStream from "../listings/buyerChatStream.js";
import type * as listings_buyerChatTrail from "../listings/buyerChatTrail.js";
import type * as listings_buyerOrderDraftValidators from "../listings/buyerOrderDraftValidators.js";
import type * as listings_buyerOrderResolve from "../listings/buyerOrderResolve.js";
import type * as listings_buyerSearchExecute from "../listings/buyerSearchExecute.js";
import type * as listings_buyerSearchIntentNormalize from "../listings/buyerSearchIntentNormalize.js";
import type * as listings_buyerSearchIntentParse from "../listings/buyerSearchIntentParse.js";
import type * as listings_buyerSourcing from "../listings/buyerSourcing.js";
import type * as listings_demoHotelSeed from "../listings/demoHotelSeed.js";
import type * as listings_demoInventory from "../listings/demoInventory.js";
import type * as listings_demoInventorySeedData from "../listings/demoInventorySeedData.js";
import type * as listings_ragDebug from "../listings/ragDebug.js";
import type * as listings_ragSync from "../listings/ragSync.js";
import type * as listings_search from "../listings/search.js";
import type * as orders from "../orders.js";
import type * as orders_escrow from "../orders/escrow.js";
import type * as orders_mpesaCallback from "../orders/mpesaCallback.js";
import type * as orders_mpesaClient from "../orders/mpesaClient.js";
import type * as orders_mpesaWebhookHttp from "../orders/mpesaWebhookHttp.js";
import type * as orders_payment from "../orders/payment.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "dev/wipeDevDeployment": typeof dev_wipeDevDeployment;
  drives: typeof drives;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/buyerNeededBy": typeof lib_buyerNeededBy;
  "lib/createAuthUser": typeof lib_createAuthUser;
  "lib/driveCoords": typeof lib_driveCoords;
  "lib/fulfillment": typeof lib_fulfillment;
  "lib/listingAttributes": typeof lib_listingAttributes;
  "lib/listingImages": typeof lib_listingImages;
  "lib/listings": typeof lib_listings;
  "lib/orders": typeof lib_orders;
  "lib/rag": typeof lib_rag;
  "lib/roles": typeof lib_roles;
  listings: typeof listings;
  "listings/buyerChatContext": typeof listings_buyerChatContext;
  "listings/buyerChatHttp": typeof listings_buyerChatHttp;
  "listings/buyerChatListingAnswer": typeof listings_buyerChatListingAnswer;
  "listings/buyerChatMessages": typeof listings_buyerChatMessages;
  "listings/buyerChatOrchestrate": typeof listings_buyerChatOrchestrate;
  "listings/buyerChatParse": typeof listings_buyerChatParse;
  "listings/buyerChatStream": typeof listings_buyerChatStream;
  "listings/buyerChatTrail": typeof listings_buyerChatTrail;
  "listings/buyerOrderDraftValidators": typeof listings_buyerOrderDraftValidators;
  "listings/buyerOrderResolve": typeof listings_buyerOrderResolve;
  "listings/buyerSearchExecute": typeof listings_buyerSearchExecute;
  "listings/buyerSearchIntentNormalize": typeof listings_buyerSearchIntentNormalize;
  "listings/buyerSearchIntentParse": typeof listings_buyerSearchIntentParse;
  "listings/buyerSourcing": typeof listings_buyerSourcing;
  "listings/demoHotelSeed": typeof listings_demoHotelSeed;
  "listings/demoInventory": typeof listings_demoInventory;
  "listings/demoInventorySeedData": typeof listings_demoInventorySeedData;
  "listings/ragDebug": typeof listings_ragDebug;
  "listings/ragSync": typeof listings_ragSync;
  "listings/search": typeof listings_search;
  orders: typeof orders;
  "orders/escrow": typeof orders_escrow;
  "orders/mpesaCallback": typeof orders_mpesaCallback;
  "orders/mpesaClient": typeof orders_mpesaClient;
  "orders/mpesaWebhookHttp": typeof orders_mpesaWebhookHttp;
  "orders/payment": typeof orders_payment;
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
