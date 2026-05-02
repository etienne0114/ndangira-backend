import { PrismaClient, InventoryStatus, ListingCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany();
  await prisma.merchant.deleteMany();

  const merchants = await Promise.all([
    prisma.merchant.create({
      data: {
        businessName: "Kimironko Fresh Hub",
        ownerName: "Aline Uwimana",
        phone: "+250788000111",
        whatsapp: "+250788000111",
        neighborhood: "Kimironko",
        district: "Gasabo",
        latitude: -1.9499,
        longitude: 30.1256,
        verified: true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Nyamirambo Home Select",
        ownerName: "Eric Nshimiyimana",
        phone: "+250788000222",
        whatsapp: "+250788000222",
        neighborhood: "Nyamirambo",
        district: "Nyarugenge",
        latitude: -1.9706,
        longitude: 30.0396,
        verified: true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Kacyiru Tech Corner",
        ownerName: "Grace Mukamana",
        phone: "+250788000333",
        whatsapp: "+250788000333",
        neighborhood: "Kacyiru",
        district: "Gasabo",
        latitude: -1.9441,
        longitude: 30.0929,
        verified: false
      }
    })
  ]);

  await prisma.listing.createMany({
    data: [
      {
        title: "Fresh Tomatoes Basket",
        description: "Same-morning tomatoes sourced from nearby farms and ready for pickup.",
        category: ListingCategory.GROCERIES,
        priceRwf: 3500,
        unitLabel: "basket",
        inventoryStatus: InventoryStatus.IN_STOCK,
        isFeatured: true,
        freshnessNote: "Updated 18 minutes ago",
        tags: ["fresh", "market-day", "family-size"],
        merchantId: merchants[0].id
      },
      {
        title: "Avocado Pair Pack",
        description: "Ripe Hass avocados, ideal for breakfast or juice.",
        category: ListingCategory.GROCERIES,
        priceRwf: 1800,
        unitLabel: "2 pieces",
        inventoryStatus: InventoryStatus.LOW_STOCK,
        freshnessNote: "Only 6 packs left",
        tags: ["healthy", "quick-buy"],
        merchantId: merchants[0].id
      },
      {
        title: "Tailored Curtains",
        description: "Custom measurement curtains with delivery in Kigali.",
        category: ListingCategory.HOME,
        priceRwf: 45000,
        unitLabel: "set",
        inventoryStatus: InventoryStatus.MADE_TO_ORDER,
        tags: ["interior", "custom"],
        merchantId: merchants[1].id
      },
      {
        title: "Bluetooth Speaker",
        description: "Portable speaker with strong battery life and clear sound.",
        category: ListingCategory.ELECTRONICS,
        priceRwf: 38000,
        unitLabel: "piece",
        inventoryStatus: InventoryStatus.IN_STOCK,
        isFeatured: true,
        tags: ["audio", "portable"],
        merchantId: merchants[2].id
      },
      {
        title: "Hair Braiding Appointment",
        description: "Fast neighborhood braiding service with WhatsApp booking.",
        category: ListingCategory.SERVICES,
        priceRwf: 12000,
        unitLabel: "session",
        inventoryStatus: InventoryStatus.IN_STOCK,
        tags: ["beauty", "same-day"],
        merchantId: merchants[1].id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
