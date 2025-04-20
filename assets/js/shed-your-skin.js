(function () {
    "use strict";

    // Ensure the Twine engine's navigation functions are globally accessible
    require(["engine"], function (engine) {
        // Expose navigation functions globally
        window.goBack = engine.goBack;
        window.goToPassage = engine.goToPassage;
    });

    // Custom logic for specific passages
    document.addEventListener("DOMContentLoaded", () => {
        // Handle custom behavior for the "sheddings.js" passage
        const terminalContainer = document.getElementById("terminalContainer");
        if (terminalContainer) {
            initializeSheddingTerminal(terminalContainer);
        }

        // Handle custom behavior for the "all the stories that follow.js" passage
        const storyContainer = document.getElementById("storyContainer");
        if (storyContainer) {
            initializeStoryInteraction(storyContainer);
        }

        // Handle custom behavior for the "breathe.js" passage
        const breathContainer = document.getElementById("breathContainer");
        if (breathContainer) {
            initializeBreathingAnimation(breathContainer);
        }
    });

    // Function to initialize the shedding terminal
    function initializeSheddingTerminal(container) {
        const promptForInput = () => {
            const prompt = document.createElement("div");
            prompt.innerHTML = `<span>> </span><input type="text" id="intentionInput" autofocus>`;
            container.appendChild(prompt);

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
                container.appendChild(line);
                container.scrollTop = container.scrollHeight;
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

        container.innerHTML = `<div>what do you want to shed?</div>`;
        promptForInput();
    }

    // Function to initialize story interaction
    function initializeStoryInteraction(container) {
        const gentleWhisperInYourEar = () => {
            const question = document.createElement("div");
            question.textContent = "you are not the first to ask this question.";
            container.appendChild(question);

            const prompt = document.createElement("div");
            prompt.innerHTML = `remember this memory again? [y/n] <input type="text" id="responseInput" autofocus>`;
            container.appendChild(prompt);

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
                container.appendChild(farewell);
            } else {
                const thirdPath = document.createElement("div");
                thirdPath.textContent = "you are courageous to take the third path.";
                container.appendChild(thirdPath);
            }
        };

        gentleWhisperInYourEar();
    }

    // Function to initialize breathing animation
    function initializeBreathingAnimation(container) {
        const YOUR_HEARTBEAT = [300, 800];
        const YOUR_PACE = 10;

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
                container.textContent += conduit.repeat(i) + "\n";
                container.scrollTop = container.scrollHeight;
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