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

/**
 * Fetches multiple meta tag contents at once.
 * @param {Object} metaTagMap - { key: metaTagName }
 * @returns {Object} - { key: metaTagContent }
 */
export function getMetaContents(metaTagMap) {
  const result = {};
  for (const [key, metaTagName] of Object.entries(metaTagMap)) {
    result[key] = getMetaContent(metaTagName);
  }
  return result;
}

/**
 * Loads multiple JSON resources based on a mapping of keys to meta tag names
 * @param {Object} metaTagMap
 * @returns {Promise<Object>}
 */
export async function loadResources(metaTagMap) {
  const entries = await Promise.all(
    Object.entries(metaTagMap).map(async ([key, metaTag]) => {
      const path = getMetaContent(metaTag);
      if (!path) {
        throw new Error(`Missing meta tag: ${metaTag}`);
      }
      const data = await loadJSON(path);
      return [key, data];
    })
  );
  return Object.fromEntries(entries);
}