const unoptimizedImagePattern = /\.(svg|gif)(?:$|\?)/i;

export function isUnoptimizedImageSource(src: string) {
  return unoptimizedImagePattern.test(src);
}
