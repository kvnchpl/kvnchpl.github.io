import { fetchJSON, normalizePath } from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.fetchJSON !== "function") {
        console.error("fetchJSON not found on window.");
        return;
    }

    const nav = document.getElementById("site-nav");
    nav.innerHTML = "";

    try {
        const data = await window.fetchJSON("index-data", []);

        const currentPath = window.location.pathname.replace(/\/+$/, "");

        const navItems = data.filter(item => !item.isTitle);

        navItems.forEach((item, index) => {
            const a = document.createElement("a");
            a.href = item.permalink;
            a.textContent = item.title;

            if (item.external) {
                a.target = item.newTab === false ? "_self" : "_blank";
                a.rel = "noopener noreferrer";
            }

            const normalizedPermalink = item.permalink.replace(/\/+$/, "");
            if (normalizedPermalink === currentPath) {
                a.classList.add("current");
                a.textContent = `*${item.title}*`;
            }

            nav.appendChild(a);
            if (index < navItems.length - 1) {
                const sep = document.createElement("span");
                sep.textContent = "/";
                nav.appendChild(sep);
            }
        });
    } catch (error) {
        console.error("Failed to load navigation:", error);
    }
});