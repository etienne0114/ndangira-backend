import { PrismaClient, InventoryStatus, ListingCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany();
  await prisma.merchant.deleteMany();
  const passwordHash = await bcrypt.hash("merchant123", 10);

  const merchants = await Promise.all([
    prisma.merchant.create({
      data: {
        businessName: "Kimironko Fresh Hub",
        ownerName: "Aline Uwimana",
        email: "aline@kimironkofresh.rw",
        passwordHash,
        phone: "+250788000111",
        whatsapp: "+250788000111",
        businessType: ListingCategory.GROCERIES,
        neighborhood: "Kimironko",
        district: "Gasabo",
        description: "Fast-moving fresh produce and everyday grocery staples.",
        latitude: -1.9499,
        longitude: 30.1256,
        serviceRadiusKm: 4,
        verified: true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Nyamirambo Home Select",
        ownerName: "Eric Nshimiyimana",
        email: "eric@home-select.rw",
        passwordHash,
        phone: "+250788000222",
        whatsapp: "+250788000222",
        businessType: ListingCategory.HOME,
        neighborhood: "Nyamirambo",
        district: "Nyarugenge",
        description: "Household supplies, curtains, and same-day local services.",
        latitude: -1.9706,
        longitude: 30.0396,
        serviceRadiusKm: 8,
        verified: true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Kacyiru Tech Corner",
        ownerName: "Grace Mukamana",
        email: "grace@techcorner.rw",
        passwordHash,
        phone: "+250788000333",
        whatsapp: "+250788000333",
        businessType: ListingCategory.ELECTRONICS,
        neighborhood: "Kacyiru",
        district: "Gasabo",
        description: "Electronics, accessories, and quick gadget recommendations.",
        latitude: -1.9441,
        longitude: 30.0929,
        serviceRadiusKm: 6,
        verified: false
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Remera Care Pharmacy",
        ownerName: "Didier Habimana",
        email: "didier@remeracare.rw",
        passwordHash,
        phone: "+250788000444",
        whatsapp: "+250788000444",
        businessType: ListingCategory.PHARMACY,
        neighborhood: "Remera",
        district: "Gasabo",
        description: "Nearby pharmacy with essential medicine and health products.",
        latitude: -1.9552,
        longitude: 30.1047,
        serviceRadiusKm: 5,
        verified: true
      }
    }),
    prisma.merchant.create({
      data: {
        businessName: "Kicukiro Homes Desk",
        ownerName: "Clarisse Umutoni",
        email: "clarisse@homesdesk.rw",
        passwordHash,
        phone: "+250788000555",
        whatsapp: "+250788000555",
        businessType: ListingCategory.HOUSING,
        neighborhood: "Kicukiro",
        district: "Kicukiro",
        description: "Rental rooms, apartments, and housing leads close to where people work.",
        latitude: -1.9754,
        longitude: 30.0868,
        serviceRadiusKm: 10,
        verified: true
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
      },
      {
        title: "Pain Relief Tablets",
        description: "Essential over-the-counter pain relief available for same-hour pickup.",
        category: ListingCategory.PHARMACY,
        priceRwf: 5500,
        unitLabel: "box",
        inventoryStatus: InventoryStatus.IN_STOCK,
        freshnessNote: "Pharmacist on duty now",
        tags: ["pharmacy", "health", "urgent"],
        merchantId: merchants[3].id
      },
      {
        title: "Baby Formula Pack",
        description: "Trusted infant formula available near Remera and Kimironko.",
        category: ListingCategory.PHARMACY,
        priceRwf: 18500,
        unitLabel: "tin",
        inventoryStatus: InventoryStatus.LOW_STOCK,
        freshnessNote: "3 tins remaining",
        tags: ["family", "baby", "pharmacy"],
        merchantId: merchants[3].id
      },
      {
        title: "Weekly Supermarket Basket",
        description: "Rice, milk, bread, oil, and cleaning basics bundled for busy households.",
        category: ListingCategory.SUPERMARKET,
        priceRwf: 28500,
        unitLabel: "basket",
        inventoryStatus: InventoryStatus.IN_STOCK,
        isFeatured: true,
        tags: ["supermarket", "bundle", "home"],
        merchantId: merchants[0].id
      },
      {
        title: "1-Bedroom Apartment Listing",
        description: "Ready-to-move apartment listing close to bus routes and neighborhood shops.",
        category: ListingCategory.HOUSING,
        priceRwf: 250000,
        unitLabel: "month",
        inventoryStatus: InventoryStatus.MADE_TO_ORDER,
        freshnessNote: "Viewing slots open today",
        tags: ["house", "apartment", "rent"],
        merchantId: merchants[4].id
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
