(function () {
    "use strict";

    // History stack to track visited passages
    const historyStack = [];

    // Initialize navigation and passage rendering
    document.addEventListener("DOMContentLoaded", () => {
        const passages = extractPassages();
        initializeNavigation(passages);
    });

    // Function to extract passages from the DOM
    function extractPassages() {
        const storyData = document.querySelector("storydata");
        if (!storyData) {
            console.error("No <storydata> element found in the DOM.");
            return {};
        }

        const passageElements = storyData.querySelectorAll("passagedata");
        const passages = {};

        passageElements.forEach((passage) => {
            const name = passage.getAttribute("name");
            const pid = passage.getAttribute("pid");
            const content = passage.innerHTML.trim();

            if (name && pid) {
                passages[name] = {
                    pid: pid,
                    content: content,
                };
            }
        });

        return passages;
    }

    // Function to initialize navigation
    function initializeNavigation(passages) {
        // Automatically handle Twine-style links ([[link]])
        document.body.addEventListener("click", (event) => {
            const target = event.target;

            // Check if the clicked element is a Twine-style link
            if (target.tagName === "A" && target.dataset.passage) {
                const passageName = target.dataset.passage;
                navigateToPassage(passageName, passages);
                event.preventDefault();
            }
        });

        // Attach functionality to the back button
        const backButton = document.querySelector("#backArrow a");
        if (backButton) {
            backButton.addEventListener("click", (event) => {
                event.preventDefault();
                navigateBack(passages);
            });
        }
    }

    // Function to navigate to a specific passage
    function navigateToPassage(passageName, passages) {
        const storyContainer = document.querySelector("story");

        if (!passages[passageName]) {
            console.error(`Passage "${passageName}" not found.`);
            return;
        }

        if (storyContainer) {
            // Push the current passage to the history stack
            const currentPassage = storyContainer.getAttribute("data-current-passage");
            if (currentPassage) {
                historyStack.push(currentPassage);
            }

            // Update the story container with the new passage content
            const passage = passages[passageName];
            storyContainer.innerHTML = passage.content;
            storyContainer.setAttribute("data-current-passage", passageName);

            // Reinitialize any scripts or behaviors specific to the new passage
            reinitializePassageScripts(passageName);
        } else {
            console.error("No <story> container found in the DOM.");
        }
    }

    // Function to navigate back to the previous passage
    function navigateBack(passages) {
        if (historyStack.length === 0) {
            console.warn("No previous passage in history.");
            return;
        }

        const previousPassageName = historyStack.pop();
        navigateToPassage(previousPassageName, passages);
    }

    // Function to reinitialize scripts for specific passages
    function reinitializePassageScripts(passageName) {
        // No need to handle specific scripts here since they are already in the .md file
        console.log(`Reinitialized passage: ${passageName}`);
    }
})();