# Demo inventory — semantic search rehearsal

## Destructive seed

```bash
# Requires DEMO_PAYMENTS=true on the Convex deployment
bunx convex run listings/demoHotelSeed:seedHotelDemoInventory
```

**Warning:** this wipes **all** `drives`, `orders`, and `listings` on the deployment, clears the listing RAG namespace, then inserts 50 seed listings (no photos). Demo farmer co-ops are upserted (not wiped).

## Inventory

| Crop | Count |
| --- | --- |
| maize, beans, potatoes, tomatoes, onions, cabbage | 5 each |
| avocado, bananas, coffee, tea, wheat | 4 each |
| **Total** | **50** |

- Marker in descriptions: `DEMO_INVENTORY_SEED` (stripped from buyer UI)
- Each listing has `demoSearchPrompt` — **not** embedded in RAG; shown only on `/demo/listings`
- Each listing has `demoPinterestQuery` — shallow keyword phrase to paste into Pinterest for produce photos; `/demo/listings` only
- **No photos** — add images later via `/demo/listings` (signed-in, `DEMO_PAYMENTS=true`)

## Edit seed listings

```text
/demo/listings
```

List + detail show a **Demo query** panel and a **Pinterest search** panel (copy-to-clipboard). Paste the demo query into buyer sourcing chat to prove vector/hybrid retrieval; paste the Pinterest phrase into Pinterest search to find matching produce images.

## Sample rehearsal prompts

| Crop | Cooperative | Demo query | Signature hooks |
| --- | --- | --- | --- |
| bananas | Thika Hills | Soft yellow cooking bananas for matoke near Thika this week — organic, not green | Apple banana, organic, matoke |
| avocado | Thika Hills | Export-grade Hass avocados calibre 18-22 with GlobalGAP from Kiambu cold chain | Hass 18-22, GlobalG.A.P., cold_chain |
| maize | Nakuru Highlands | Large volume Grade 1 white maize WH505 from Nakuru for flour millers weekly | WH505, weekly_supply, millers |
| coffee | Meru Plateau | Organic Fairtrade Batian AA washed coffee microlot from Meru | Batian AA, Fairtrade, organic |
| potatoes | Ruiru Valley | Organic large baking potatoes Dutch Robijn 70mm plus from Ruiru with cold storage | Dutch Robijn, 70mm+, organic |
| tea | Gatundu Organic | Organic Fairtrade CTC BP1 tea from Gatundu with weekly leaf supply | BP1, Fairtrade, weekly |

## Expected story

- Glass-box trail: **Understanding → Searching (vector or hybrid) → Filters → Ranked**
- Pasting a listing’s demo query should rank **that listing in the top results**
- Hard-filter tags (`organic`, `export_grade`, `pesticide_free`) exercise AND filters when mentioned

## Pitch language

- Say: AI sourcing **harness** grounded in **vector-indexed live listings** + tools
- Do not claim the demo prompt is indexed — retrieval matches description + attributes/tags
