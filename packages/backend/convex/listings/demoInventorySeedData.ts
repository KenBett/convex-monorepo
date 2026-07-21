/**
 * Demo inventory seed pack — 50 listings across all crops for semantic search rehearsal.
 * Images omitted — attach later via /demo/listings.
 */

import { DEMO_INVENTORY_SEED_MARKER } from "@repo/types";

export type SeedListingSpec = {
  certifications?: Array<
    "kepsa" | "globalgap" | "fairtrade" | "organic_certified"
  >;
  county: string;
  crop: string;
  demoPinterestQuery: string;
  demoSearchPrompt: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  minOrderKg?: number;
  packaging?: "bulk" | "crates" | "gunny_bags" | "bags";
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  tags?: Array<
    | "organic"
    | "export_grade"
    | "washed"
    | "sorted"
    | "cold_chain"
    | "pesticide_free"
    | "irrigated"
    | "dried"
    | "fresh_picked"
    | "bulk_ready"
    | "sample_available"
    | "traceable"
    | "weekly_supply"
  >;
  variety?: string;
};

export type SeedFarmerSpec = {
  cooperativeName: string;
  county: string;
  email: string;
  listings: SeedListingSpec[];
  locationLabel: string;
  locationLat: number;
  locationLng: number;
  name: string;
  phoneNumber: string;
};

function withMarker(description: string): string {
  return `${DEMO_INVENTORY_SEED_MARKER}: ${description}`;
}

/**
 * Distribution (50):
 * 5× maize, beans, potatoes, tomatoes, onions, cabbage
 * 4× avocado, bananas, coffee, tea, wheat
 */
