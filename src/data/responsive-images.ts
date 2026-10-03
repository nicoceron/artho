import generated from "./responsive-images.generated.json";

interface ResponsiveVariant {
  src: string;
  width: number;
}

interface ResponsiveImage {
  sourceSha256: string;
  width: number;
  height: number;
  variants: ResponsiveVariant[];
}

const images = generated as Record<string, ResponsiveImage>;

export function responsiveImage(source: string) {
  const image = images[source];
  if (!image) throw new Error(`Missing responsive image variants for ${source}`);

  return {
    src: source,
    srcset: [...image.variants, { src: source, width: image.width }]
      .map(({ src, width }) => `${src} ${width}w`)
      .join(", "),
    width: image.width,
    height: image.height,
  };
}
