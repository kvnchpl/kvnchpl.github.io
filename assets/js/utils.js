export const isMobileDevice = () => window.innerWidth <= 768;

export const logError = (message, context = {}) => console.error(message, context);

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

export const settleFetch = async (entries) => {
    const results = await Promise.allSettled(entries.map(([key, fallback]) => fetchJSON(key, fallback)));
    return entries.reduce((acc, [key, fallback], i) => {
        acc[key] = results[i].status === "fulfilled" ? results[i].value : fallback;
        return acc;
    }, {});
};

export const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export const normalizePath = (permalink) => permalink.replace(/^\/|\/$/g, "") || "index";
