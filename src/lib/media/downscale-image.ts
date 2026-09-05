const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.8;

/**
 * Shrinks a photo from the camera to something worth sending: a phone picture
 * is several megabytes, the API refuses anything past a few, and the model
 * charges the same tokens for a large image as for a small one. Always answers
 * a JPEG data URL, whatever went in.
 */
export const downscaleImage = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');

  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('canvas unavailable');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
};
