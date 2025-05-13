(function () {
    "use strict";

    // History stack to track visited passages
    const historyStack = [];

    // Initialize navigation and passage rendering
    document.addEventListener("DOMContentLoaded", async () => {
        const { passages, startPid } = await extractPassagesFromJSON();
        initializeNavigation(passages);

        if (startPid && passages) {
            const startPassage = Object.entries(passages).find(([_, value]) => value.pid === startPid);
            if (startPassage) {
                const [name] = startPassage;
                navigateToPassage(name, passages);
            } else {
                console.error(`No passage found with pid=${startPid}`);
            }
        } else {
            console.error("Missing startnode or passages in story data.");
        }

        const hash = decodeURIComponent(location.hash.slice(1));
        if (hash && passages[hash]) {
            navigateToPassage(hash, passages);
        }

        window.addEventListener("hashchange", () => {
            const hash = decodeURIComponent(location.hash.slice(1));
            if (hash && passages[hash]) {
                navigateToPassage(hash, passages);
            }
        });
    });

    async function extractPassagesFromJSON() {
        try {
            const response = await fetch("/assets/data/shed-your-skin.json");
            if (!response.ok) throw new Error("Failed to fetch story JSON");
            const data = await response.json();
            const passages = {};
            data.passages.forEach((p) => {
                passages[p.name] = { pid: p.pid, content: p.content };
            });
            return { passages, startPid: data.startnode };
        } catch (error) {
            console.error("Error loading story JSON:", error);
            return { passages: {}, startPid: null };
        }
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

            const updateBackButtonState = () => {
                if (historyStack.length === 0) {
                    backButton.classList.add("disabled");
                } else {
                    backButton.classList.remove("disabled");
                }
            };
            updateBackButtonState();
        }
    }

    // Function to navigate to a specific passage
    function navigateToPassage(passageName, passages) {
        const storyContainer = document.getElementById("story");

        if (!passages[passageName]) {
            console.error(`Passage "${passageName}" not found.`);
            return;
        }

        if (storyContainer) {
            if (storyContainer.getAttribute("data-current-passage") === passageName) {
                return; // No need to re-render
            }

            // Push the current passage to the history stack
            const currentPassage = storyContainer.getAttribute("data-current-passage");
            if (currentPassage) {
                historyStack.push(currentPassage);
                const backButton = document.querySelector("#backArrow a");
                if (backButton) {
                    if (historyStack.length === 0) {
                        backButton.classList.add("disabled");
                    } else {
                        backButton.classList.remove("disabled");
                    }
                }
            }

            // Update the story container with the new passage content
            const passage = passages[passageName];
            storyContainer.innerHTML = passage.content;

            // Convert [[link]] syntax into clickable anchor elements
            storyContainer.innerHTML = storyContainer.innerHTML.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
                const [label, target] = linkText.split("|");
                const text = target ? label.trim() : linkText.trim();
                const passage = target ? target.trim() : linkText.trim();
                return `<a href="#" data-passage="${passage}">${text}</a>`;
            });

            storyContainer.setAttribute("data-current-passage", passageName);

            // Reinitialize any scripts or behaviors specific to the new passage
            reinitializePassageScripts(passageName);

            window.scrollTo({ top: 0, behavior: "smooth" });
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