import { InventoryStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: "GROCERIES",   label: "Groceries"   },
  { name: "RESTAURANTS", label: "Restaurants" },
  { name: "FASHION",     label: "Fashion"     },
  { name: "ELECTRONICS", label: "Electronics" },
  { name: "HOME",        label: "Home"        },
  { name: "HEALTH",      label: "Health"      },
  { name: "SERVICES",    label: "Services"    }
];

async function main() {
  // 1. Upsert system categories
  await Promise.all(
    SYSTEM_CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where:  { name: cat.name },
        create: { ...cat, isSystem: true },
        update: { label: cat.label, isSystem: true }
      })
    )
  );

  // Build name → id lookup
  const allCategories = await prisma.category.findMany();
  const catId = Object.fromEntries(allCategories.map((c) => [c.name, c.id]));

  // 2. Clear existing data (order matters for FK constraints)
  await prisma.listing.deleteMany();
  await prisma.merchant.deleteMany();

  // 3. Create merchants
  const [kimironko, nyamirambo, kacyiru] = await Promise.all([
    prisma.merchant.create({
      data: {
        businessName: "Kimironko Fresh Hub",
        ownerName:    "Aline Uwimana",
        phone:        "+250788000111",
        whatsapp:     "+250788000111",
        neighborhood: "Kimironko",
        district:     "Gasabo",
        latitude:     -1.9499,
        longitude:    30.1256,
        verified:     true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Nyamirambo Home Select",
        ownerName:    "Eric Nshimiyimana",
        phone:        "+250788000222",
        whatsapp:     "+250788000222",
        neighborhood: "Nyamirambo",
        district:     "Nyarugenge",
        latitude:     -1.9706,
        longitude:    30.0396,
        verified:     true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Kacyiru Tech Corner",
        ownerName:    "Grace Mukamana",
        phone:        "+250788000333",
        whatsapp:     "+250788000333",
        neighborhood: "Kacyiru",
        district:     "Gasabo",
        latitude:     -1.9441,
        longitude:    30.0929,
        verified:     false
      }
    })
  ]);

  // 4. Create listings
  await prisma.listing.createMany({
    data: [
      {
        title:           "Fresh Tomatoes Basket",
        description:     "Same-morning tomatoes sourced from nearby farms and ready for pickup.",
        categoryId:      catId["GROCERIES"],
        priceRwf:        3500,
        unitLabel:       "basket",
        inventoryStatus: InventoryStatus.IN_STOCK,
        isFeatured:      true,
        freshnessNote:   "Updated 18 minutes ago",
        tags:            ["fresh", "market-day", "family-size"],
        merchantId:      kimironko.id
      },
      {
        title:           "Avocado Pair Pack",
        description:     "Ripe Hass avocados, ideal for breakfast or juice.",
        categoryId:      catId["GROCERIES"],
        priceRwf:        1800,
        unitLabel:       "2 pieces",
        inventoryStatus: InventoryStatus.LOW_STOCK,
        freshnessNote:   "Only 6 packs left",
        tags:            ["healthy", "quick-buy"],
        merchantId:      kimironko.id
      },
      {
        title:           "Tailored Curtains",
        description:     "Custom measurement curtains with delivery in Kigali.",
        categoryId:      catId["HOME"],
        priceRwf:        45000,
        unitLabel:       "set",
        inventoryStatus: InventoryStatus.MADE_TO_ORDER,
        tags:            ["interior", "custom"],
        merchantId:      nyamirambo.id
      },
      {
        title:           "Bluetooth Speaker",
        description:     "Portable speaker with strong battery life and clear sound.",
        categoryId:      catId["ELECTRONICS"],
        priceRwf:        38000,
        unitLabel:       "piece",
        inventoryStatus: InventoryStatus.IN_STOCK,
        isFeatured:      true,
        tags:            ["audio", "portable"],
        merchantId:      kacyiru.id
      },
      {
        title:           "Hair Braiding Appointment",
        description:     "Fast neighborhood braiding service with WhatsApp booking.",
        categoryId:      catId["SERVICES"],
        priceRwf:        12000,
        unitLabel:       "session",
        inventoryStatus: InventoryStatus.IN_STOCK,
        tags:            ["beauty", "same-day"],
        merchantId:      nyamirambo.id
      }
    ]
  });

  console.log("Seed complete: 7 categories, 3 merchants, 5 listings.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
