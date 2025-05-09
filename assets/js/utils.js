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
 * Checks if an object has all required keys.
 * @param {Object} obj - The object to check.
 * @param {string[]} keys - The array of required keys.
 * @returns {string[]} An array of missing keys.
 */
export const hasRequiredKeys = (obj, keys) =>
  keys.filter((key) => !obj.hasOwnProperty(key));

/**
 * Sorts an array of objects by year and month in descending order.
 * @param {Object} a - The first object to compare.
 * @param {Object} b - The second object to compare.
 * @returns {number} A negative number if a < b, zero if equal, or a positive number if a > b.
 */
export const sortByDateDescending = (a, b) => {
  const yearA = a.year || 0;
  const yearB = b.year || 0;
  const monthA = a.month || 0;
  const monthB = b.month || 0;

  return yearB !== yearA ? yearB - yearA : monthB - monthA;
};

/**
 * Creates a DOM element with a specified tag and class name.
 * @param {string} tag - The HTML tag to create.
 * @param {string} className - The class name to assign to the element.
 * @returns {HTMLElement} The created DOM element.
 */
export const createElementWithClass = (tag, className) => {
    const el = document.createElement(tag);
    el.className = className;
    return el;
};

/**
 * Creates a DOM element with a specified tag, class name, attributes, and children.
 * @param {string} tag - The HTML tag to create.
 * @param {Object} options - Options for the element.
 * @param {string} [options.className] - The class name to assign to the element.
 * @param {Object}
 * [options.attrs] - Attributes to set on the element.
 * @param {HTMLElement[]} [options.children] - Child elements to append.
 * @returns {HTMLElement} The created DOM element.
 */
export const createElement = (tag, { className, attrs = {}, children = [] } = {}) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
    });
    children.forEach(child => el.appendChild(child));
    return el;
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