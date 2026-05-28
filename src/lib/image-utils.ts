const unoptimizedImagePattern = /\.(svg|gif)(?:$|\?)/i;
const materializedCatalogImagePattern = /-(?:cover|gallery-\d+)-([a-f0-9]{12,})(?:\.[a-z0-9]+)$/i;

export function isUnoptimizedImageSource(src: string) {
  return unoptimizedImagePattern.test(src);
}

export function getImageDedupeKey(src: string) {
  const normalizedSrc = src.trim();
  const pathWithoutQuery = normalizedSrc.split(/[?#]/)[0];
  const contentHash = pathWithoutQuery.match(materializedCatalogImagePattern)?.[1];

  return contentHash ? `catalog-content:${contentHash}` : normalizedSrc;
}

export function uniqueImageSources(images: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const image of images) {
    const normalizedImage = image?.trim();

    if (!normalizedImage) {
      continue;
    }

    const key = getImageDedupeKey(normalizedImage);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalizedImage);
  }

  return result;
}
