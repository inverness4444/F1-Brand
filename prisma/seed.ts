import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const sizes = [
  ["XS", "XS", 10],
  ["S", "S", 20],
  ["M", "M", 30],
  ["L", "L", 40],
  ["XL", "XL", 50],
  ["XXL", "XXL", 60],
  ["One Size", "One Size", 100],
] as const;

const colors = [
  ["Black", "Black", "#111111", 10],
  ["White", "White", "#f9f8f4", 20],
  ["Navy", "Navy", "#162540", 30],
  ["Grey", "Grey", "#9ea3aa", 40],
  ["Red", "Red", "#d8382e", 50],
  ["Orange", "Orange", "#eb6d2f", 60],
  ["Green", "Green", "#16614b", 70],
  ["Blue", "Blue", "#1c4fb4", 80],
  ["Yellow", "Yellow", "#d6b224", 90],
  ["Silver", "Silver", "#cfd4da", 100],
  ["Beige", "Beige", "#d7c8b7", 110],
  ["Pink", "Pink", "#d66597", 120],
] as const;

const categories = [
  ["pilots", "Pilots", "Гоночные капсулы, вдохновленные пилотажем и трековой культурой."],
  ["teams", "Teams", "Командная эстетика без официальных логотипов и лицензированных названий."],
  ["legends", "Legends", "Ретро-гонки, архивные силуэты и спокойная премиальная графика."],
  ["accessories", "Accessories", "Кепки, постеры, брелоки и другие акценты для образа."],
  ["essentials", "Essentials", "Базовая одежда в чистой racing-эстетике."],
  ["gifts", "Gifts", "Подарочные позиции и цифровые сертификаты."],
] as const;

const collections = [
  ["paddock-essentials", "Paddock Essentials"],
  ["street-racing-collection", "Street Racing Collection"],
  ["champion-capsule", "Champion Capsule"],
  ["new-arrivals", "New Arrivals"],
  ["sale", "Sale"],
] as const;

type DemoProduct = {
  slug: string;
  name: string;
  category: string;
  collection: string;
  collectionTags: string[];
  type: string;
  gender: string;
  badge: string;
  productKind?: "standard" | "gift_certificate";
  requiresShipping?: boolean;
  priceCents: number;
  shortDescription: string;
  description: string;
  colors: string[];
  sizes: string[];
  image: string;
  popularity: number;
  hexPalette: string[];
};

