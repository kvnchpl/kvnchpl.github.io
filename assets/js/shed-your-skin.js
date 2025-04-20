(function () {
    "use strict";

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
    }

    // Function to navigate to a specific passage
    function navigateToPassage(passageName, passages) {
        if (!passages[passageName]) {
            console.error(`Passage "${passageName}" not found.`);
            return;
        }

        const passage = passages[passageName];
        const storyContainer = document.querySelector("story");

        if (storyContainer) {
            storyContainer.innerHTML = passage.content;

            // Reinitialize any scripts or behaviors specific to the new passage
            reinitializePassageScripts(passageName);
        } else {
            console.error("No <story> container found in the DOM.");
        }
    }

    // Function to reinitialize scripts for specific passages
    function reinitializePassageScripts(passageName) {
        if (passageName === "sheddings.js") {
            initializeSheddingsScript();
        } else if (passageName === "all the stories that follow.js") {
            initializeStoriesScript();
        } else if (passageName === "breathe.js") {
            initializeBreathingScript();
        }
    }

    // Script for "sheddings.js"
    function initializeSheddingsScript() {
        const terminalContainer = document.getElementById("terminalContainer");

        const promptForInput = () => {
            const prompt = document.createElement("div");
            prompt.innerHTML = `<span>> </span><input type="text" id="intentionInput" autofocus>`;
            terminalContainer.appendChild(prompt);

            const terminalInput = prompt.querySelector("#intentionInput");
            terminalInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleInput(terminalInput.value.trim(), prompt);
                }
            });

            terminalInput.focus();
        };

        const handleInput = (intention, prompt) => {
            if (!intention) return;

            const terminalInput = prompt.querySelector("#intentionInput");
            terminalInput.disabled = true;

            const skin = intention.split('');
            let sheddable = skin.map((char, i) => (char !== ' ' ? i : null)).filter(i => i !== null);

            const displaySkin = () => {
                const line = document.createElement("div");
                line.textContent = skin.join('');
                terminalContainer.appendChild(line);
                terminalContainer.scrollTop = terminalContainer.scrollHeight;
            };

            const shedSkin = () => {
                if (!sheddable.length) return;
                const fate = Math.floor(Math.random() * sheddable.length);
                const choice = sheddable[fate];
                skin[choice] = skin[choice] === "|" ? "!" : skin[choice] === "!" ? "." : "|";
                if (skin[choice] === ".") sheddable.splice(fate, 1);
                displaySkin();
                setTimeout(shedSkin, 500);
            };

            displaySkin();
            setTimeout(shedSkin, 1000);
        };

        terminalContainer.innerHTML = `<div>what do you want to shed?</div>`;
        promptForInput();
    }

    // Script for "all the stories that follow.js"
    function initializeStoriesScript() {
        const storyContainer = document.getElementById("storyContainer");

        const gentleWhisperInYourEar = () => {
            const question = document.createElement("div");
            question.textContent = "you are not the first to ask this question.";
            storyContainer.appendChild(question);

            const prompt = document.createElement("div");
            prompt.innerHTML = `remember this memory again? [y/n] <input type="text" id="responseInput" autofocus>`;
            storyContainer.appendChild(prompt);

            const responseInput = prompt.querySelector("#responseInput");
            responseInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleResponse(responseInput.value.trim().toLowerCase(), prompt);
                }
            });

            responseInput.focus();
        };

        const handleResponse = (choice, prompt) => {
            prompt.querySelector("#responseInput").disabled = true;

            if (choice === "y" || choice === "yes") {
                gentleWhisperInYourEar();
            } else if (choice === "n" || choice === "no") {
                const farewell = document.createElement("div");
                farewell.textContent = "may you find more selves in the memories you choose to keep.";
                storyContainer.appendChild(farewell);
            } else {
                const thirdPath = document.createElement("div");
                thirdPath.textContent = "you are courageous to take the third path.";
                storyContainer.appendChild(thirdPath);
            }
        };

        gentleWhisperInYourEar();
    }

    // Script for "breathe.js"
    function initializeBreathingScript() {
        const YOUR_HEARTBEAT = [300, 800];
        const YOUR_PACE = 10;
        const breathContainer = document.getElementById("breathContainer");

        const guideWind = async (phase) => {
            let conduit, start, end, step;

            switch (phase) {
                case "draw_in":
                    conduit = ">";
                    start = 1;
                    end = YOUR_PACE;
                    step = 1;
                    break;
                case "stillness":
                    conduit = "=";
                    start = YOUR_PACE;
                    end = YOUR_PACE;
                    step = 0;
                    break;
                case "let_out":
                    conduit = "<";
                    start = YOUR_PACE;
                    end = 1;
                    step = -1;
                    break;
            }

            for (let i = start, moment = 0; step === 0 ? moment < YOUR_PACE : i !== end + step; i += step, moment++) {
                breathContainer.textContent += conduit.repeat(i) + "\n";
                breathContainer.scrollTop = breathContainer.scrollHeight;
                await new Promise((resolve) => setTimeout(resolve, YOUR_HEARTBEAT[moment % YOUR_HEARTBEAT.length]));
            }
        };

        (async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await guideWind("draw_in");
            await guideWind("stillness");
            await guideWind("let_out");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        })();
    }
})();