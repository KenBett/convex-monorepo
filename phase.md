# Offtake OS — Build Instructions for Cursor

You are implementing a B2B agricultural marketplace MVP in an existing Turborepo monorepo. The repo already has: Convex backend, Convex Auth with Google OAuth, a working RAG setup using `@convex-dev/rag` with OpenAI `text-embedding-3-small`, an Expo mobile app, and a Next.js web app, with shared Convex queries/mutations/types in a shared package.

Do not rebuild anything that already works. Do not skip ahead to a later phase before the current phase's "Done when" checklist is fully true. If a step is ambiguous or you cannot find the file/pattern referenced, stop and ask rather than guessing or inventing a new pattern that conflicts with the existing codebase.

Work through phases in order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7.

---

## PHASE 0 — Repo Audit (no code changes in this phase)

Before writing anything, inspect the repo and report back on each of these:

1. Open `schema.ts` (or wherever the Convex schema lives) and list every field on the current `users` table.
2. Find the file where `@convex-dev/rag` is initialized. Report: the embedding model configured, whether ingestion happens via a mutation, action, or direct component call, and the function signature currently used to ingest a document.
3. Check `convex/convex.config.ts` (or equivalent) and report whether `@convex-dev/agent` is already installed. If not, do not install it yet — that happens in Phase 3.
4. Check the monorepo's `apps/` directory and report: is there already a distinct Next.js app for farmer web vs buyer web, or only one Next.js app? This determines the routing approach in Phase 1.
5. Confirm the shared package path (e.g. `packages/backend` or similar) that both Expo and Next.js import Convex functions and types from.

Output a short summary of all five answers before proceeding to Phase 1. Do not write schema or UI code in this phase.

---

## PHASE 1 — Schema & Roles

### 1.1 — Add roles to the user model
- Add `role: v.union(v.literal("farmer"), v.literal("buyer"))` to the users table, allowing it to be unset/optional until onboarding completes. Add `onboardingComplete: v.boolean()` defaulting to `false`.
- Create two new tables in `schema.ts`:

```ts
farmerProfiles: defineTable({
  userId: v.id("users"),
  cooperativeName: v.string(),
  county: v.string(),
  phoneNumber: v.string(),
  mpesaNumber: v.string(),
  rating: v.optional(v.number()),
  verifiedAt: v.optional(v.number()),
}).index("by_userId", ["userId"]),

buyerProfiles: defineTable({
  userId: v.id("users"),
  businessName: v.string(),
  businessType: v.union(
    v.literal("hotel"),
    v.literal("supermarket"),
    v.literal("exporter"),
    v.literal("individual")
  ),
  county: v.string(),
  phoneNumber: v.string(),
  verifiedAt: v.optional(v.number()),
}).index("by_userId", ["userId"]),
```

### 1.2 — Routing decision
- Based on the Phase 0 audit answer about app structure:
  - If farmer web and buyer web are route groups within ONE Next.js app: implement a single role-based redirect at the root layout or middleware level. Farmers go to `/farmer/*`, buyers go to `/buyer/*`. Do not duplicate this check on individual pages.
  - If they are two separate Next.js apps: each app checks the logged-in user's `role` at its root layout and redirects to the other app (or shows an error) if the role doesn't match.
- Implement this once, in one shared location per app, not per-page.

### 1.3 — Produce listings table

```ts
listings: defineTable({
  farmerId: v.id("farmerProfiles"),
  crop: v.string(), // validate against CROP_TYPES const array
  quantityKg: v.number(),
  pricePerKg: v.number(),
  county: v.string(),
  grade: v.optional(v.string()),
  availableFrom: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("sold_out"), v.literal("expired")),
  description: v.string(),
  ragDocumentId: v.optional(v.string()),
})
  .index("by_farmer", ["farmerId"])
  .index("by_status", ["status"])
  .index("by_crop", ["crop"]),
```

- Create a shared const array `CROP_TYPES` and `COUNTIES` (Kenyan counties, ~10 for MVP) in the shared package. Both apps must import these, not redefine them locally.

### 1.4 — Orders table (schema only, no mutations yet)

```ts
orders: defineTable({
  listingId: v.id("listings"),
  buyerId: v.id("buyerProfiles"),
  farmerId: v.id("farmerProfiles"),
  quantityKg: v.number(),
  agreedPricePerKg: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("escrowed"),
    v.literal("delivered"),
    v.literal("completed"),
    v.literal("disputed"),
    v.literal("cancelled")
  ),
  mpesaCheckoutRequestId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_buyer", ["buyerId"])
  .index("by_farmer", ["farmerId"])
  .index("by_listing", ["listingId"]),
```

