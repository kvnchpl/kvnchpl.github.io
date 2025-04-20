(function () {
    "use strict";

    // Ensure the Twine engine's navigation functions are globally accessible
    require(["engine"], function (engine) {
        // Expose navigation functions globally
        window.goBack = engine.goBack;
        window.goToPassage = engine.goToPassage;
    });

    // Initialize navigation and passage rendering
    document.addEventListener("DOMContentLoaded", () => {
        initializeNavigation();
    });

    // Function to initialize navigation
    function initializeNavigation() {
        // Automatically handle Twine-style links ([[link]])
        document.body.addEventListener("click", (event) => {
            const target = event.target;

            // Check if the clicked element is a Twine-style link
            if (target.tagName === "A" && target.dataset.passage) {
                const passageName = target.dataset.passage;
                navigateToPassage(passageName);
                event.preventDefault();
            }
        });
    }

    // Function to navigate to a specific passage
    function navigateToPassage(passageName) {
        if (typeof window.goToPassage === "function") {
            window.goToPassage(passageName);
        } else {
            console.error(`Navigation to passage "${passageName}" failed. Function goToPassage is not available.`);
        }
    }
})();