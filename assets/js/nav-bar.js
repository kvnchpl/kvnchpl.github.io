import { isMobileDevice, fetchJSON, normalizePath } from './utils.js';

(() => {

document.addEventListener("DOMContentLoaded", async () => {
    const nav = document.getElementById("site-nav");
    nav.innerHTML = "";

    try {
        const data = await fetchJSON("index-data", []);

        const currentPath = normalizePath(window.location.pathname);

        const navItems = data.filter(item => item.navBar);

        navItems.forEach((item, index) => {
            const label = item.label;

            const a = document.createElement("a");
            a.href = item.permalink;
            a.textContent = isMobileDevice() ? `/ ${label} /` : label;
            a.target = item.newTab ? "_blank" : "_self";

            if (item.external) {
                a.rel = "noopener noreferrer";
            }

            const normalizedPermalink = normalizePath(item.permalink);
            if (normalizedPermalink === currentPath) {
                a.classList.add("current");
                if (isMobileDevice()) {
                    a.textContent = `* ${label} *`;
                } else {
                    a.textContent = `*${label}*`;
                }
            }

            if (isMobileDevice()) {
                const container = document.createElement("div");
                container.appendChild(a);
                nav.appendChild(container);
            } else {
                nav.appendChild(a);
                if (index < navItems.length - 1) {
                    const sep = document.createElement("span");
                    sep.textContent = " / ";
                    nav.appendChild(sep);
                }
            }
        });
    } catch (error) {
        console.error("Failed to load navigation:", error);
    }
});

})();