const products: DemoProduct[] = [
  {
    slug: "apex-paddock-tee",
    name: "Apex Paddock Tee",
    category: "Essentials",
    collection: "Paddock Essentials",
    collectionTags: ["Paddock Essentials", "New Arrivals"],
    type: "T-shirt",
    gender: "Unisex",
    badge: "New",
    priceCents: 3990,
    shortDescription: "Clean heavyweight tee with quiet race-weekend structure.",
    description:
      "A neutral racing-inspired tee built around a dense cotton feel, a relaxed silhouette and restrained paddock graphics. This is not official Formula 1 or team merchandise.",
    colors: ["Black", "White", "Beige"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    image: "/mockups/tshirt.svg",
    popularity: 92,
    hexPalette: ["#111111", "#d7c8b7", "#f9f8f4"],
  },
  {
    slug: "night-sprint-hoodie",
    name: "Night Sprint Hoodie",
    category: "Essentials",
    collection: "Street Racing Collection",
    collectionTags: ["Street Racing Collection", "New Arrivals"],
    type: "Hoodie",
    gender: "Unisex",
    badge: "Hit",
    priceCents: 7990,
    shortDescription: "Dense hoodie with dark street-racing energy.",
    description:
      "A soft structured hoodie with subtle contrast lines inspired by night sprint sessions, built for daily wear without licensed team marks.",
    colors: ["Black", "Navy", "Grey"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    image: "/mockups/hoodie.svg",
    popularity: 96,
    hexPalette: ["#111111", "#162540", "#9ea3aa"],
  },
  {
    slug: "pole-position-oversized-tee",
    name: "Pole Position Oversized Tee",
    category: "Pilots",
    collection: "Champion Capsule",
    collectionTags: ["Champion Capsule"],
    type: "T-shirt",
    gender: "Unisex",
    badge: "Limited",
    priceCents: 4490,
    shortDescription: "Oversized tee with a sharp qualifying-session mood.",
    description:
      "A premium oversized tee using abstract lap timing graphics and contrast stitching. It references racing culture without official logos or team claims.",
    colors: ["White", "Red", "Black"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    image: "/mockups/oversized-tee.svg",
    popularity: 88,
    hexPalette: ["#f9f8f4", "#d8382e", "#111111"],
  },
  {
    slug: "pit-wall-cap",
    name: "Pit Wall Cap",
    category: "Accessories",
    collection: "Paddock Essentials",
    collectionTags: ["Paddock Essentials"],
    type: "Cap",
    gender: "Unisex",
    badge: "New",
    priceCents: 2990,
    shortDescription: "Structured cap with a minimal pit-wall silhouette.",
    description:
      "A compact structured cap with clean contrast embroidery and a low-key motorsport profile for everyday outfits.",
    colors: ["Black", "Navy", "Green"],
    sizes: ["One Size"],
    image: "/mockups/cap.svg",
    popularity: 81,
    hexPalette: ["#111111", "#162540", "#16614b"],
  },
  {
    slug: "street-racing-longsleeve",
    name: "Street Racing Longsleeve",
    category: "Teams",
    collection: "Street Racing Collection",
    collectionTags: ["Street Racing Collection"],
    type: "Longsleeve",
    gender: "Unisex",
    badge: "New",
    priceCents: 5290,
    shortDescription: "Lightweight longsleeve with clean racing geometry.",
    description:
      "A technical-feeling longsleeve with abstract racing lines, made for layering and not affiliated with any championship or team.",
    colors: ["Navy", "Blue", "Silver"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    image: "/mockups/longsleeve.svg",
    popularity: 77,
    hexPalette: ["#162540", "#1c4fb4", "#cfd4da"],
  },
  {
    slug: "champion-track-jacket",
    name: "Champion Track Jacket",
    category: "Legends",
    collection: "Champion Capsule",
    collectionTags: ["Champion Capsule", "Sale"],
    type: "Jacket",
    gender: "Unisex",
    badge: "Sale",
    priceCents: 12990,
    shortDescription: "Structured track jacket with retro podium restraint.",
    description:
      "A clean jacket inspired by archival racing outerwear, using neutral panels and no official team, driver or series branding.",
    colors: ["Green", "Black", "Beige"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    image: "/mockups/jacket.svg",
    popularity: 84,
    hexPalette: ["#16614b", "#111111", "#d7c8b7"],
  },
  {
    slug: "digital-racing-gift-card-5000",
    name: "Digital Racing Gift Card 5000",
    category: "Gifts",
    collection: "Paddock Essentials",
    collectionTags: ["Paddock Essentials"],
    type: "Gift Certificate",
    gender: "Unisex",
    badge: "Original",
    productKind: "gift_certificate",
    requiresShipping: false,
    priceCents: 5000,
    shortDescription: "Digital gift card for racing-inspired apparel.",
    description:
      "A digital gift card for the store balance. It is delivered as a generated code after checkout and does not require shipping.",
    colors: ["Black"],
    sizes: ["One Size"],
    image: "/mockups/accessory.svg",
    popularity: 72,
    hexPalette: ["#111111", "#d7c8b7", "#f9f8f4"],
  },
];

function skuFor(productSlug: string, size: string, color: string) {
  return `${productSlug}-${size}-${color}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

async function seedCatalog() {
  for (const [slug, name, description] of categories) {
    await prisma.category.upsert({
      where: { slug },
      create: { id: slug, slug, name, description },
      update: { name, description },
    });
  }

  for (const [slug, name] of collections) {
    await prisma.collection.upsert({
      where: { slug },
      create: { id: slug, slug, name },
      update: { name },
    });
  }

  for (const [value, label, sortOrder] of sizes) {
    await prisma.size.upsert({
      where: { value },
      create: { id: value.toLowerCase().replace(/\s+/g, "-"), value, label, sortOrder },
      update: { label, sortOrder },
    });
  }

  for (const [value, label, hex, sortOrder] of colors) {
    await prisma.color.upsert({
      where: { value },
      create: { id: value.toLowerCase(), value, label, hex, sortOrder },
      update: { label, hex, sortOrder },
    });
  }

  const categoryByName = new Map((await prisma.category.findMany()).map((category) => [category.name, category]));
  const collectionByName = new Map(
    (await prisma.collection.findMany()).map((collection) => [collection.name, collection]),
  );
  const sizeByValue = new Map((await prisma.size.findMany()).map((size) => [size.value, size]));
  const colorByValue = new Map((await prisma.color.findMany()).map((color) => [color.value, color]));

  for (const product of products) {
    const category = categoryByName.get(product.category);
    const collection = collectionByName.get(product.collection);

    if (!category || !collection) {
      throw new Error(`Missing catalog metadata for ${product.slug}.`);
    }

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        id: product.slug,
        slug: product.slug,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        priceCents: product.priceCents,
        status: "ACTIVE",
        badge: product.badge,
        type: product.type,
        gender: product.gender,
        productKind: product.productKind ?? "standard",
        requiresShipping: product.requiresShipping ?? true,
        popularity: product.popularity,
        hexPalette: product.hexPalette,
        categoryId: category.id,
        collectionId: collection.id,
      },
      update: {
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        priceCents: product.priceCents,
        status: "ACTIVE",
        badge: product.badge,
        type: product.type,
        gender: product.gender,
        productKind: product.productKind ?? "standard",
        requiresShipping: product.requiresShipping ?? true,
        popularity: product.popularity,
        hexPalette: product.hexPalette,
        categoryId: category.id,
        collectionId: collection.id,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: savedProduct.id } });
    await prisma.productImage.createMany({
      data: [product.image, product.image, product.image].map((url, index) => ({
        productId: savedProduct.id,
        url,
        alt: product.name,
        sortOrder: index,
      })),
    });

    await prisma.productCollection.deleteMany({ where: { productId: savedProduct.id } });
    await prisma.productCollection.createMany({
      data: product.collectionTags
        .map((name) => collectionByName.get(name))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((tagCollection) => ({
          productId: savedProduct.id,
          collectionId: tagCollection.id,
        })),
      skipDuplicates: true,
    });

    for (const sizeValue of product.sizes) {
      for (const colorValue of product.colors) {
        const size = sizeByValue.get(sizeValue);
        const color = colorByValue.get(colorValue);

        if (!size || !color) {
          throw new Error(`Missing variant metadata for ${product.slug}.`);
        }

        const stock = product.productKind === "gift_certificate" ? 999 : 8 + ((size.sortOrder + color.sortOrder) % 17);
        const variant = await prisma.productVariant.upsert({
          where: {
            productId_sizeId_colorId: {
              productId: savedProduct.id,
              sizeId: size.id,
              colorId: color.id,
            },
          },
          create: {
            productId: savedProduct.id,
            sizeId: size.id,
            colorId: color.id,
            sku: skuFor(product.slug, size.value, color.value),
            stock,
          },
          update: {
            sku: skuFor(product.slug, size.value, color.value),
            stock,
            active: true,
          },
        });

        await prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: "ADJUSTMENT",
            quantity: stock,
            note: "Seed stock snapshot",
          },
        });
      }
    }
  }
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Store Admin",
      phone: "+79990000000",
      role: UserRole.ADMIN,
      passwordHash,
      balance: {
        create: {
          amountCents: 0,
        },
      },
    },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.cart.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });
}

async function main() {
  await seedCatalog();
  await seedAdmin();
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
