/**
 * Loads a JSON file and returns its contents
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function loadJSON(path) {
  const res = await fetch(path);
  return await res.json();
}

/**
 * Retrieves the content value of a meta tag by its name
 * @param {string} name
 * @returns {string|null}
 */
export function getMetaContent(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el?.content || null;
}