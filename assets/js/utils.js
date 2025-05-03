/**
 * Detects if the current device is a mobile device based on screen width.
 * @returns {boolean} True if device is mobile, false otherwise.
 */
export const isMobileDevice = () => window.innerWidth <= 768;

/**
 * Logs an error message and optional context to the console.
 * @param {string} message - The error message.
 * @param {Object} [context={}] - Additional context for the error.
 */
export const logError = (message, context = {}) => console.error(message, context);

/**
 * Fetches JSON data from a meta tag-specified URL.
 * @param {string} key - The name of the meta tag containing the URL.
 * @param {*} [fallback=null] - The value to return if the fetch fails.
 * @returns {Promise<*>} A promise that resolves to the fetched JSON or fallback.
 */
export const fetchJSON = async (key, fallback = null) => {
    const url = document.querySelector(`meta[name='${key}']`)?.content;
    if (!url) {
        logError(`Meta tag with name '${key}' not found`);
        return fallback;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
        return await response.json();
    } catch (error) {
        logError(`Error loading '${key}': ${error.message}`);
        return fallback;
    }
};

/**
 * Performs multiple fetchJSON operations and returns a key-value map of results.
 * @param {[string, *][]} entries - An array of [metaTagKey, fallbackValue] tuples.
 * @returns {Promise<Object>} A map of resolved JSON values keyed by metaTagKey.
 */
export const settleFetch = async (entries) => {
    const results = await Promise.allSettled(entries.map(([key, fallback]) => fetchJSON(key, fallback)));
    return entries.reduce((acc, [key, fallback], i) => {
        acc[key] = results[i].status === "fulfilled" ? results[i].value : fallback;
        return acc;
    }, {});
};

/**
 * Creates a debounced version of a function.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

/**
 * Normalizes a permalink by stripping leading/trailing slashes.
 * @param {string} permalink - The URL path to normalize.
 * @returns {string} The normalized path, or "index" if empty.
 */
export const normalizePath = (permalink) => (permalink || "").replace(/^\/+|\/+$/g, "") || "index";