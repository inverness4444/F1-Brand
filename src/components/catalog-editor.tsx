"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, ImagePlus, Plus, RotateCcw, Save, Search, Trash2, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  colorOptions,
  drivers,
  legends,
  productTypeOptions,
  sizeOptions,
  teams,
} from "@/lib/data/roster";
import { productTypeLabels } from "@/lib/catalog-ui";
import { imageByType, sizesByType } from "@/lib/data/products";
import type {
  CatalogCollection,
  CatalogCategory,
  FeaturedCollection,
  Product,
  ProductBadge,
  ProductColor,
  ProductSize,
  ProductType,
} from "@/lib/types";
import {
  categoryLabelRu,
  colorLabelRu,
  getProductDescription,
  getProductDisplayName,
  getProductShortDescription,
} from "@/lib/storefront-text";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import { cn, formatPrice, getProductHref, slugify } from "@/lib/utils";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { createProductDraft, useCatalogStore } from "@/store/catalog-store";
import { ProductImage } from "@/components/product-image";
import { Button, buttonClassName } from "@/components/ui/button";

const badgeOptions: ProductBadge[] = ["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale", "Original"];
const categoryOptions: CatalogCategory[] = ["Pilots", "Teams", "Legends", "Accessories", "Gifts"];
const legacySystemCollectionNames = new Set([
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
]);
const accessoryTypeValues = new Set<ProductType>([
  "Scarf",
  "Lego",
  "Cap",
  "Accessory",
  "Wallet",
  "Cardholder",
  "Keychain",
  "Calendar",
  "Poster",
]);

const colorHexMap: Record<ProductColor, string> = {
  Black: "#111111",
  White: "#ffffff",
  Navy: "#162540",
  Red: "#ef4444",
  Orange: "#f97316",
  Blue: "#2563eb",
  Green: "#16a34a",
  Yellow: "#facc15",
  Grey: "#9ca3af",
  Silver: "#cfd4da",
  Beige: "#d6c2a0",
  Pink: "#ec4899",
};

const badgeMap: Record<ProductBadge, string> = {
  New: "Новинка",
  Hit: "Хит",
  Limited: "Лимит",
  Preorder: "Предзаказ",
  OutOfStock: "Нет в наличии",
  Sale: "Распродажа",
  Original: "Оригинал",
};

function getCustomCollectionTags(product: Pick<Product, "collection" | "collectionTags">) {
  return [...new Set([product.collection, ...product.collectionTags])]
    .filter((tag): tag is FeaturedCollection => Boolean(tag) && !legacySystemCollectionNames.has(tag));
}

function collectionTagsFor(badge: ProductBadge, customTags: FeaturedCollection[] = []) {
  const tags = new Set<FeaturedCollection>(customTags.filter((tag) => tag && !legacySystemCollectionNames.has(tag)));

  if (badge === "New") {
    tags.add("New Arrivals");
  }

  if (badge === "Sale") {
    tags.add("Sale");
  }

  return [...tags];
}

function collectionFieldsFor(product: Pick<Product, "badge" | "collection" | "collectionTags">, badge = product.badge) {
  const customTags = getCustomCollectionTags(product);

  return {
    collection: customTags[0] ?? "",
    collectionTags: collectionTagsFor(badge, customTags),
  };
}

function cloneProduct(product: Product) {
  const cloned = JSON.parse(JSON.stringify(product)) as Product;

  return {
    ...cloned,
    name: getProductDisplayName(product),
    shortDescription: getProductShortDescription(product),
    description: getProductDescription(product),
  };
}

function cloneCollection(collection: CatalogCollection) {
  return JSON.parse(JSON.stringify(collection)) as CatalogCollection;
}