export const SEED_FARMERS: SeedFarmerSpec[] = [
  {
    cooperativeName: "Thika Hills Fresh Co-op",
    county: "Kiambu",
    email: "demo-farmer-thika@inventory-seed.vunr.local",
    locationLabel: "Thika, Kiambu",
    locationLat: -1.0396,
    locationLng: 37.09001,
    name: "Demo Farmer Thika",
    phoneNumber: "254711000001",
    listings: [
      {
        crop: "maize",
        county: "Kiambu",
        variety: "DH04 hybrid",
        grade: "Grade 1",
        pricePerKg: 48,
        quantityKg: 2200,
        minOrderKg: 100,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "flint grain",
        tags: ["dried", "sorted", "bulk_ready"],
        certifications: ["kepsa"],
        description: withMarker(
          "Flint-type DH04 hybrid maize dried to 13% moisture, sorted for millers. Gunny bags of 90 kg from Thika foothills. Grade 1 lot ready for immediate collection.",
        ),
        demoSearchPrompt:
          "I need Grade 1 flint maize dried for milling near Thika — DH04 hybrid in gunny bags if possible",
        demoPinterestQuery:
          "dried yellow flint maize corn kernels gunny sack Kenya farm",
      },
      {
        crop: "beans",
        county: "Kiambu",
        variety: "Rosecoco",
        grade: "Grade 1",
        pricePerKg: 145,
        quantityKg: 680,
        minOrderKg: 50,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "This week",
        tags: ["organic", "pesticide_free", "sorted", "traceable"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Organic Rosecoco beans hand-sorted, pesticide-free lot from Kiambu smallholders. Traceable farm batches, 50 kg bags, harvest this week.",
        ),
        demoSearchPrompt:
          "Looking for organic Rosecoco beans from Kiambu that are pesticide-free and sorted",
        demoPinterestQuery:
          "organic Rosecoco beans red speckled dry beans Kenya farm",
      },
      {
        crop: "potatoes",
        county: "Kiambu",
        variety: "Shangi",
        grade: "Grade 1",
        pricePerKg: 42,
        quantityKg: 1400,
        minOrderKg: 80,
        packaging: "crates",
        packUnitKg: 50,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "medium ware 45-65mm",
        tags: ["washed", "sorted", "fresh_picked"],
        description: withMarker(
          "Washed Shangi ware potatoes, medium 45-65mm calibre, fresh-picked in Kiambu. Sorted crates for hotel kitchens and chip lines.",
        ),
        demoSearchPrompt:
          "Need washed medium Shangi potatoes around 45-65mm from Kiambu for hotel kitchens",
        demoPinterestQuery:
          "washed Shangi potatoes medium ware crate Kenya farm harvest",
      },
      {
        crop: "tomatoes",
        county: "Kiambu",
        variety: "Anna F1",
        grade: "Grade 1",
        pricePerKg: 95,
        quantityKg: 420,
        minOrderKg: 30,
        packaging: "crates",
        packUnitKg: 20,
        harvestWindowLabel: "Next 3 days",
        sizeOrCalibre: "65-75mm salad",
        tags: ["organic", "irrigated", "fresh_picked", "cold_chain"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Irrigated organic Anna F1 salad tomatoes, 65-75mm, cold-chain ready from Thika. Firm ripe stage for fresh salads — not processing grade.",
        ),
        demoSearchPrompt:
          "Organic irrigated salad tomatoes Anna F1 near Thika, firm ripe for salads not sauce",
        demoPinterestQuery:
          "ripe red salad tomatoes vine cluster crate Kenya greenhouse",
      },
      {
        crop: "onions",
        county: "Kiambu",
        variety: "Red Creole",
        grade: "Grade 1",
        pricePerKg: 68,
        quantityKg: 900,
        minOrderKg: 40,
        packaging: "bags",
        packUnitKg: 25,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "50-70mm bulbs",
        tags: ["dried", "sorted", "bulk_ready"],
        description: withMarker(
          "Cured Red Creole onions, 50-70mm bulbs, field-dried and sorted. Kiambu lot for wholesale kitchens — strong flavour, low sprout risk.",
        ),
        demoSearchPrompt:
          "Cured Red Creole onions 50-70mm bulbs from Kiambu, dried and sorted for wholesale",
        demoPinterestQuery:
          "cured red onion bulbs dried sorted mesh bag Kenya farm",
      },
      {
        crop: "cabbage",
        county: "Kiambu",
        variety: "Gloria F1",
        grade: "Grade 1",
        pricePerKg: 28,
        quantityKg: 1100,
        minOrderKg: 50,
        packaging: "crates",
        harvestWindowLabel: "This week",
        sizeOrCalibre: "1.5-2.5 kg heads",
        tags: ["fresh_picked", "irrigated", "weekly_supply"],
        description: withMarker(
          "Irrigated Gloria F1 cabbage, compact 1.5-2.5 kg heads, fresh-picked with weekly supply from Thika. Tight wrappers for catering chop.",
        ),
        demoSearchPrompt:
          "Fresh irrigated Gloria cabbage heads about 2kg from Thika with weekly supply",
        demoPinterestQuery:
          "fresh green cabbage heads compact farm harvest Kenya crate",
      },
      {
        crop: "avocado",
        county: "Kiambu",
        variety: "Hass",
        grade: "Export",
        pricePerKg: 185,
        quantityKg: 520,
        minOrderKg: 40,
        packaging: "crates",
        packUnitKg: 4,
        harvestWindowLabel: "Next 5 days",
        sizeOrCalibre: "calibre 18-22",
        tags: ["export_grade", "sorted", "cold_chain", "traceable"],
        certifications: ["globalgap", "kepsa"],
        description: withMarker(
          "GlobalG.A.P. Hass avocado export lot, calibre 18-22, cold-chain packed near Thika. Traceable orchards, firm mature green for export ripening.",
        ),
        demoSearchPrompt:
          "Export-grade Hass avocados calibre 18-22 with GlobalGAP from Kiambu cold chain",
        demoPinterestQuery:
          "Hass avocado green fruit export crate farm Kenya orchard",
      },
      {
        crop: "bananas",
        county: "Kiambu",
        variety: "Apple banana",
        grade: "Grade 1",
        pricePerKg: 62,
        quantityKg: 380,
        minOrderKg: 30,
        packaging: "crates",
        packUnitKg: 18,
        harvestWindowLabel: "This week",
        tags: ["organic", "fresh_picked", "washed", "weekly_supply"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Soft yellow Apple bananas for cooking and matoke — ripened on-farm past green stage. Organic certified Thika hills lot, washed and crate-packed.",
        ),
        demoSearchPrompt:
          "Soft yellow cooking bananas for matoke near Thika this week — organic, not green",
        demoPinterestQuery:
          "ripe yellow apple bananas bunch cooking bananas Kenya farm",
      },
    ],
  },
  {
    cooperativeName: "Ruiru Valley Growers",
    county: "Kiambu",
    email: "demo-farmer-ruiru@inventory-seed.vunr.local",
    locationLabel: "Ruiru, Kiambu",
    locationLat: -1.1467,
    locationLng: 36.9609,
    name: "Demo Farmer Ruiru",
    phoneNumber: "254711000002",
    listings: [
      {
        crop: "maize",
        county: "Kiambu",
        variety: "H614",
        grade: "Grade 2",
        pricePerKg: 40,
        quantityKg: 3500,
        minOrderKg: 200,
        packaging: "bulk",
        harvestWindowLabel: "Ready now",
        tags: ["dried", "bulk_ready", "sample_available"],
        description: withMarker(
          "Bulk H614 dent maize Grade 2 for animal feed and informal millers. Sample available before load-out from Ruiru store.",
        ),
        demoSearchPrompt:
          "Bulk Grade 2 H614 maize for animal feed near Ruiru with sample available",
        demoPinterestQuery:
          "bulk dried dent maize yellow corn grain pile Kenya store",
      },
      {
        crop: "beans",
        county: "Kiambu",
        variety: "Yellow beans",
        grade: "Grade 1",
        pricePerKg: 130,
        quantityKg: 540,
        minOrderKg: 40,
        packaging: "bags",
        packUnitKg: 25,
        harvestWindowLabel: "Ready now",
        tags: ["washed", "sorted", "weekly_supply"],
        description: withMarker(
          "Clean yellow beans, washed and machine-sorted. Ruiru weekly-supply bags for institutional kitchens.",
        ),
        demoSearchPrompt:
          "Washed yellow beans from Ruiru with weekly supply in 25kg bags",
        demoPinterestQuery:
          "yellow dry beans washed sorted bag Kenya farm produce",
      },
      {
        crop: "potatoes",
        county: "Kiambu",
        variety: "Dutch Robijn",
        grade: "Premium",
        pricePerKg: 55,
        quantityKg: 800,
        minOrderKg: 60,
        packaging: "crates",
        packUnitKg: 40,
        harvestWindowLabel: "Next 4 days",
        sizeOrCalibre: "large baking 70mm+",
        tags: ["organic", "washed", "sorted", "cold_chain"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Organic Dutch Robijn baking potatoes, large 70mm+, washed and cold-stored. Premium lot for steakhouse jackets from Ruiru.",
        ),
        demoSearchPrompt:
          "Organic large baking potatoes Dutch Robijn 70mm plus from Ruiru with cold storage",
        demoPinterestQuery:
          "large baking potatoes washed organic red skin Kenya farm",
      },
      {
        crop: "tomatoes",
        county: "Kiambu",
        variety: "Rio Grande",
        grade: "Grade 2",
        pricePerKg: 55,
        quantityKg: 700,
        minOrderKg: 50,
        packaging: "crates",
        packUnitKg: 25,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "processing paste",
        tags: ["bulk_ready", "irrigated", "sorted"],
        description: withMarker(
          "Irrigated Rio Grande processing tomatoes for paste and sauce — Grade 2 bulk crates from Ruiru. High solids, not salad presentation.",
        ),
        demoSearchPrompt:
          "Processing paste tomatoes Rio Grande Grade 2 bulk from Ruiru for sauce",
        demoPinterestQuery:
          "processing paste tomatoes red bulk crate Kenya farm",
      },
      {
        crop: "onions",
        county: "Kiambu",
        variety: "Bombay Red",
        grade: "Grade 1",
        pricePerKg: 72,
        quantityKg: 600,
        minOrderKg: 35,
        packaging: "bags",
        packUnitKg: 20,
        harvestWindowLabel: "This week",
        sizeOrCalibre: "40-55mm",
        tags: ["fresh_picked", "sorted", "pesticide_free"],
        description: withMarker(
          "Pesticide-free Bombay Red onions, smaller 40-55mm bulbs, fresh-picked and sorted for retail packs near Ruiru.",
        ),
        demoSearchPrompt:
          "Pesticide-free Bombay Red onions small 40-55mm bulbs from Ruiru for retail",
        demoPinterestQuery:
          "small red Bombay onions fresh bulbs Kenya farm retail",
      },
      {
        crop: "cabbage",
        county: "Kiambu",
        variety: "Copenhagen Market",
        grade: "Grade 2",
        pricePerKg: 22,
        quantityKg: 1600,
        minOrderKg: 80,
        packaging: "bulk",
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "1-1.5 kg heads",
        tags: ["bulk_ready", "fresh_picked"],
        description: withMarker(
          "Bulk Copenhagen Market cabbage, smaller 1-1.5 kg heads for school feeding and wholesale chop. Ruiru load-out ready.",
        ),
        demoSearchPrompt:
          "Bulk cheaper cabbage smaller heads from Ruiru for school feeding programs",
        demoPinterestQuery:
          "small green cabbage heads bulk wholesale Kenya farm",
      },
      {
        crop: "bananas",
        county: "Kiambu",
        variety: "Cavendish",
        grade: "Grade 1",
        pricePerKg: 58,
        quantityKg: 450,
        minOrderKg: 25,
        packaging: "crates",
        packUnitKg: 16,
        harvestWindowLabel: "Next 5 days",
        tags: ["organic", "pesticide_free", "fresh_picked"],
        certifications: ["organic_certified", "kepsa"],
        description: withMarker(
          "Creamy Cavendish dessert bananas for fruit bowls — soft peel, low starch, hotel ripeness. Organic Ruiru orchards with KEPSA paperwork.",
        ),
        demoSearchPrompt:
          "Organic Cavendish dessert bananas for hotel fruit bowls near Ruiru — soft peel",
        demoPinterestQuery:
          "ripe yellow Cavendish bananas dessert bunch Kenya farm",
      },
      {
        crop: "coffee",
        county: "Kiambu",
        variety: "SL28",
        grade: "AA",
        pricePerKg: 620,
        quantityKg: 180,
        minOrderKg: 20,
        packaging: "bags",
        packUnitKg: 60,
        harvestWindowLabel: "Ready now",
        tags: ["washed", "export_grade", "traceable", "dried"],
        certifications: ["kepsa", "fairtrade"],
        description: withMarker(
          "Washed SL28 AA coffee parchment from Ruiru hills — Fairtrade export lot, fully traceable to factory day lots. Dried to export moisture.",
        ),
        demoSearchPrompt:
          "Washed SL28 AA coffee from Ruiru Fairtrade export grade with traceability",
        demoPinterestQuery:
          "washed coffee parchment beans AA green coffee Kenya farm",
      },
    ],
  },
  {
    cooperativeName: "Gatundu Organic Alliance",
    county: "Kiambu",
    email: "demo-farmer-gatundu@inventory-seed.vunr.local",
    locationLabel: "Gatundu, Kiambu",
    locationLat: -0.9123,
    locationLng: 36.9084,
    name: "Demo Farmer Gatundu",
    phoneNumber: "254711000003",
    listings: [
      {
        crop: "maize",
        county: "Kiambu",
        variety: "SC Duma 43",
        grade: "Grade 1",
        pricePerKg: 52,
        quantityKg: 1100,
        minOrderKg: 80,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "This week",
        tags: ["organic", "dried", "sorted", "traceable"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Certified organic SC Duma 43 white maize, kiln-dried and hand-sorted. Gatundu Alliance traceable bags for health-conscious millers.",
        ),
        demoSearchPrompt:
          "Organic certified white maize SC Duma from Gatundu dried and sorted",
        demoPinterestQuery:
          "organic white maize dried kernels bag Kenya highland farm",
      },
      {
        crop: "beans",
        county: "Kiambu",
        variety: "Wairimu",
        grade: "Grade 1",
        pricePerKg: 160,
        quantityKg: 320,
        minOrderKg: 25,
        packaging: "bags",
        packUnitKg: 25,
        harvestWindowLabel: "Ready now",
        tags: ["organic", "export_grade", "sorted", "sample_available"],
        certifications: ["organic_certified", "kepsa"],
        description: withMarker(
          "Export-grade organic Wairimu beans, tightly sorted colour and size. Sample bags available from Gatundu before export booking.",
        ),
        demoSearchPrompt:
          "Export grade organic Wairimu beans from Gatundu with sample available",
        demoPinterestQuery:
          "organic Wairimu beans red kidney dry beans Kenya sorted",
      },
      {
        crop: "potatoes",
        county: "Kiambu",
        variety: "Kenya Mpya",
        grade: "Grade 1",
        pricePerKg: 38,
        quantityKg: 950,
        minOrderKg: 70,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "seed 28-35mm",
        tags: ["sorted", "traceable", "irrigated"],
        description: withMarker(
          "Irrigated Kenya Mpya certified seed potatoes, 28-35mm, sorted and lot-traced for next-season planting from Gatundu.",
        ),
        demoSearchPrompt:
          "Certified seed potatoes Kenya Mpya 28-35mm irrigated from Gatundu for planting",
        demoPinterestQuery:
          "seed potatoes small tubers sorted bag Kenya farm planting",
      },
      {
        crop: "tomatoes",
        county: "Kiambu",
        variety: "Money Maker",
        grade: "Grade 1",
        pricePerKg: 88,
        quantityKg: 360,
        minOrderKg: 25,
        packaging: "crates",
        packUnitKg: 18,
        harvestWindowLabel: "This week",
        tags: ["organic", "pesticide_free", "fresh_picked", "weekly_supply"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Pesticide-free organic Money Maker tomatoes, vine-ripened for open markets. Gatundu weekly supply crates.",
        ),
        demoSearchPrompt:
          "Organic pesticide-free Money Maker tomatoes vine ripe from Gatundu weekly",
        demoPinterestQuery:
          "vine ripe red Money Maker tomatoes fresh Kenya market crate",
      },
      {
        crop: "onions",
        county: "Kiambu",
        variety: "Texas Grano",
        grade: "Premium",
        pricePerKg: 85,
        quantityKg: 400,
        minOrderKg: 30,
        packaging: "bags",
        packUnitKg: 20,
        harvestWindowLabel: "Next 3 days",
        sizeOrCalibre: "70mm+ jumbo",
        tags: ["organic", "irrigated", "sorted", "cold_chain"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Organic irrigated Texas Grano jumbo onions 70mm+, cold-stored after curing. Premium catering bulbs from Gatundu.",
        ),
        demoSearchPrompt:
          "Organic jumbo Texas Grano onions 70mm plus irrigated from Gatundu for catering",
        demoPinterestQuery:
          "jumbo yellow onions large bulbs organic Kenya farm",
      },
      {
        crop: "cabbage",
        county: "Kiambu",
        variety: "Kikuyu Hybrid",
        grade: "Grade 1",
        pricePerKg: 32,
        quantityKg: 750,
        minOrderKg: 40,
        packaging: "crates",
        harvestWindowLabel: "This week",
        sizeOrCalibre: "2.5-3.5 kg heads",
        tags: ["organic", "irrigated", "fresh_picked", "traceable"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Large organic Kikuyu Hybrid cabbage heads 2.5-3.5 kg, irrigated and fresh-picked. Traceable Gatundu plots for high-volume chop.",
        ),
        demoSearchPrompt:
          "Large organic cabbage heads over 2.5kg irrigated from Gatundu",
        demoPinterestQuery:
          "large green cabbage heads heavy farm Kenya organic harvest",
      },
      {
        crop: "avocado",
        county: "Kiambu",
        variety: "Fuerte",
        grade: "Grade 1",
        pricePerKg: 140,
        quantityKg: 280,
        minOrderKg: 30,
        packaging: "crates",
        packUnitKg: 4,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "calibre 14-16",
        tags: ["organic", "fresh_picked", "sorted"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Organic Fuerte avocados calibre 14-16 for local wholesale — creamy flesh, not export Hass sizing. Gatundu orchards.",
        ),
        demoSearchPrompt:
          "Organic Fuerte avocados calibre 14-16 for local wholesale from Gatundu",
        demoPinterestQuery:
          "Fuerte avocado pear shaped green fruit Kenya farm crate",
      },
      {
        crop: "tea",
        county: "Kiambu",
        variety: "TRFK 6/8",
        grade: "BP1",
        pricePerKg: 280,
        quantityKg: 400,
        minOrderKg: 50,
        packaging: "bags",
        packUnitKg: 40,
        harvestWindowLabel: "Ready now",
        tags: ["organic", "dried", "sorted", "weekly_supply"],
        certifications: ["organic_certified", "fairtrade"],
        description: withMarker(
          "Organic Fairtrade CTC BP1 tea from Gatundu factories — weekly leaf supply, dried and graded for packers.",
        ),
        demoSearchPrompt:
          "Organic Fairtrade CTC BP1 tea from Gatundu with weekly leaf supply",
        demoPinterestQuery:
          "black CTC tea leaves dried graded bag Kenya tea factory",
      },
      {
        crop: "wheat",
        county: "Kiambu",
        variety: "Kwale",
        grade: "Grade 1",
        pricePerKg: 58,
        quantityKg: 900,
        minOrderKg: 100,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "sorted", "bulk_ready"],
        description: withMarker(
          "Highland Kwale soft wheat Grade 1, dried and cleaned for artisan bakers near Gatundu. Gunny 90 kg bags.",
        ),
        demoSearchPrompt:
          "Soft wheat Kwale Grade 1 for artisan bakers near Gatundu in gunny bags",
        demoPinterestQuery:
          "soft wheat grain dried cleaned gunny bag Kenya highland",
      },
    ],
  },
  {
    cooperativeName: "Nakuru Highlands Collective",
    county: "Nakuru",
    email: "demo-farmer-nakuru@inventory-seed.vunr.local",
    locationLabel: "Njoro, Nakuru",
    locationLat: -0.3333,
    locationLng: 35.9333,
    name: "Demo Farmer Nakuru",
    phoneNumber: "254711000004",
    listings: [
      {
        crop: "maize",
        county: "Nakuru",
        variety: "WH505",
        grade: "Grade 1",
        pricePerKg: 46,
        quantityKg: 5000,
        minOrderKg: 250,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "bulk_ready", "sorted", "weekly_supply"],
        certifications: ["kepsa"],
        description: withMarker(
          "Large WH505 white maize Grade 1 from Njoro — bulk weekly offtake for flour millers. Sorted and dried to miller specs.",
        ),
        demoSearchPrompt:
          "Large volume Grade 1 white maize WH505 from Nakuru for flour millers weekly",
        demoPinterestQuery:
          "white maize Grade 1 dried corn kernels sack Nakuru Kenya",
      },
      {
        crop: "beans",
        county: "Nakuru",
        variety: "Mwitemania",
        grade: "Grade 2",
        pricePerKg: 110,
        quantityKg: 1200,
        minOrderKg: 80,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "bulk_ready", "sorted"],
        description: withMarker(
          "Mwitemania beans Grade 2 bulk from Nakuru — economical institutional supply, dried and bagged.",
        ),
        demoSearchPrompt:
          "Cheap Grade 2 Mwitemania beans bulk from Nakuru for institutions",
        demoPinterestQuery:
          "Mwitemania beans speckled dry beans bulk bag Kenya farm",
      },
      {
        crop: "potatoes",
        county: "Nakuru",
        variety: "Shangi",
        grade: "Grade 1",
        pricePerKg: 35,
        quantityKg: 3200,
        minOrderKg: 150,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "ware mixed 35-55mm",
        tags: ["bulk_ready", "washed", "weekly_supply"],
        description: withMarker(
          "High-volume Shangi ware potatoes from Njoro — mixed 35-55mm, washed bags, weekly offtake for distributors.",
        ),
        demoSearchPrompt:
          "High volume washed Shangi ware potatoes from Nakuru weekly for distributors",
        demoPinterestQuery:
          "washed Shangi ware potatoes bulk bags Kenya highland farm",
      },
      {
        crop: "tomatoes",
        county: "Nakuru",
        variety: "Cal J",
        grade: "Grade 1",
        pricePerKg: 70,
        quantityKg: 550,
        minOrderKg: 40,
        packaging: "crates",
        packUnitKg: 22,
        harvestWindowLabel: "This week",
        tags: ["irrigated", "sorted", "cold_chain", "export_grade"],
        certifications: ["kepsa"],
        description: withMarker(
          "Irrigated Cal J tomatoes export-leaning Grade 1, cold-chain crates from Nakuru. Firm fruit for long haul to Nairobi.",
        ),
        demoSearchPrompt:
          "Export leaning Cal J tomatoes cold chain irrigated from Nakuru Grade 1",
        demoPinterestQuery:
          "firm red Cal J tomatoes export crate cold chain Kenya",
      },
      {
        crop: "onions",
        county: "Nakuru",
        variety: "Red Creole",
        grade: "Grade 1",
        pricePerKg: 55,
        quantityKg: 1800,
        minOrderKg: 100,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "mixed 45-65mm",
        tags: ["dried", "bulk_ready", "sorted", "weekly_supply"],
        description: withMarker(
          "Nakuru Red Creole onion bulk — cured mixed sizes, weekly trucks for Nairobi wholesalers.",
        ),
        demoSearchPrompt:
          "Bulk cured Red Creole onions from Nakuru weekly trucks for Nairobi wholesale",
        demoPinterestQuery:
          "bulk cured red onions mesh bags wholesale Kenya farm",
      },
      {
        crop: "cabbage",
        county: "Nakuru",
        variety: "Gloria F1",
        grade: "Grade 1",
        pricePerKg: 24,
        quantityKg: 2000,
        minOrderKg: 100,
        packaging: "bulk",
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "1.8-2.8 kg heads",
        tags: ["irrigated", "bulk_ready", "fresh_picked"],
        description: withMarker(
          "Irrigated Gloria cabbage bulk from Nakuru highlands — firm heads for wholesale markets and processors.",
        ),
        demoSearchPrompt:
          "Bulk irrigated Gloria cabbage from Nakuru highlands for wholesale markets",
        demoPinterestQuery:
          "green Gloria cabbage heads bulk highland Kenya farm harvest",
      },
      {
        crop: "wheat",
        county: "Nakuru",
        variety: "Kenya Wren",
        grade: "Grade 1",
        pricePerKg: 52,
        quantityKg: 2800,
        minOrderKg: 200,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "sorted", "bulk_ready", "traceable"],
        certifications: ["kepsa"],
        description: withMarker(
          "Kenya Wren hard wheat Grade 1 from Njoro — miller-spec moisture, lot-traced bags for commercial bakeries.",
        ),
        demoSearchPrompt:
          "Hard wheat Kenya Wren Grade 1 from Nakuru for commercial bakeries in gunny bags",
        demoPinterestQuery:
          "hard wheat grain Kenya Wren dried gunny bags miller farm",
      },
      {
        crop: "coffee",
        county: "Nakuru",
        variety: "Ruiru 11",
        grade: "AB",
        pricePerKg: 480,
        quantityKg: 220,
        minOrderKg: 30,
        packaging: "bags",
        packUnitKg: 60,
        harvestWindowLabel: "Ready now",
        tags: ["washed", "dried", "sorted", "sample_available"],
        description: withMarker(
          "Washed Ruiru 11 AB coffee from Nakuru — cupping samples available. Clean dried parchment for local roasters.",
        ),
        demoSearchPrompt:
          "Washed Ruiru 11 AB coffee from Nakuru with cupping samples for local roasters",
        demoPinterestQuery:
          "washed coffee beans parchment AB green coffee Kenya farm",
      },
      {
        crop: "tea",
        county: "Nakuru",
        variety: "TRFK 6/8",
        grade: "Dust",
        pricePerKg: 190,
        quantityKg: 500,
        minOrderKg: 60,
        packaging: "bags",
        packUnitKg: 40,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "bulk_ready", "sorted", "weekly_supply"],
        description: withMarker(
          "CTC Dust grade tea from Nakuru factories — bulk weekly offtake for blending and tea bags.",
        ),
        demoSearchPrompt:
          "CTC Dust grade tea bulk from Nakuru factories for blending and tea bags",
        demoPinterestQuery:
          "CTC dust tea powder black tea bag Kenya factory bulk",
      },
    ],
  },
  {
    cooperativeName: "Meru Plateau Farmers",
    county: "Meru",
    email: "demo-farmer-meru@inventory-seed.vunr.local",
    locationLabel: "Chuka, Meru",
    locationLat: -0.3332,
    locationLng: 37.6459,
    name: "Demo Farmer Meru",
    phoneNumber: "254711000005",
    listings: [
      {
        crop: "maize",
        county: "Meru",
        variety: "Panner 4M19",
        grade: "Grade 1",
        pricePerKg: 50,
        quantityKg: 1600,
        minOrderKg: 100,
        packaging: "bags",
        packUnitKg: 50,
        harvestWindowLabel: "This week",
        tags: ["dried", "sorted", "irrigated"],
        description: withMarker(
          "Irrigated Panner hybrid maize Grade 1 from Meru — bright yellow grain for posho mills.",
        ),
        demoSearchPrompt:
          "Irrigated yellow Panner hybrid maize Grade 1 from Meru for posho mills",
        demoPinterestQuery:
          "bright yellow maize hybrid dried grain bag Meru Kenya farm",
      },
      {
        crop: "beans",
        county: "Meru",
        variety: "Canadian Wonder",
        grade: "Grade 1",
        pricePerKg: 150,
        quantityKg: 480,
        minOrderKg: 40,
        packaging: "bags",
        packUnitKg: 25,
        harvestWindowLabel: "Ready now",
        tags: ["organic", "washed", "sorted", "traceable"],
        certifications: ["organic_certified"],
        description: withMarker(
          "Organic Canadian Wonder beans from Meru slopes — washed, colour-sorted, farm-traceable lots.",
        ),
        demoSearchPrompt:
          "Organic Canadian Wonder beans washed and sorted from Meru slopes",
        demoPinterestQuery:
          "organic Canadian Wonder beans red dry beans Kenya sorted",
      },
      {
        crop: "potatoes",
        county: "Meru",
        variety: "Asante",
        grade: "Grade 1",
        pricePerKg: 40,
        quantityKg: 1100,
        minOrderKg: 60,
        packaging: "crates",
        packUnitKg: 45,
        harvestWindowLabel: "Next 4 days",
        sizeOrCalibre: "chip size 50-60mm",
        tags: ["washed", "sorted", "cold_chain"],
        description: withMarker(
          "Asante potatoes sized 50-60mm for French fries — washed, sorted, cold-held crates from Meru.",
        ),
        demoSearchPrompt:
          "Asante chip potatoes 50-60mm washed cold chain from Meru for French fries",
        demoPinterestQuery:
          "Asante chip potatoes washed sorted crate Kenya farm fries",
      },
      {
        crop: "tomatoes",
        county: "Meru",
        variety: "Assila F1",
        grade: "Premium",
        pricePerKg: 110,
        quantityKg: 300,
        minOrderKg: 20,
        packaging: "crates",
        packUnitKg: 15,
        harvestWindowLabel: "This week",
        sizeOrCalibre: "cluster 70mm+",
        tags: ["organic", "irrigated", "fresh_picked", "cold_chain"],
        certifications: ["organic_certified", "globalgap"],
        description: withMarker(
          "Premium Assila F1 cluster tomatoes 70mm+, GlobalG.A.P. organic irrigated greenhouses near Chuka. Cold-chain for boutique hotels.",
        ),
        demoSearchPrompt:
          "Premium Assila cluster tomatoes GlobalGAP organic greenhouse from Meru",
        demoPinterestQuery:
          "premium cluster tomatoes red greenhouse Kenya organic crate",
      },
      {
        crop: "onions",
        county: "Meru",
        variety: "Red Passion",
        grade: "Grade 1",
        pricePerKg: 75,
        quantityKg: 520,
        minOrderKg: 35,
        packaging: "bags",
        packUnitKg: 25,
        harvestWindowLabel: "This week",
        tags: ["fresh_picked", "sorted", "irrigated", "weekly_supply"],
        description: withMarker(
          "Irrigated Red Passion onions from Meru — fresh-picked weekly for Nairobi green grocers.",
        ),
        demoSearchPrompt:
          "Fresh irrigated Red Passion onions from Meru weekly for Nairobi greengrocers",
        demoPinterestQuery:
          "fresh red onions irrigated bulbs bag Meru Kenya farm",
      },
      {
        crop: "cabbage",
        county: "Meru",
        variety: "Pruktor F1",
        grade: "Grade 1",
        pricePerKg: 30,
        quantityKg: 850,
        minOrderKg: 45,
        packaging: "crates",
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "2-3 kg heads",
        tags: ["pesticide_free", "irrigated", "fresh_picked"],
        description: withMarker(
          "Pesticide-free Pruktor cabbage, 2-3 kg heads, irrigated Meru plots. Fresh crates for health-focused buyers.",
        ),
        demoSearchPrompt:
          "Pesticide-free Pruktor cabbage 2-3kg heads irrigated from Meru",
        demoPinterestQuery:
          "fresh green cabbage large heads pesticide free Kenya farm",
      },
      {
        crop: "avocado",
        county: "Meru",
        variety: "Hass",
        grade: "Grade 1",
        pricePerKg: 160,
        quantityKg: 340,
        minOrderKg: 35,
        packaging: "crates",
        packUnitKg: 4,
        harvestWindowLabel: "This week",
        sizeOrCalibre: "calibre 20-24",
        tags: ["export_grade", "sorted", "traceable", "cold_chain"],
        certifications: ["globalgap"],
        description: withMarker(
          "Meru Hass avocado calibre 20-24 export pack — GlobalG.A.P., cold-chain, orchard-traceable.",
        ),
        demoSearchPrompt:
          "Meru Hass avocados calibre 20-24 export pack GlobalGAP cold chain",
        demoPinterestQuery:
          "Hass avocado export calibre green fruit crate Meru Kenya",
      },
      {
        crop: "bananas",
        county: "Meru",
        variety: "Plantain",
        grade: "Grade 1",
        pricePerKg: 45,
        quantityKg: 600,
        minOrderKg: 40,
        packaging: "crates",
        packUnitKg: 20,
        harvestWindowLabel: "Ready now",
        tags: ["fresh_picked", "sorted", "bulk_ready"],
        description: withMarker(
          "Green cooking plantains from Meru — starch-heavy for roasting and chips, not dessert bananas.",
        ),
        demoSearchPrompt:
          "Green cooking plantains from Meru for roasting and chips not dessert",
        demoPinterestQuery:
          "green cooking plantains bunch starch bananas Kenya farm",
      },
      {
        crop: "tea",
        county: "Meru",
        variety: "Purple tea",
        grade: "Orthodox",
        pricePerKg: 420,
        quantityKg: 150,
        minOrderKg: 20,
        packaging: "bags",
        packUnitKg: 20,
        harvestWindowLabel: "Ready now",
        tags: ["organic", "dried", "export_grade", "sample_available"],
        certifications: ["organic_certified", "kepsa"],
        description: withMarker(
          "Organic purple tea Orthodox grade from Meru plateau — specialty export leaf, samples for buyers.",
        ),
        demoSearchPrompt:
          "Organic purple tea Orthodox specialty export from Meru with samples",
        demoPinterestQuery:
          "purple tea leaves orthodox specialty Kenya farm dried",
      },
      {
        crop: "coffee",
        county: "Meru",
        variety: "Batian",
        grade: "AA",
        pricePerKg: 700,
        quantityKg: 140,
        minOrderKg: 15,
        packaging: "bags",
        packUnitKg: 60,
        harvestWindowLabel: "Ready now",
        tags: ["washed", "export_grade", "organic", "traceable"],
        certifications: ["organic_certified", "fairtrade", "kepsa"],
        description: withMarker(
          "Organic Fairtrade Batian AA washed coffee from Meru — microlot export with full farm traceability.",
        ),
        demoSearchPrompt:
          "Organic Fairtrade Batian AA washed coffee microlot from Meru",
        demoPinterestQuery:
          "organic washed coffee beans AA green coffee Meru Kenya",
      },
    ],
  },
  {
    cooperativeName: "Machakos Dryland Co-op",
    county: "Machakos",
    email: "demo-farmer-machakos@inventory-seed.vunr.local",
    locationLabel: "Wamunyu, Machakos",
    locationLat: -1.5167,
    locationLng: 37.4667,
    name: "Demo Farmer Machakos",
    phoneNumber: "254711000006",
    listings: [
      {
        crop: "avocado",
        county: "Machakos",
        variety: "Hass",
        grade: "Grade 2",
        pricePerKg: 95,
        quantityKg: 200,
        minOrderKg: 25,
        packaging: "crates",
        packUnitKg: 4,
        harvestWindowLabel: "Ready now",
        sizeOrCalibre: "calibre 26-30",
        tags: ["sorted", "fresh_picked"],
        description: withMarker(
          "Local-market Hass avocado calibre 26-30 from Machakos — Grade 2, larger fruit for Nairobi stalls.",
        ),
        demoSearchPrompt:
          "Local market Hass avocados larger calibre 26-30 Grade 2 from Machakos",
        demoPinterestQuery:
          "large Hass avocado ripe green fruit local market Kenya",
      },
      {
        crop: "bananas",
        county: "Machakos",
        variety: "Grand Nain",
        grade: "Grade 1",
        pricePerKg: 50,
        quantityKg: 320,
        minOrderKg: 30,
        packaging: "crates",
        packUnitKg: 18,
        harvestWindowLabel: "This week",
        tags: ["fresh_picked", "sorted", "weekly_supply"],
        description: withMarker(
          "Grand Nain dessert bananas from Machakos irrigation — weekly crate supply for retailers.",
        ),
        demoSearchPrompt:
          "Grand Nain dessert bananas weekly crates from Machakos irrigation",
        demoPinterestQuery:
          "yellow Grand Nain dessert bananas bunch Kenya irrigation",
      },
      {
        crop: "coffee",
        county: "Machakos",
        variety: "SL34",
        grade: "PB",
        pricePerKg: 390,
        quantityKg: 100,
        minOrderKg: 15,
        packaging: "bags",
        packUnitKg: 60,
        harvestWindowLabel: "Ready now",
        tags: ["washed", "dried", "sorted"],
        description: withMarker(
          "Washed SL34 peaberry coffee from Machakos — small PB lot for specialty local roasting.",
        ),
        demoSearchPrompt:
          "Washed SL34 peaberry coffee PB grade from Machakos for specialty roasting",
        demoPinterestQuery:
          "peaberry coffee beans washed green coffee Kenya specialty",
      },
      {
        crop: "tea",
        county: "Machakos",
        variety: "TRFK 31/8",
        grade: "PF1",
        pricePerKg: 210,
        quantityKg: 350,
        minOrderKg: 40,
        packaging: "bags",
        packUnitKg: 40,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "sorted", "bulk_ready"],
        description: withMarker(
          "CTC PF1 tea from Machakos factories — bulk packer grade, dried and sorted.",
        ),
        demoSearchPrompt:
          "CTC PF1 bulk packer tea from Machakos factories dried and sorted",
        demoPinterestQuery:
          "CTC PF1 black tea leaves dried graded Kenya factory bag",
      },
      {
        crop: "wheat",
        county: "Machakos",
        variety: "Kenya Hawk",
        grade: "Grade 2",
        pricePerKg: 45,
        quantityKg: 1100,
        minOrderKg: 150,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "Ready now",
        tags: ["dried", "bulk_ready"],
        description: withMarker(
          "Kenya Hawk wheat Grade 2 from Machakos — feed and blending grade gunny bags.",
        ),
        demoSearchPrompt:
          "Grade 2 Kenya Hawk wheat from Machakos for feed blending gunny bags",
        demoPinterestQuery:
          "wheat grain Grade 2 dried gunny bags Kenya dryland farm",
      },
      {
        crop: "wheat",
        county: "Machakos",
        variety: "Robin",
        grade: "Grade 1",
        pricePerKg: 54,
        quantityKg: 800,
        minOrderKg: 100,
        packaging: "gunny_bags",
        packUnitKg: 90,
        harvestWindowLabel: "This week",
        tags: ["dried", "sorted", "sample_available"],
        description: withMarker(
          "Robin soft wheat Grade 1 from Machakos — milling sample available before offtake.",
        ),
        demoSearchPrompt:
          "Robin soft wheat Grade 1 from Machakos with milling sample available",
        demoPinterestQuery:
          "soft wheat Robin grain dried cleaned sack Kenya farm",
      },
    ],
  },
];
