/**
 * Loads a JSON file and returns its contents
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function loadJSON(path) {
  const res = await fetch(path);
  return await res.json();
}