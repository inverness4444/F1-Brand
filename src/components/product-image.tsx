"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

import { isUnoptimizedImageSource } from "@/lib/image-utils";

type ProductImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
  onError?: ImageProps["onError"];
};

export function ProductImage({
  src,
  fallbackSrc,
  alt,
  unoptimized,
  onError,
  ...props
}: ProductImageProps) {
  const initialSrc = src || fallbackSrc || "";
  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc || "");
  }, [fallbackSrc, src]);

  if (!currentSrc) {
    return null;
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      unoptimized={unoptimized ?? isUnoptimizedImageSource(currentSrc)}
      onError={(event) => {
        onError?.(event);

        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
