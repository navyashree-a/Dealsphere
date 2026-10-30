// Turns a photo chosen from the device into a small square profile picture.
// Everything happens in the browser: the image is centre-cropped, scaled down
// and re-encoded as a data URL. Nothing is uploaded (there is no backend).

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const OUTPUT_SIZE = 320;

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

// Resolves with a JPEG data URL, or rejects with a customer-friendly message.
export async function prepareAvatar(file) {
  if (!file) throw new Error("No photo was selected.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file, such as a JPG, PNG or WebP photo.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That photo is larger than 15 MB. Please choose a smaller one.");
  }

  const url = URL.createObjectURL(file);
  try {
    let image;
    try {
      image = await loadImage(url);
    } catch {
      throw new Error("This photo couldn't be opened. Try a JPG or PNG instead (HEIC photos may not be supported in this browser).");
    }

    // Centre-crop to a square, then scale to OUTPUT_SIZE.
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
