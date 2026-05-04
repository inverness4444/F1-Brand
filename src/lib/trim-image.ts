"use client";

const trimmedImageCache = new Map<string, Promise<string>>();

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

function sampleBackgroundColor(data: Uint8ClampedArray, width: number, height: number) {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  const total = points.reduce<Rgba>(
    (result, [x, y]) => {
      const index = (y * width + x) * 4;
      result.r += data[index] ?? 0;
      result.g += data[index + 1] ?? 0;
      result.b += data[index + 2] ?? 0;
      result.a += data[index + 3] ?? 0;
      return result;
    },
    { r: 0, g: 0, b: 0, a: 0 },
  );

  return {
    r: total.r / points.length,
    g: total.g / points.length,
    b: total.b / points.length,
    a: total.a / points.length,
  };
}

function isBackgroundPixel(data: Uint8ClampedArray, pixelIndex: number, background: Rgba) {
  const red = data[pixelIndex] ?? 0;
  const green = data[pixelIndex + 1] ?? 0;
  const blue = data[pixelIndex + 2] ?? 0;
  const alpha = data[pixelIndex + 3] ?? 0;

  if (background.a <= 20 && alpha <= 20) {
    return true;
  }

  const alphaDelta = Math.abs(alpha - background.a);
  const colorDelta = Math.abs(red - background.r) + Math.abs(green - background.g) + Math.abs(blue - background.b);

  return alphaDelta <= 28 && colorDelta <= 54;
}

function buildTrimmedImage(src: string) {
  return (async () => {
    if (!src) {
      return src;
    }

    const image = await loadImage(src);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > 1400 ? 1400 / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return src;
    }

    context.drawImage(image, 0, 0, width, height);

    let imageData: ImageData;

    try {
      imageData = context.getImageData(0, 0, width, height);
    } catch {
      return src;
    }

    const { data } = imageData;
    const background = sampleBackgroundColor(data, width, height);
    const visited = new Uint8Array(width * height);
    const queue = new Uint32Array(width * height);
    let queueStart = 0;
    let queueEnd = 0;

    const enqueue = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
      }

      const index = y * width + x;
      if (visited[index]) {
        return;
      }

      const pixelIndex = index * 4;
      if (!isBackgroundPixel(data, pixelIndex, background)) {
        return;
      }

      visited[index] = 1;
      queue[queueEnd] = index;
      queueEnd += 1;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    while (queueStart < queueEnd) {
      const index = queue[queueStart] ?? 0;
      queueStart += 1;

      const x = index % width;
      const y = Math.floor(index / width);

      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }

    let hasTransparentBackground = false;

    for (let index = 0; index < visited.length; index += 1) {
      if (!visited[index]) {
        continue;
      }

      const alphaIndex = index * 4 + 3;
      if ((data[alphaIndex] ?? 0) === 0) {
        continue;
      }

      data[alphaIndex] = 0;
      hasTransparentBackground = true;
    }

    if (hasTransparentBackground) {
      context.putImageData(imageData, 0, 0);
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (visited[index]) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      return src;
    }

    const padding = Math.max(8, Math.round(Math.min(width, height) * 0.035));
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

    if (!hasTransparentBackground && cropWidth >= width * 0.98 && cropHeight >= height * 0.98) {
      return src;
    }

    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = cropWidth;
    trimmedCanvas.height = cropHeight;

    const trimmedContext = trimmedCanvas.getContext("2d");
    if (!trimmedContext) {
      return src;
    }

    trimmedContext.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    try {
      return trimmedCanvas.toDataURL("image/png");
    } catch {
      return src;
    }
  })().catch(() => src);
}

export function trimImageForProductCard(src: string) {
  const cached = trimmedImageCache.get(src);
  if (cached) {
    return cached;
  }

  const nextValue = buildTrimmedImage(src);
  trimmedImageCache.set(src, nextValue);
  return nextValue;
}