function createCollectionDraft(existingCollections: CatalogCollection[]): CatalogCollection {
  const baseName = "Новая коллекция";
  const baseSlug = slugify(baseName) || `collection-${Date.now()}`;
  const existingIds = new Set(existingCollections.map((collection) => collection.id));
  const existingSlugs = new Set(existingCollections.map((collection) => collection.slug));
  let index = 1;
  let id = `custom-collection-${Date.now()}`;
  let slug = baseSlug;

  while (existingIds.has(id)) {
    id = `custom-collection-${Date.now()}-${index}`;
    index += 1;
  }

  index = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return {
    id,
    slug,
    name: baseName,
    productIds: [],
    createdAt: new Date().toISOString(),
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Не удалось загрузить файл ${file.name}`));

    reader.readAsDataURL(file);
  });
}

function parseGallery(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinGallery(images: string[]) {
  return images.join("\n");
}

export function CatalogEditor() {
  const searchParams = useSearchParams();
  const { collections, products, hasHydrated } = useCatalogProducts();
  const {
    removeCollection,
    removeProduct,
    replaceProducts,
    resetProducts,
    saveCollectionProducts,
    upsertProduct,
  } = useCatalogStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDraft, setCollectionDraft] = useState<CatalogCollection | null>(null);
  const [collectionProductQuery, setCollectionProductQuery] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const requestedProductId = searchParams.get("product");

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (requestedProductId) {
      const requestedProduct = products.find((product) => product.id === requestedProductId);
      if (requestedProduct && selectedId !== requestedProduct.id) {
        setSelectedId(requestedProduct.id);
        setDraft(cloneProduct(requestedProduct));
        return;
      }
    }

    if (!selectedId && !draft) {
      if (products.length > 0) {
        setSelectedId(products[0].id);
        setDraft(cloneProduct(products[0]));
        return;
      }

      setDraft(createProductDraft(products));
    }
  }, [draft, hasHydrated, products, requestedProductId, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedProduct = products.find((product) => product.id === selectedId);
    if (selectedProduct) {
      setDraft(cloneProduct(selectedProduct));
    }
  }, [products, selectedId]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!selectedCollectionId && !collectionDraft) {
      if (collections[0]) {
        setSelectedCollectionId(collections[0].id);
        setCollectionDraft(cloneCollection(collections[0]));
        return;
      }

      setCollectionDraft(createCollectionDraft(collections));
    }
  }, [collectionDraft, collections, hasHydrated, selectedCollectionId]);

  useEffect(() => {
    if (!selectedCollectionId) {
      return;
    }

    const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId);
    if (selectedCollection) {
      setCollectionDraft(cloneCollection(selectedCollection));
    }
  }, [collections, selectedCollectionId]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = sanitizeSearchQuery(query).toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        getProductDisplayName(product),
        product.id,
        product.slug,
        product.driverName,
        product.teamName,
        product.legendName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [products, query]);

  const filteredCollectionProducts = useMemo(() => {
    const normalizedQuery = sanitizeSearchQuery(collectionProductQuery).toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        getProductDisplayName(product),
        product.id,
        product.driverName,
        product.teamName,
        product.legendName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [collectionProductQuery, products]);

  const availableDraftCollections = useMemo(() => {
    return collections;
  }, [collections]);

  const isPersistedProduct = draft ? products.some((product) => product.id === draft.id) : false;
  const isPersistedCollection = collectionDraft
    ? collections.some((collection) => collection.id === collectionDraft.id)
    : false;

  const updateDraft = <Key extends keyof Product>(key: Key, value: Product[Key]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateCollectionDraft = <Key extends keyof CatalogCollection>(key: Key, value: CatalogCollection[Key]) => {
    setCollectionDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const toggleCollectionProduct = (productId: string) => {
    setCollectionDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        productIds: current.productIds.includes(productId)
          ? current.productIds.filter((item) => item !== productId)
          : [...current.productIds, productId],
      };
    });
  };

  const toggleDraftCollection = (collectionName: FeaturedCollection) => {
    if (!draft) {
      return;
    }

    const active = getCustomCollectionTags(draft).includes(collectionName);
    const customTags = active
      ? getCustomCollectionTags(draft).filter((tag) => tag !== collectionName)
      : [collectionName, ...getCustomCollectionTags(draft)];

    setDraft({
      ...draft,
      collection: customTags[0] ?? "",
      collectionTags: collectionTagsFor(draft.badge, customTags),
    });
  };

  const applyCategory = (category: CatalogCategory) => {
    if (!draft) {
      return;
    }

    if (category === "Pilots") {
      const driver = drivers.find((item) => item.name === draft.driverName) ?? drivers[0];
      setDraft({
        ...draft,
        category,
        ...collectionFieldsFor(draft),
        driverName: driver.name,
        teamName: driver.teamName,
        legendName: null,
        colors: [...driver.colors],
        hexPalette: [...driver.hexPalette],
        number: driver.number,
      });
      return;
    }

    if (category === "Teams") {
      const team = teams.find((item) => item.name === draft.teamName) ?? teams[0];
      setDraft({
        ...draft,
        category,
        ...collectionFieldsFor(draft),
        driverName: null,
        teamName: team.name,
        legendName: null,
        colors: [...team.colors],
        hexPalette: [...team.hexPalette],
        number: undefined,
      });
      return;
    }

    if (category === "Gifts") {
      setDraft({
        ...draft,
        category,
        ...collectionFieldsFor(draft),
        driverName: null,
        teamName: null,
        legendName: null,
        sizes: ["One Size"],
        type: "Gift Certificate",
        number: undefined,
      });
      return;
    }

    if (category === "Accessories") {
      const nextType = accessoryTypeValues.has(draft.type) ? draft.type : "Accessory";

      setDraft({
        ...draft,
        category,
        ...collectionFieldsFor(draft),
        driverName: null,
        teamName: null,
        legendName: null,
        sizes: [...sizesByType[nextType]],
        type: nextType,
        productType: "standard",
        requiresShipping: true,
        number: undefined,
      });
      return;
    }

    if (category === "Essentials") {
      setDraft({
        ...draft,
        category,
        ...collectionFieldsFor(draft),
        driverName: null,
        teamName: null,
        legendName: null,
        number: undefined,
      });
      return;
    }

    const legend = legends.find((item) => item.name === draft.legendName) ?? legends[0];
    setDraft({
      ...draft,
      category,
      ...collectionFieldsFor(draft),
      driverName: null,
      teamName: null,
      legendName: legend.name,
      colors: [...legend.colors],
      hexPalette: [...legend.hexPalette],
      number: undefined,
    });
  };

  const applyType = (type: ProductType) => {
    if (!draft) {
      return;
    }

    const previousDefaultImage = imageByType[draft.type];
    const nextDefaultImage = imageByType[type];
    const shouldReplaceMainImage = !draft.image || draft.image === previousDefaultImage;
    const shouldReplaceGallery =
      draft.gallery.length === 0 || draft.gallery.every((image) => image === draft.image || image === previousDefaultImage);

    setDraft({
      ...draft,
      type,
      image: shouldReplaceMainImage ? nextDefaultImage : draft.image,
      gallery: shouldReplaceGallery ? [shouldReplaceMainImage ? nextDefaultImage : draft.image] : draft.gallery,
      sizes: [...sizesByType[type]],
      category: type === "Gift Certificate" ? "Gifts" : draft.category === "Gifts" ? "Accessories" : draft.category,
      productType: type === "Gift Certificate" ? "gift_certificate" : "standard",
      requiresShipping: type !== "Gift Certificate",
      driverName: type === "Gift Certificate" ? null : draft.driverName,
      teamName: type === "Gift Certificate" ? null : draft.teamName,
      legendName: type === "Gift Certificate" ? null : draft.legendName,
    });
  };

  const applyBadge = (badge: ProductBadge) => {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      badge,
      ...collectionFieldsFor(draft, badge),
    });
  };

  const applyDriver = (driverName: string) => {
    if (!draft) {
      return;
    }

    const driver = drivers.find((item) => item.name === driverName);

    setDraft({
      ...draft,
      category: "Pilots",
      ...collectionFieldsFor(draft),
      driverName: driverName || null,
      teamName: driver?.teamName ?? draft.teamName,
      legendName: null,
      number: driver?.number ?? draft.number,
      colors: driver ? [...driver.colors] : draft.colors,
      hexPalette: driver ? [...driver.hexPalette] : draft.hexPalette,
    });
  };

  const applyTeam = (teamName: string) => {
    if (!draft) {
      return;
    }

    const team = teams.find((item) => item.name === teamName);

    setDraft({
      ...draft,
      category: "Teams",
      ...collectionFieldsFor(draft),
      driverName: null,
      teamName: teamName || null,
      legendName: null,
      colors: team ? [...team.colors] : draft.colors,
      hexPalette: team ? [...team.hexPalette] : draft.hexPalette,
    });
  };

  const applyLegend = (legendName: string) => {
    if (!draft) {
      return;
    }

    const legend = legends.find((item) => item.name === legendName);

    setDraft({
      ...draft,
      category: "Legends",
      ...collectionFieldsFor(draft),
      driverName: null,
      teamName: null,
      legendName: legendName || null,
      colors: legend ? [...legend.colors] : draft.colors,
      hexPalette: legend ? [...legend.hexPalette] : draft.hexPalette,
    });
  };

  const toggleColor = (color: ProductColor) => {
    if (!draft) {
      return;
    }

    const nextColors = draft.colors.includes(color)
      ? draft.colors.filter((item) => item !== color)
      : [...draft.colors, color];

    setDraft({
      ...draft,
      colors: nextColors.length > 0 ? nextColors : ["Black" as ProductColor],
    });
  };

  const toggleSize = (size: Exclude<ProductSize, "One Size">) => {
    if (!draft) {
      return;
    }

    const nextSizes = draft.sizes.includes(size)
      ? draft.sizes.filter((item) => item !== size)
      : [...draft.sizes.filter((item) => item !== "One Size"), size];

    setDraft({
      ...draft,
      sizes: nextSizes.length > 0 ? nextSizes : [...sizesByType[draft.type]],
    });
  };

  const handleNewProduct = () => {
    setSelectedId(null);
    setDraft(createProductDraft(products));
    setMessage("Создан новый черновик товара.");
  };

  const handleNewCollection = () => {
    setSelectedCollectionId(null);
    setCollectionDraft(createCollectionDraft(collections));
    setMessage("Создан черновик коллекции.");
  };

  const handleSaveCollection = async () => {
    if (!collectionDraft) {
      return;
    }

    const normalizedDraft: CatalogCollection = {
      ...collectionDraft,
      id: collectionDraft.id.trim() || slugify(collectionDraft.name) || `collection-${Date.now()}`,
      slug: slugify(collectionDraft.slug || collectionDraft.name) || collectionDraft.id,
      productIds: [...new Set(collectionDraft.productIds)],
      createdAt: collectionDraft.createdAt || new Date().toISOString(),
    };

    try {
      await saveCollectionProducts(normalizedDraft, normalizedDraft.productIds);
      setSelectedCollectionId(normalizedDraft.id);
      setMessage(`Коллекция «${normalizedDraft.name}» сохранена.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить коллекцию.");
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionDraft) {
      return;
    }

    if (!isPersistedCollection) {
      const nextCollection = collections[0] ? cloneCollection(collections[0]) : null;
      setCollectionDraft(nextCollection);
      setSelectedCollectionId(nextCollection?.id ?? null);
      setMessage("Черновик коллекции удалён.");
      return;
    }

    try {
      await removeCollection(collectionDraft.id);
      const nextCollection = collections.find((collection) => collection.id !== collectionDraft.id) ?? null;
      setSelectedCollectionId(nextCollection?.id ?? null);
      setCollectionDraft(nextCollection ? cloneCollection(nextCollection) : null);
      setMessage(`Коллекция «${collectionDraft.name}» удалена.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить коллекцию.");
    }
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    const normalizedDraft: Product = {
      ...draft,
      ...collectionFieldsFor(draft),
      id: draft.id.trim() || slugify(draft.name) || `custom-${Date.now()}`,
      slug: draft.slug.trim() || slugify(draft.name) || draft.id,
      gallery: draft.gallery.length > 0 ? draft.gallery : [draft.image],
    };

    try {
      await upsertProduct(normalizedDraft);
      setSelectedId(normalizedDraft.id);
      setMessage(`Товар «${normalizedDraft.name}» сохранён.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить товар.");
    }
  };

  const handleDelete = async () => {
    if (!draft) {
      return;
    }

    if (!isPersistedProduct) {
      setDraft(products[0] ? cloneProduct(products[0]) : null);
      setSelectedId(products[0]?.id ?? null);
      setMessage("Черновик удалён.");
      return;
    }

    try {
      await removeProduct(draft.id);
      const nextProduct = products.find((product) => product.id !== draft.id) ?? null;
      setSelectedId(nextProduct?.id ?? null);
      setDraft(nextProduct ? cloneProduct(nextProduct) : null);
      setMessage(`Товар «${draft.name}» удалён.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить товар.");
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "f1-brand-products.json";
    link.click();

    URL.revokeObjectURL(url);
    setMessage("Каталог экспортирован в JSON.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error("Файл должен содержать массив товаров.");
      }

      await replaceProducts(parsed as Product[]);
      setMessage(`Импортировано товаров: ${parsed.length}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось импортировать файл.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = async () => {
    try {
      await resetProducts();
      setSelectedId(null);
      setDraft(null);
      setMessage("Каталог восстановлен.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось восстановить каталог.");
    }
  };

  const handleMainImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !draft) {
      return;
    }

    const image = await fileToDataUrl(file);
    setDraft({
      ...draft,
      image,
      gallery: [image, ...draft.gallery.filter((item) => item !== draft.image)],
    });

    event.target.value = "";
  };

  const handleGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    if (files.length === 0 || !draft) {
      return;
    }

    const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
    const defaultImage = imageByType[draft.type];
    const shouldUseUploadedImageAsMain =
      !draft.image || draft.image === defaultImage || draft.gallery.every((image) => image === draft.image || image === defaultImage);
    const nextGallery = [...draft.gallery, ...images].filter(Boolean);
    const nextImage = shouldUseUploadedImageAsMain ? images[0] : draft.image;

    setDraft({
      ...draft,
      gallery: [...new Set([nextImage, ...nextGallery])],
      image: nextImage,
    });

    event.target.value = "";
  };

  const previewTitle = draft?.name || "Новый товар";
  const previewMeta = draft?.driverName ?? draft?.teamName ?? draft?.legendName ?? "Без привязки";

  return (
    <div className="pb-12">
      <section className="container-shell pt-8">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker">Коллекции</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Управление коллекциями каталога</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Коллекция — это отдельная серия или дроп одежды. Раздел товара выбирается в форме товара отдельно,
                а коллекция появляется в фильтре только там, где есть привязанные к ней товары.
              </p>
            </div>
            <Button onClick={handleNewCollection}>
              <Plus className="size-4" />
              Новая коллекция
            </Button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2">
              {collections.length > 0 ? (
                collections.map((collection) => {
                  const active = collectionDraft?.id === collection.id;
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId(collection.id);
                        setCollectionDraft(cloneCollection(collection));
                      }}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        active
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span className="block text-sm font-semibold">{collection.name}</span>
                      <span className={cn("mt-1 block text-xs", active ? "text-slate-300" : "text-slate-500")}>
                        {collection.productIds.length} товаров
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Коллекций пока нет.
                </div>
              )}
            </div>

            {collectionDraft ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-900">Название коллекции</span>
                      <input
                        value={collectionDraft.name}
                        onChange={(event) => updateCollectionDraft("name", event.target.value)}
                        className="input-base rounded-2xl"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-900">Slug</span>
                      <input
                        value={collectionDraft.slug}
                        onChange={(event) => updateCollectionDraft("slug", slugify(event.target.value))}
                        className="input-base rounded-2xl"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={handleSaveCollection}>
                      <Save className="size-4" />
                      Сохранить коллекцию
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleDeleteCollection}
                    >
                      <Trash2 className="size-4" />
                      {isPersistedCollection ? "Удалить" : "Удалить черновик"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Товары в коллекции</p>
                      <p className="mt-1 text-xs text-slate-500">Выбрано: {collectionDraft.productIds.length}</p>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={collectionProductQuery}
                        onChange={(event) => setCollectionProductQuery(sanitizeSearchQuery(event.target.value))}
                        placeholder="Найти товар"
                        className="input-base rounded-2xl pl-11"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid max-h-[480px] gap-2 overflow-y-auto pr-1">
                    {filteredCollectionProducts.length > 0 ? (
                      filteredCollectionProducts.map((product) => {
                        const active = collectionDraft.productIds.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleCollectionProduct(product.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                              active
                                ? "border-red-300 bg-red-50"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded border text-xs font-semibold",
                                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent",
                              )}
                            >
                              ✓
                            </span>
                            <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-2">
                              <ProductImage
                                src={product.image}
                                fallbackSrc={imageByType[product.type]}
                                alt={product.name}
                                width={64}
                                height={64}
                                className="h-full w-full object-contain"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {getProductDisplayName(product)}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {categoryLabelRu[product.category]} ·{" "}
                                {product.driverName ?? product.teamName ?? product.legendName ?? product.collection}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        По этому поиску товаров нет.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900">Выберите коллекцию</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Можно выбрать существующую коллекцию или создать новую.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-shell mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="surface-card self-start rounded-[32px] p-4 xl:sticky xl:top-28">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(sanitizeSearchQuery(event.target.value))}
              placeholder="Поиск по товарам"
              className="input-base pl-11"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>Товаров в каталоге: {products.length}</span>
            <span>Найдено: {filteredProducts.length}</span>
          </div>

          <div className="mt-4 max-h-[calc(100dvh-18rem)] space-y-3 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const active = draft?.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(product.id);
                      setDraft(cloneProduct(product));
                    }}
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left transition",
                      active
                        ? "border-red-300 bg-red-50 shadow-[0_12px_30px_rgba(220,38,38,0.08)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-2">
                        <ProductImage
                          src={product.image}
                          fallbackSrc={imageByType[product.type]}
                          alt={product.name}
                          width={72}
                          height={72}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {getProductDisplayName(product)}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-[0.7rem] font-semibold text-slate-600">
                            {badgeMap[product.badge]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {product.driverName ?? product.teamName ?? product.legendName}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatPrice(product.price)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900">Товаров пока нет</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Нажмите «Новый товар», чтобы добавить первую карточку в каталог.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="grid gap-6">
          <div className="surface-card rounded-[32px] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="section-kicker">Редактор каталога</p>
                <h1 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                  Редактирование карточки товара
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Управляйте названием, ценой, описанием, фото, slug, цветами, размерами и привязкой к пилоту,
                  команде или легенде.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/shop" className={buttonClassName({ variant: "secondary" })}>
                    Открыть магазин
                  </Link>
                  <Button onClick={handleNewProduct}>
                    <Plus className="size-4" />
                    Новый товар
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="size-4" />
                  Экспорт JSON
                </Button>
                <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
                  <Upload className="size-4" />
                  Импорт JSON
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  <RotateCcw className="size-4" />
                  Сбросить каталог
                </Button>
                <Button onClick={handleSave} disabled={!draft}>
                  <Save className="size-4" />
                  Сохранить
                </Button>
              </div>
            </div>

            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />

            {message ? (
              <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
            ) : null}
          </div>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="surface-card rounded-[32px] p-6">
            {draft ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="section-kicker">Форма товара</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {isPersistedProduct ? "Редактирование товара" : "Новый товар"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={handleDelete}>
                      <Trash2 className="size-4" />
                      {isPersistedProduct ? "Удалить товар" : "Удалить черновик"}
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="size-4" />
                      Сохранить изменения
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Название</span>
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Цена, ₽</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.price}
                      onChange={(event) => updateDraft("price", Number(event.target.value))}
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">ID</span>
                    <input
                      value={draft.id}
                      onChange={(event) => updateDraft("id", event.target.value)}
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Slug</span>
                    <input
                      value={draft.slug}
                      onChange={(event) => updateDraft("slug", slugify(event.target.value))}
                      className="input-base rounded-2xl"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Раздел</span>
                    <select
                      value={draft.category}
                      onChange={(event) => applyCategory(event.target.value as CatalogCategory)}
                      className="input-base rounded-2xl"
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {categoryLabelRu[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Тип товара</span>
                    <select
                      value={draft.type}
                      onChange={(event) => applyType(event.target.value as ProductType)}
                      className="input-base rounded-2xl"
                    >
                      {productTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {productTypeLabels[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Бейдж</span>
                    <select
                      value={draft.badge}
                      onChange={(event) => applyBadge(event.target.value as ProductBadge)}
                      className="input-base rounded-2xl"
                    >
                      {badgeOptions.map((option) => (
                        <option key={option} value={option}>
                          {badgeMap[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Пилот</span>
                    <input
                      value={draft.driverName ?? ""}
                      onChange={(event) => applyDriver(event.target.value)}
                      list="catalog-drivers"
                      placeholder="Введите имя пилота"
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Команда</span>
                    <input
                      value={draft.teamName ?? ""}
                      onChange={(event) => applyTeam(event.target.value)}
                      list="catalog-teams"
                      placeholder="Введите команду"
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Легенда</span>
                    <input
                      value={draft.legendName ?? ""}
                      onChange={(event) => applyLegend(event.target.value)}
                      list="catalog-legends"
                      placeholder="Введите легенду"
                      className="input-base rounded-2xl"
                    />
                  </label>
                </div>

                <datalist id="catalog-drivers">
                  {drivers.map((driver) => (
                    <option key={driver.slug} value={driver.name} />
                  ))}
                </datalist>
                <datalist id="catalog-teams">
                  {teams.map((team) => (
                    <option key={team.slug} value={team.name} />
                  ))}
                </datalist>
                <datalist id="catalog-legends">
                  {legends.map((legend) => (
                    <option key={legend.slug} value={legend.name} />
                  ))}
                </datalist>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Коллекции товара</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Раздел товара выбирается выше. Здесь можно привязать товар к серии выпуска, например Black Out
                    или Team Drop.
                  </p>
                  {availableDraftCollections.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableDraftCollections.map((collection) => {
                        const active = draft.collectionTags.includes(collection.name);
                        return (
                          <button
                            key={collection.id}
                            type="button"
                            onClick={() => toggleDraftCollection(collection.name)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition",
                              active
                                ? "border-slate-900 bg-slate-950 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
                            )}
                          >
                            {collection.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Коллекций пока нет. Создайте серию в блоке выше.</p>
                  )}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900">Описание товара</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    rows={5}
                    className="min-h-34 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Главное фото</span>
                    <input
                      value={draft.image}
                      onChange={(event) => updateDraft("image", event.target.value)}
                      placeholder="URL или data:image..."
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Загрузка фото</span>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => mainImageInputRef.current?.click()}>
                        <ImagePlus className="size-4" />
                        Загрузить главное фото
                      </Button>
                      <Button variant="secondary" onClick={() => galleryInputRef.current?.click()}>
                        <Upload className="size-4" />
                        Добавить в галерею
                      </Button>
                    </div>
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleMainImageUpload}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGalleryUpload}
                    />
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900">Галерея</span>
                  <textarea
                    value={joinGallery(draft.gallery)}
                    onChange={(event) => updateDraft("gallery", parseGallery(event.target.value))}
                    rows={4}
                    placeholder="По одной ссылке или data:image на строку"
                    className="min-h-28 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                <div>
                  <p className="text-sm font-medium text-slate-900">Цвета товара</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {colorOptions.map((color) => {
                      const active = draft.colors.includes(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => toggleColor(color)}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                            active ? "border-red-300 bg-red-50 text-slate-900" : "border-slate-300 bg-white text-slate-700",
                          )}
                        >
                          <span
                            className="size-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: colorHexMap[color] }}
                          />
                          {colorLabelRu[color]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-900">Размеры</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizesByType[draft.type].includes("One Size") ? (
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                        Один размер
                      </span>
                    ) : (
                      sizeOptions.map((size) => {
                        const active = draft.sizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={cn(
                              "min-w-12 rounded-full border px-4 py-2 text-sm transition",
                              active ? "border-red-300 bg-red-50 text-slate-900" : "border-slate-300 bg-white text-slate-700",
                            )}
                          >
                            {size}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Популярность</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.popularity}
                      onChange={(event) => updateDraft("popularity", Number(event.target.value))}
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Дата добавления</span>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(draft.createdAt)}
                      onChange={(event) => updateDraft("createdAt", readDateTimeLocal(event.target.value))}
                      className="input-base rounded-2xl"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-900">Номер пилота</span>
                    <input
                      type="number"
                      value={draft.number ?? ""}
                      onChange={(event) =>
                        updateDraft("number", event.target.value ? Number(event.target.value) : undefined)
                      }
                      className="input-base rounded-2xl"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h2 className="text-2xl font-semibold text-slate-900">Выберите товар или создайте новый</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Слева отображается полный каталог. Выберите карточку для редактирования или создайте новую.
                </p>
                <Button className="mt-6" onClick={handleNewProduct}>
                  <Plus className="size-4" />
                  Создать товар
                </Button>
              </div>
            )}
            </div>

            <aside className="surface-card rounded-[32px] p-5">
            <p className="section-kicker">Превью</p>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="relative flex aspect-[4/4.2] items-center justify-center bg-slate-50 p-6">
                <ProductImage
                  src={draft?.image || imageByType["T-shirt"]}
                  fallbackSrc={draft ? imageByType[draft.type] : imageByType["T-shirt"]}
                  alt={previewTitle}
                  width={420}
                  height={420}
                  className="h-[72%] w-[72%] object-contain"
                />
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    {draft ? badgeMap[draft.badge] : "Новинка"}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{formatPrice(draft?.price ?? 0)}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-900">{previewTitle}</h3>
                <p className="mt-2 text-sm text-slate-500">{previewMeta}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(draft?.colors ?? ["Black"]).slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="size-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: colorHexMap[color] }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {draft ? (
              <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Категория:</span> {categoryLabelRu[draft.category]}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Тип:</span> {productTypeLabels[draft.type]}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Slug:</span> /product/{draft.slug || "slug"}
                </p>
                <Link
                  href={draft.slug ? getProductHref(draft) : "#"}
                  className="inline-flex text-sm font-semibold text-red-600"
                >
                  Открыть карточку товара
                </Link>
              </div>
            ) : null}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
