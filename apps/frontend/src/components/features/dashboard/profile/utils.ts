import type { Area } from "react-easy-crop";

/**
 * Crops an image given its source URL and cropping parameters, returning a Blob of the cropped image in WebP format.
 * @param imageSrc The source URL of the image to be cropped. This can be a data URL or an object URL created from a File.
 * @param pixelCrop The cropping parameters in pixel coordinates.
 * @param outputSize The size of the output image in pixels.
 * @returns A Promise resolving to a Blob containing the cropped image in WebP format.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 256,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      0.85,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}