**Phase 1 Done when:**
- [ ] `schema.ts` compiles with no errors
- [ ] All four tables exist (`farmerProfiles`, `buyerProfiles`, `listings`, `orders`) with the indexes above
- [ ] You can manually insert a test farmer profile and a test listing via the Convex dashboard
- [ ] Role-based redirect is implemented and tested with a manually-set role on a test user

---

## PHASE 2 — Listing CRUD + RAG Sync + Farmer UI (Mobile + Web)

### 2.1 — Build the RAG sync helper first
- Create `convex/listings/ragSync.ts` with one exported internal function `syncListingToRag(ctx, listingId)`.
- This function: reads the listing row, formats it as plain readable sentences (not JSON) including crop, quantity, price, county, grade, description, then calls the RAG component's ingest function.
- If the RAG component supports upsert-by-key: use the listing's own `_id` as the document key.
- If it only supports add + delete: on update, delete the existing `ragDocumentId` first, ingest fresh, then store the new `ragDocumentId` back on the listing row.
- Do not write any UI code until this function works in isolation — test it from the Convex dashboard by calling it against a manually created listing.

### 2.2 — Wire mutations to call the sync helper
- `createListing` mutation: insert row → call `syncListingToRag`.
- `updateListing` mutation: patch row → call `syncListingToRag` again (full re-sync).
- `markSoldOut` mutation: set `status: "sold_out"` → call `syncListingToRag` (do not hard-delete from RAG; the agent should be able to say "that one's sold out").
- Add a `listingsByFarmer` query (indexed on `by_farmer`) used by both apps in 2.3.

### 2.3 — Farmer UI: build mobile AND web together, not sequentially
Do not finish the mobile screen and then port to web afterward. Build both in the same work session against the same shared mutations/queries.

