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
 * Fetches HTML content from the provided URLs and inserts it into the specified selectors in the document.
 * @param {Object} partials - An object where keys are selectors and values are URLs to fetch HTML from.
 */
export async function injectPartials(partials) {
    try {
        const entries = Object.entries(partials);
        const fetches = await Promise.all(
            entries.map(([_, url]) => fetch(url).then(res => res.text()))
        );

        entries.forEach(([selector, _], i) => {
            const html = fetches[i];
            const target = selector === 'head'
                ? document.head
                : document.querySelector(selector);

            if (target) {
                target.insertAdjacentHTML('beforeend', html);
            } else {
                console.warn(`Target "${selector}" not found for partial.`);
            }
        });
    } catch (err) {
        console.error("Error injecting partials:", err);
    }
}