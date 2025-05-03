import { fetchJSON, normalizePath } from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nav = document.getElementById("site-nav");
    nav.innerHTML = "";

    try {
        const data = await fetchJSON("index-data", []);

        const currentPath = normalizePath(window.location.pathname);

        const navItems = data.filter(item => !item.isTitle);

        navItems.forEach((item, index) => {
            const label = item.label || item.title;
            if (!label) return;

            const a = document.createElement("a");
            a.href = item.permalink;
            a.textContent = label;

            if (item.external) {
                a.target = item.newTab === false ? "_self" : "_blank";
                a.rel = "noopener noreferrer";
            }

            const normalizedPermalink = normalizePath(item.permalink);
            if (normalizedPermalink === currentPath) {
                a.classList.add("current");
                a.textContent = `*${label}*`;
            }

            nav.appendChild(a);
            if (index < navItems.length - 1) {
                const sep = document.createElement("span");
                sep.textContent = " / ";
                nav.appendChild(sep);
            }
        });
    } catch (error) {
        console.error("Failed to load navigation:", error);
    }
});