**Shared validation (build this first):**
- Add a single Zod (or Valibot, match what's already used in the repo) schema in the shared package for listing form validation: crop required, quantity positive number, price positive number, county required. Both forms import this one schema — do not redefine validation rules separately in each app.

**Mobile (Expo):**
- `My Listings` screen: scrollable list using `useQuery(api.listings.listingsByFarmer)`.
- Create listing form: crop picker, quantity input, price input, county picker, description text area.
- Edit and "mark sold out" actions per listing row.

**Web (Next.js):**
- `My Listings` page: table or card grid using the same `useQuery(api.listings.listingsByFarmer)`.
- Same create listing form fields, same shared validation schema.
- Same edit and "mark sold out" actions.

**Phase 2 Done when:**
- [ ] Creating a listing on mobile makes it appear on web without a manual refresh, and vice versa
- [ ] Editing and marking sold out work identically from both apps
- [ ] After creating a listing, querying the RAG component directly (dashboard or temp debug query) returns that listing's content for a relevant semantic search
- [ ] Both forms use the same imported validation schema — confirm by checking both files import from the same shared path, not two separate definitions

---

## PHASE 3 — Convex Agent Setup

### 3.1 — Install and configure
- Add `@convex-dev/agent` to `convex.config.ts` if Phase 0 confirmed it isn't already there.
- Create `convex/agents/buyerSearchAgent.ts`. System prompt must instruct the agent:
  - It is a sourcing assistant for buyers on a Kenyan produce marketplace.
  - It must only recommend listings confirmed as currently active and in-stock (this becomes enforceable in Phase 4 — for now just set the instruction).
  - If no confident match exists, it must say so directly rather than guessing or inventing a listing.
- Use the same OpenAI provider/key already configured for embeddings; pick a chat-capable model for generation.

### 3.2 — Wire RAG retrieval into the agent
- Before generating a response, the agent must call the existing `@convex-dev/rag` search function with the buyer's query text and inject the top-N matching listing chunks into context as candidates.
- Do not let the agent treat retrieved chunks as the final answer yet — that enforcement happens in Phase 4.

### 3.3 — Thread persistence
- On the buyer web search/chat screen, create a thread on first message and store the `threadId` against the buyer's session or user record so reloading the page resumes the same conversation.

**Phase 3 Done when:**
- [ ] Calling the agent (via dashboard test or a temporary script) with a query like "50kg of potatoes" returns a generated response referencing retrieved listing content
- [ ] Reloading the buyer chat page resumes the same thread instead of starting fresh

---

## PHASE 4 — Live Data Tool Call (Anti-Hallucination)

### 4.1 — Build the verification tool
- Define a Convex Agent tool `checkListingAvailability(listingId)` that runs a plain Convex query (no LLM involved) returning the listing's current live `status`, `quantityKg`, `pricePerKg`.

### 4.2 — Update agent instructions
- Update the system prompt from Phase 3.1: "After retrieving candidate listings, you MUST call `checkListingAvailability` on each candidate before mentioning it. Exclude any listing that is sold out or has insufficient quantity for the buyer's request. Never state a price or quantity without having just verified it via this tool. If zero candidates pass verification, say so plainly — do not invent a match."

### 4.3 — Test the staleness scenario explicitly
- Create a listing, confirm it's retrievable by the agent.
- Manually mark it sold out via a direct mutation call (bypassing the normal UI flow) to simulate a race condition.
- Query the agent again with a matching search — confirm the live tool call catches the sold-out status even if RAG re-sync lagged.
- Then test the normal flow: mark sold out via the actual `markSoldOut` mutation, confirm both the RAG re-sync AND the live tool check correctly exclude it.

**Phase 4 Done when:**
- [ ] A sold-out listing manually injected into the system is correctly excluded from the agent's response, with the agent verifying live state via the tool call, not by chance
- [ ] You can demo this exact scenario on request: ask for a crop, get a sold-out item in the candidate pool, watch the agent exclude it and explain why

---

## PHASE 5 — Buyer Web Streaming UI

### 5.1 — Connect Vercel AI SDK
- Use `useChat` (or current equivalent) on buyer web, pointed at a Convex HTTP action that proxies to the Phase 3 agent thread.
- Confirm true token-by-token streaming, not buffered — test this explicitly, including on a throttled network.

### 5.2 — Chat UI with structured listing cards
- Build the chat interface: input box, streamed text response.
- Critically: have the agent's tool call results also returned to the frontend as structured data (not only embedded in the streamed text) so the UI can render real listing cards (farmer/cooperative name, crop, quantity, price, county) — not parse them out of plain text.

### 5.3 — Order action on listing cards
- Each listing card gets a button that kicks off the Phase 6 order flow. This is the primary conversion action on the page — do not bury it below the fold or make it secondary to the chat text.

**Phase 5 Done when:**
- [ ] A buyer can type a natural-language request and see the response stream token-by-token
- [ ] Matched listings render as clickable cards with accurate live data, not just plain text
- [ ] Clicking a card's order button correctly identifies which listing/farmer it refers to

---

## PHASE 6 — Order Flow + M-PESA Escrow

### 6.1 — Order creation
- `createOrder` mutation: validates requested quantity ≤ listing's live `quantityKg`, inserts an `orders` row with `status: "pending"`.
- Buyer UI shows quantity confirmation and calculated total before triggering payment.

### 6.2 — M-PESA STK push
- Integrate Daraja API: trigger STK push on order confirmation, prompt buyer for M-PESA number, send the push.
- Build a Convex HTTP action as the webhook/callback endpoint that receives Safaricom's confirmation and updates `order.status` to `"escrowed"`, storing the M-PESA transaction reference.
- Explicitly handle STK push timeout/cancellation: do not leave an order stuck in `"pending"` with no resolution path — set a clear failed/cancelled state and surface it to the buyer.

### 6.3 — Farmer order visibility (mobile AND web)
- Add `ordersByFarmer` query (indexed on `by_farmer`).
- Build an "Orders" screen/page on both farmer mobile and farmer web using this same query — confirm both update live via `useQuery` reactivity when an order's status changes.
- Add a `markDelivered` mutation, callable from either app. Do not build dispute/grading flows — explicitly out of scope for MVP.

### 6.4 — Quantity decrement + RAG re-sync
- On escrow confirmation, decrement the listing's `quantityKg` (or set `status: "sold_out"` if it hits zero) and call `syncListingToRag` again — this closes the loop with Phase 4's live-check guarantee.

**Phase 6 Done when:**
- [ ] Full path works live: buyer searches → sees accurate listing → orders → completes real/sandbox M-PESA STK push → farmer sees the order appear in real time on BOTH mobile and web without refreshing → listing quantity updates → agent no longer offers the now-depleted stock in a follow-up search

---

## PHASE 7 — Demo Polish (only after Phase 6 is fully working)

- [ ] Seed 15–20 realistic listings across multiple counties and crops, including at least one with near-zero stock to demonstrate the live-check catching it
- [ ] Prepare 3–4 rehearsed buyer queries covering: a clean match, a "no match found" case, and a case where a sold-out item is correctly filtered out live
- [ ] Set up a three-screen demo layout (farmer mobile, farmer web, buyer web) to visually show an order propagating across all three in real time without a refresh
- [ ] Add loading and error states to all three surfaces — no unhandled errors or infinite spinners during a live demo
- [ ] Time the full walkthrough end to end and cut anything that doesn't need to be there

**Phase 7 Done when:**
- [ ] The full demo path has been run three times in a row with no bugs requiring explanation

---

## Rules for this entire build

- Do not introduce a new state management library, ORM, or auth pattern not already in the repo. Use what's already there.
- Do not skip the Phase 0 audit step — assumptions about existing schema/RAG setup made without checking will cause rework later.
- Do not build Phase 3+ agent tooling before Phase 1 and 2 schema/sync are confirmed working — the agent depends on both being correct.
- If at any point a "Done when" checklist item cannot be verified as true, stop and flag it rather than proceeding to the next phase.