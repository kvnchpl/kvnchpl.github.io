/**
 * Returns an array of generated image objects
 * @param {string} folder - Folder path like "img/triptych/medium"
 * @param {string} prefix - Filename prefix like "triptych_"
 * @param {string} ext - File extension like ".webp"
 * @param {number} count - Number of images to generate
 * @returns {Array<{ filename: string, path: string }>}
 */
export function generateGalleryImages(folder, prefix, ext, count) {
  const padded = (i) => i.toString().padStart(1, "0"); // change to 2 if needed
  return Array.from({ length: count }, (_, i) => {
    const filename = `${prefix}${padded(i + 1)}${ext}`;
    return {
      filename,
      path: `${folder}/${filename}`
    };
  });
}

/**
 * Loads a JSON file and returns its contents
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function loadJSON(path) {
  const res = await fetch(path);
  return await res.json();
}