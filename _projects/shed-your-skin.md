---
layout: default
permalink: /projects/shed-your-skin/
---

<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>shed your skin</title>
    <link rel="stylesheet" href="/assets/css/shed-your-skin.css">
</head>

<body>

    <story>
        <div id="backArrow" class="navigation">
            <a href="javascript:void(0)">← Back</a>
        </div>
        <noscript>
            <noscript>JavaScript needs to be enabled.</noscript>
        </noscript>
    </story>

    <storydata name="shed your skin" startnode="1" creator="Twine" creator-version="2.10.0" format="Harlowe"
        format-version="3.3.9" ifid="8CF19DB7-183D-4DFC-9D35-17A1997CD2FA" options="" tags="" zoom="1" hidden>
        <passagedata pid="1" name="shed your skin" tags="" position="600,300" size="100,100">
            <pre>
            [[can you see yourself.txt]]
            [[not like a snake but an old ringing bell.txt]]
            [[sheddings.js]]
            [[all halls lead here >]]
            </pre>
        </passagedata>
        <passagedata pid="2" name="all halls lead here >" tags="" position="800,675" size="100,100">
            <pre>
            [[overlapping overlapping.txt]]
            [[the breath >]]
            [[the ghost >]]
            [[the guardian >]]
            </pre>
        </passagedata>
        <passagedata pid="3" name="the breath >" tags="" position="1000,800" size="100,100">
            <pre>
            [[in other words a script.txt]]
            [[the rhythm of your presence.txt]]
            [[dont forget to breathe >]]
            </pre>
        </passagedata>
        <passagedata pid="4" name="the ghost >" tags="" position="1000,1300" size="100,100">
            <pre>
            [[all the stories that follow.js]]
            [[before birth after death.txt]]
            [[sometimes its more you than you.txt]]
            [[small routines >]]
            </pre>
        </passagedata>
        <passagedata pid="5" name="the guardian >" tags="" position="1000,2050" size="100,100">
            <pre>
            [[and yet we were all born within.txt]]
            [[are you my teacher.txt]]
            </pre>
        </passagedata>
        <passagedata pid="6" name="dont forget to breathe >" tags="" position="1200,1050" size="100,100">
            <pre>
            [[breathe.js]]
            [[wind hall.txt]]
            </pre>
        </passagedata>
        <passagedata pid="7" name="can you see yourself.txt" tags="" position="800,300" size="100,100">
            <pre>
            `
            // /
            // /
            it’s been a long time hasn’t it /
            the stench and softness of dew / clinging
            to you // sliding from you / / / /
            in sixteen directions / / /
            we never see with our eyes / first
            our muddied feet / / / / / /
            the smile you’ve been waiting for all day
            // / / /
            // /
            `
            </pre>
        </passagedata>
        <passagedata pid="8" name="not like a snake but an old ringing bell.txt" tags="" position="800,425"
            size="100,100">
            <pre>
            `
            /
            / / / /
            the skin the skin the skin / / /
            glowing with loud impossibilities
            / / / / / / /
            /
            `
            </pre>
        </passagedata>
        <passagedata pid="9" name="sheddings.js" tags="" position="800,550" size="100,100">
            <div id="terminalContainer">
                <label for="intentionInput">what do you want to shed?</label>
                <div id="terminalPrompt">
                    <span>> </span>
                    <input type="text" id="intentionInput" autofocus>
                </div>
            </div>
            <script>
                (() => {
                    const terminalContainer = document.getElementById("terminalContainer");

                    const promptForInput = () => {
                        const prompt = document.createElement("div");
                        prompt.innerHTML = `<span>> </span><input type="text"
            id="intentionInput" autofocus>`;
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
                            skin[choice] = skin[choice] === "|" ? "!" : skin[choice] === "!" ?
                                "." : "|";
                            if (skin[choice] === ".") sheddable.splice(fate, 1);
                            displaySkin();
                            setTimeout(shedSkin, 500);
                        };

                        displaySkin();
                        setTimeout(shedSkin, 1000);
                    };

                    terminalContainer.innerHTML = `<div>what do you want to shed?</div>`;
                    promptForInput();
                })();
            </script>
        </passagedata>
        <passagedata pid="10" name="overlapping overlapping.txt" tags="" position="1000,675" size="100,100">
            <pre>
            `
            / / / / / / / / ///
            / / / / / / / / ///
            this is where our trinities meet / / / / ///
            or rather they have already met / / / / ///
            when you learned that another / other / wasn’t / / ///
            you are a combination lock turning and turning and / / ///
            never meant to unlock and never meant to / / / ///
            settle on three numbers but it’s the turning / / ///
            it’s all happening outside your head / your daring ///
            invitations of love / to love in love / / ///
            / / / / / / / / ///
            / / / / / / / / ///
            `
            </pre>
        </passagedata>
        <passagedata pid="11" name="in other words a script.txt" tags="" position="1200,800" size="100,100">
            <pre>
            `
            /////////
            /// //// // //// //// /// ///////// //// [space]
            the rest of your life and (nothing) more
            how many breaths?
            /// //// ////////
            ////////
            `
            </pre>
        </passagedata>
        <passagedata pid="12" name="the rhythm of your presence.txt" tags="" position="1200,925" size="100,100">
            <pre>
            `
            ///// /// /// ///// /////// /// ////
            /// ///// /// /// ///// /////// /// //// //////// [time]
            new steps and old steps tracing the same patterns
            not a matter of surprise but /// //// ////////
            the calm quiet rehearsal of whispers
            at once ///// ///////// // //////// ////////
            // //// ///// ///////// // //////// ////////
            //// ///// ///////// // ////////
            `
            </pre>
        </passagedata>
        <passagedata pid="13" name="all the stories that follow.js" tags="" position="1200,1300" size="100,100">
            <div id="storyContainer"></div>
            <script>
                (() => {
                    const storyContainer = document.getElementById("storyContainer");

                    const gentleWhisperInYourEar = () => {
                        const question = document.createElement("div");
                        question.textContent = "you are not the first to ask this question.";
                        storyContainer.appendChild(question);

                        const prompt = document.createElement("div");
                        prompt.innerHTML = `remember this memory again? [y/n] <input type="text"
            id="responseInput" autofocus>`;
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
                })();
            </script>
        </passagedata>
        <passagedata pid="14" name="before birth after death.txt" tags="" position="1200,1425" size="100,100">
            <pre>
            `
            / /
            / / / / / /
            the doors the windows remember you before you knew your name /
            the bones crumbling deep underground remember your tragedies /
            the humid insomniac forest remembers the moment you became /
            the swirling prophets of day remember everything you forgot /
            the wild gestures remember when you needed a change / /
            just as you were about to speak you forgot the soft dream /
            you forgot you remember too / / / /
            / / / / / /
            / /
            `
            </pre>
        </passagedata>
        <passagedata pid="15" name="sometimes its more you than you.txt" tags="" position="1200,1550" size="100,100">
            <pre>
            `
            / / / / / / / / / / / / / / / / / /
            / often / the sum of everything /
            / you know / it makes you laugh /
            / / / / / / / / / / / / / / / / / /
            `
            </pre>
        </passagedata>
        <passagedata pid="16" name="small routines >" tags="" position="1200,1675" size="100,100">
            <pre>
            [[anytime.txt]]
            [[that crucial moment.txt]]
            [[thursday.txt]]
            </pre>
        </passagedata>
        <passagedata pid="17" name="breathe.js" tags="" position="1400,1050" size="100,100">
            <div id="breathContainer"></div>

            <script>
                (() => {
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
                })();
            </script>
        </passagedata>
        <passagedata pid="18" name="wind hall.txt" tags="" position="1400,1175" size="100,100">
            <pre>
            `
            / / / /
            / / / / /////
            resonance of stones / the stone split by
            the wind / your first breaths welcomed to the hall
            nothing stays long enough to grow stale
            always moving with expanse
            / feeling contraction without smallness
            this is divine registration
            your time is yours to begin
            / feeling duration and its certainty
            / / ////////
            / / /
            `
            </pre>
        </passagedata>
        <passagedata pid="19" name="anytime.txt" tags="" position="1400,1675" size="100,100">
            <pre>
            `
            /// ///
            /// /// ///
            /// /// /// we’re all on the phone ///
            unbreakable copy machine of silent sentences
            /// /// /// content with presence we don’t hang up
            /// lightning flashes across the earth ///
            gradually our breaths swim upstream ///
            /// /// /// ///
            /// /// ///
            `
            </pre>
        </passagedata>
        <passagedata pid="20" name="that crucial moment.txt" tags="" position="1400,1800" size="100,100">
            <pre>
            `
            / /
            ////////// / / / / / / /
            when everything / falls into /
            finally dreams of something new /
            petals leisurely sorting into piles ////////
            effervescent fantasy emerges from the singular
            out of the cave built / up and out
            up and out / up and out /
            // / / / / / / /
            / / /
            `
            </pre>
        </passagedata>
        <passagedata pid="21" name="thursday.txt" tags="" position="1400,1925" size="100,100">
            <pre>
            `
            / / / / / / / / / / / / / / / / / / / / / / /
            / it’s another thursday it’s every thursday /
            / / / / / / / / / / / / / / / / / / / / / / /
            `
            </pre>
        </passagedata>
        <passagedata pid="22" name="and yet we were all born within.txt" tags="" position="1200,2050" size="100,100">
            <pre>
            `
            / / / / / / / / / /
            / / / / / / / / / / / / / /
            none of us / without / / / / / / / / /
            even the unspeaking stone admonished by river run
            is a vessel / as it tossed itself about
            skies and mountains away / / / / / /
            it was never held it did not / / / / / /
            speak its soul unto the wind / / / / / /
            a life of chaos compressed to cold
            hollowness / the essence escaped
            / / / / / / / /
            / / / /
            `
            </pre>
        </passagedata>
        <passagedata pid="23" name="are you my teacher.txt" tags="" position="1200,2175" size="100,100">
            <pre>
            `
            ///////////////////////////////////////////////////
            who will dissolve me? ask for what you already have
            ///////////////////////////////////////////////////
            `
            </pre>
        </passagedata>
    </storydata>
    <script src="/assets/js/shed-your-skin.js"></script>

</body>

</html>