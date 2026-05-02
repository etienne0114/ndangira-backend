import bcrypt from "bcryptjs";
import { InventoryStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: "GROCERIES", label: "Groceries" },
  { name: "SUPERMARKET", label: "Supermarket" },
  { name: "PHARMACY", label: "Pharmacy" },
  { name: "RESTAURANTS", label: "Restaurants" },
  { name: "FASHION", label: "Fashion" },
  { name: "ELECTRONICS", label: "Electronics" },
  { name: "HOME", label: "Home" },
  { name: "HOUSING", label: "Housing" },
  { name: "HEALTH", label: "Health" },
  { name: "SERVICES", label: "Services" }
];

const SELLERS = [
  {
    email: "aline.seller@gmail.com",
    name: "Aline Uwimana",
    businessName: "Kimironko Fresh Hub",
    phone: "+250788000111",
    whatsapp: "+250788000111",
    neighborhood: "Kimironko",
    district: "Gasabo",
    description: "Fast-moving fresh produce and everyday grocery staples.",
    latitude: -1.9499,
    longitude: 30.1256,
    serviceRadiusKm: 4,
    verified: true
  },
  {
    email: "eric.seller@gmail.com",
    name: "Eric Nshimiyimana",
    businessName: "Nyamirambo Home Select",
    phone: "+250788000222",
    whatsapp: "+250788000222",
    neighborhood: "Nyamirambo",
    district: "Nyarugenge",
    description: "Household supplies, curtains, and same-day local services.",
    latitude: -1.9706,
    longitude: 30.0396,
    serviceRadiusKm: 8,
    verified: true
  },
  {
    email: "grace.seller@gmail.com",
    name: "Grace Mukamana",
    businessName: "Kacyiru Tech Corner",
    phone: "+250788000333",
    whatsapp: "+250788000333",
    neighborhood: "Kacyiru",
    district: "Gasabo",
    description: "Electronics, accessories, and quick gadget recommendations.",
    latitude: -1.9441,
    longitude: 30.0929,
    serviceRadiusKm: 6,
    verified: false
  },
  {
    email: "didier.seller@gmail.com",
    name: "Didier Habimana",
    businessName: "Remera Care Pharmacy",
    phone: "+250788000444",
    whatsapp: "+250788000444",
    neighborhood: "Remera",
    district: "Gasabo",
    description: "Nearby pharmacy with essential medicine and health products.",
    latitude: -1.9552,
    longitude: 30.1047,
    serviceRadiusKm: 5,
    verified: true
  },
  {
    email: "clarisse.seller@gmail.com",
    name: "Clarisse Umutoni",
    businessName: "Kicukiro Homes Desk",
    phone: "+250788000555",
    whatsapp: "+250788000555",
    neighborhood: "Kicukiro",
    district: "Kicukiro",
    description: "Rental rooms, apartments, and housing leads close to where people work.",
    latitude: -1.9754,
    longitude: 30.0868,
    serviceRadiusKm: 10,
    verified: true
  }
];

async function main() {
  await Promise.all(
    SYSTEM_CATEGORIES.map((category) =>
      prisma.category.upsert({
        where: { name: category.name },
        create: { ...category, isSystem: true },
        update: { label: category.label, isSystem: true }
      })
    )
  );

  const allCategories = await prisma.category.findMany();
  const catId = Object.fromEntries(allCategories.map((category) => [category.name, category.id]));

  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    create: { email: "admin@gmail.com", passwordHash: adminHash, name: "Admin", role: "ADMIN" },
    update: { passwordHash: adminHash, role: "ADMIN", name: "Admin", sellerStatus: null }
  });

  await prisma.listing.deleteMany();
  await prisma.merchant.deleteMany();

  const sellerHash = await bcrypt.hash("seller123", 10);
  const merchants = await Promise.all(
    SELLERS.map(async (seller) => {
      const user = await prisma.user.upsert({
        where: { email: seller.email },
        create: {
          email: seller.email,
          passwordHash: sellerHash,
          name: seller.name,
          role: "SELLER",
          sellerStatus: "APPROVED"
        },
        update: {
          passwordHash: sellerHash,
          name: seller.name,
          role: "SELLER",
          sellerStatus: "APPROVED"
        }
      });

      return prisma.merchant.create({
        data: {
          userId: user.id,
          businessName: seller.businessName,
          ownerName: seller.name,
          phone: seller.phone,
          whatsapp: seller.whatsapp,
          neighborhood: seller.neighborhood,
          district: seller.district,
          description: seller.description,
          latitude: seller.latitude,
          longitude: seller.longitude,
          serviceRadiusKm: seller.serviceRadiusKm,
          verified: seller.verified
        }
      });
    })
  );

  await prisma.listing.createMany({
    data: [
      {
        title: "Fresh Tomatoes Basket",
        description: "Same-morning tomatoes sourced from nearby farms and ready for pickup.",
        categoryId: catId["GROCERIES"],
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
        categoryId: catId["GROCERIES"],
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
        categoryId: catId["HOME"],
        priceRwf: 45000,
        unitLabel: "set",
        inventoryStatus: InventoryStatus.MADE_TO_ORDER,
        tags: ["interior", "custom"],
        merchantId: merchants[1].id
      },
      {
        title: "Bluetooth Speaker",
        description: "Portable speaker with strong battery life and clear sound.",
        categoryId: catId["ELECTRONICS"],
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
        categoryId: catId["SERVICES"],
        priceRwf: 12000,
        unitLabel: "session",
        inventoryStatus: InventoryStatus.IN_STOCK,
        tags: ["beauty", "same-day"],
        merchantId: merchants[1].id
      },
      {
        title: "Pain Relief Tablets",
        description: "Essential over-the-counter pain relief available for same-hour pickup.",
        categoryId: catId["PHARMACY"],
        priceRwf: 5500,
        unitLabel: "box",
        inventoryStatus: InventoryStatus.IN_STOCK,
        freshnessNote: "Pharmacist on duty now",
        tags: ["pharmacy", "health", "urgent"],
        merchantId: merchants[3].id
      },
      {
        title: "Weekly Supermarket Basket",
        description: "Rice, milk, bread, oil, and cleaning basics bundled for busy households.",
        categoryId: catId["SUPERMARKET"],
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
        categoryId: catId["HOUSING"],
        priceRwf: 250000,
        unitLabel: "month",
        inventoryStatus: InventoryStatus.MADE_TO_ORDER,
        freshnessNote: "Viewing slots open today",
        tags: ["house", "apartment", "rent"],
        merchantId: merchants[4].id
      }
    ]
  });

  console.log("Seed complete: 10 categories, 5 approved sellers, 5 merchants, 8 listings.");
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
