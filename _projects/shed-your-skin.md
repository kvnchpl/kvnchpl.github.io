---
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
    <tw-story><noscript><tw-noscript>JavaScript needs to be enabled to play shed your
                skin.</tw-noscript></noscript></tw-story>
    <tw-storydata name="shed your skin" startnode="1" creator="Twine" creator-version="2.10.0" format="Harlowe"
        format-version="3.3.9" ifid="8CF19DB7-183D-4DFC-9D35-17A1997CD2FA" options="" tags="" zoom="1" hidden>
        <tw-passagedata pid="1" name="shed your skin" tags="" position="600,300" size="100,100">
            &#39;&#39;shed your skin&#39;&#39;
            &lt;pre&gt;
            [[can you see yourself.txt]]
            [[not like a snake but an old ringing bell.txt]]
            [[sheddings.js]]
            [[all halls lead here &gt;]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="2" name="all halls lead here &gt;" tags=""
            position="800,675" size="100,100">&lt;pre&gt;
            [[overlapping overlapping.txt]]
            [[the breath &gt;]]
            [[the ghost &gt;]]
            [[the guardian &gt;]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="3" name="the breath &gt;" tags="" position="1000,800"
            size="100,100">&lt;pre&gt;
            [[in other words a script.txt]]
            [[the rhythm of your presence.txt]]
            [[dont forget to breathe &gt;]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="4" name="the ghost &gt;" tags="" position="1000,1300"
            size="100,100">&lt;pre&gt;
            [[all the stories that follow.js]]
            [[before birth after death.txt]]
            [[sometimes its more you than you.txt]]
            [[small routines &gt;]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="5" name="the guardian &gt;" tags="" position="1000,2050"
            size="100,100">&lt;pre&gt;
            [[and yet we were all born within.txt]]
            [[are you my teacher.txt]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="6" name="dont forget to breathe &gt;" tags=""
            position="1200,1050" size="100,100">&lt;pre&gt;
            [[breathe.js]]
            [[wind hall.txt]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="7" name="can you see yourself.txt" tags=""
            position="800,300" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="8" name="not like a snake but an old ringing bell.txt"
            tags="" position="800,425" size="100,100">&lt;pre&gt;
            `
            /
            / / / /
            the skin the skin the skin / / /
            glowing with loud impossibilities
            / / / / / / /
            /
            `
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="9" name="sheddings.js" tags="" position="800,550"
            size="100,100">&lt;!DOCTYPE html&gt;
            &lt;html lang=&quot;en&quot;&gt;

            &lt;head&gt;
            &lt;meta charset=&quot;UTF-8&quot;&gt;
            &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;
            &lt;title&gt;sheddings.js&lt;/title&gt;
            &lt;style&gt;
            body {
            font-family: monospace;
            margin: 0;
            overflow-y: auto;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            height: 100vh;
            background: black;
            color: white;
            }

            #terminalContainer {
            text-align: left;
            font-size: 1.5em;
            line-height: 1.5;
            white-space: pre;
            padding: 1em;
            width: auto;
            max-width: 100%;
            }

            #intentionInput {
            border: none;
            background: transparent;
            color: inherit;
            font-family: inherit;
            font-size: 1em;
            outline: none;
            width: auto;
            }
            &lt;/style&gt;
            &lt;/head&gt;

            &lt;body&gt;
            &lt;div id=&quot;terminalContainer&quot;&gt;
            &lt;label for=&quot;intentionInput&quot;&gt;what do you want to shed?&lt;/label&gt;
            &lt;div id=&quot;terminalPrompt&quot;&gt;
            &lt;span&gt;&gt; &lt;/span&gt;
            &lt;input type=&quot;text&quot; id=&quot;intentionInput&quot; autofocus&gt;
            &lt;/div&gt;
            &lt;/div&gt;

            &lt;script&gt;
            (() =&gt; {
            const terminalContainer = document.getElementById(&quot;terminalContainer&quot;);

            const promptForInput = () =&gt; {
            const prompt = document.createElement(&quot;div&quot;);
            prompt.innerHTML = `&lt;span&gt;&gt; &lt;/span&gt;&lt;input type=&quot;text&quot;
            id=&quot;intentionInput&quot; autofocus&gt;`;
            terminalContainer.appendChild(prompt);

            const terminalInput = prompt.querySelector(&quot;#intentionInput&quot;);
            terminalInput.addEventListener(&quot;keydown&quot;, (event) =&gt; {
            if (event.key === &quot;Enter&quot;) {
            event.preventDefault();
            handleInput(terminalInput.value.trim(), prompt);
            }
            });

            terminalInput.focus();
            };

            const handleInput = (intention, prompt) =&gt; {
            if (!intention) return;

            const terminalInput = prompt.querySelector(&quot;#intentionInput&quot;);
            terminalInput.disabled = true;

            const skin = intention.split(&#39;&#39;);
            let sheddable = skin.map((char, i) =&gt; (char !== &#39; &#39; ? i : null)).filter(i =&gt; i !== null);

            const displaySkin = () =&gt; {
            const line = document.createElement(&quot;div&quot;);
            line.textContent = skin.join(&#39;&#39;);
            terminalContainer.appendChild(line);
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            };

            const shedSkin = () =&gt; {
            if (!sheddable.length) return;
            const fate = Math.floor(Math.random() * sheddable.length);
            const choice = sheddable[fate];
            skin[choice] = skin[choice] === &quot;|&quot; ? &quot;!&quot; : skin[choice] === &quot;!&quot; ?
            &quot;.&quot; : &quot;|&quot;;
            if (skin[choice] === &quot;.&quot;) sheddable.splice(fate, 1);
            displaySkin();
            setTimeout(shedSkin, 500);
            };

            displaySkin();
            setTimeout(shedSkin, 1000);
            };

            terminalContainer.innerHTML = `&lt;div&gt;what do you want to shed?&lt;/div&gt;`;
            promptForInput();
            })();
            &lt;/script&gt;
            &lt;/body&gt;

            &lt;/html&gt;</tw-passagedata><tw-passagedata pid="10" name="overlapping overlapping.txt" tags=""
            position="1000,675" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="11" name="in other words a script.txt" tags=""
            position="1200,800" size="100,100">&lt;pre&gt;
            `
            /////////
            /// //// // //// //// /// ///////// //// [space]
            the rest of your life and (nothing) more
            how many breaths?
            /// //// ////////
            ////////
            `
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="12" name="the rhythm of your presence.txt" tags=""
            position="1200,925" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="13" name="all the stories that follow.js" tags=""
            position="1200,1300" size="100,100">&lt;!DOCTYPE html&gt;
            &lt;html lang=&quot;en&quot;&gt;

            &lt;head&gt;
            &lt;meta charset=&quot;UTF-8&quot;&gt;
            &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;
            &lt;title&gt;all the stories that follow.js&lt;/title&gt;
            &lt;style&gt;
            body {
            font-family: monospace;
            margin: 0;
            overflow-y: auto;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            height: 100vh;
            background: black;
            color: white;
            }

            #storyContainer {
            text-align: left;
            font-size: 1.5em;
            line-height: 1.5;
            white-space: pre;
            padding: 1em;
            width: auto;
            max-width: 100%;
            }

            #responseInput {
            border: none;
            background: transparent;
            color: inherit;
            font-family: inherit;
            font-size: 1em;
            outline: none;
            width: auto;
            }
            &lt;/style&gt;
            &lt;/head&gt;

            &lt;body&gt;
            &lt;div id=&quot;storyContainer&quot;&gt;&lt;/div&gt;

            &lt;script&gt;
            (() =&gt; {
            const storyContainer = document.getElementById(&quot;storyContainer&quot;);

            const gentleWhisperInYourEar = () =&gt; {
            const question = document.createElement(&quot;div&quot;);
            question.textContent = &quot;you are not the first to ask this question.&quot;;
            storyContainer.appendChild(question);

            const prompt = document.createElement(&quot;div&quot;);
            prompt.innerHTML = `remember this memory again? [y/n] &lt;input type=&quot;text&quot;
            id=&quot;responseInput&quot; autofocus&gt;`;
            storyContainer.appendChild(prompt);

            const responseInput = prompt.querySelector(&quot;#responseInput&quot;);
            responseInput.addEventListener(&quot;keydown&quot;, (event) =&gt; {
            if (event.key === &quot;Enter&quot;) {
            event.preventDefault();
            handleResponse(responseInput.value.trim().toLowerCase(), prompt);
            }
            });

            responseInput.focus();
            };

            const handleResponse = (choice, prompt) =&gt; {
            prompt.querySelector(&quot;#responseInput&quot;).disabled = true;

            if (choice === &quot;y&quot; || choice === &quot;yes&quot;) {
            gentleWhisperInYourEar();
            } else if (choice === &quot;n&quot; || choice === &quot;no&quot;) {
            const farewell = document.createElement(&quot;div&quot;);
            farewell.textContent = &quot;may you find more selves in the memories you choose to keep.&quot;;
            storyContainer.appendChild(farewell);
            } else {
            const thirdPath = document.createElement(&quot;div&quot;);
            thirdPath.textContent = &quot;you are courageous to take the third path.&quot;;
            storyContainer.appendChild(thirdPath);
            }
            };

            gentleWhisperInYourEar();
            })();
            &lt;/script&gt;
            &lt;/body&gt;

            &lt;/html&gt;</tw-passagedata><tw-passagedata pid="14" name="before birth after death.txt" tags=""
            position="1200,1425" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="15" name="sometimes its more you than you.txt" tags=""
            position="1200,1550" size="100,100">&lt;pre&gt;
            `
            / / / / / / / / / / / / / / / / / /
            / often / the sum of everything /
            / you know / it makes you laugh /
            / / / / / / / / / / / / / / / / / /
            `
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="16" name="small routines &gt;" tags=""
            position="1200,1675" size="100,100">&lt;pre&gt;
            [[anytime.txt]]
            [[that crucial moment.txt]]
            [[thursday.txt]]
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="17" name="breathe.js" tags="" position="1400,1050"
            size="100,100">&lt;!DOCTYPE html&gt;
            &lt;html lang=&quot;en&quot;&gt;

            &lt;head&gt;
            &lt;meta charset=&quot;UTF-8&quot;&gt;
            &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;
            &lt;title&gt;breathe.js&lt;/title&gt;
            &lt;style&gt;
            body {
            font-family: monospace;
            margin: 0;
            overflow-y: auto;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            height: 100vh;
            background: black;
            color: white;
            }

            #breathContainer {
            text-align: left;
            font-size: 1.5em;
            line-height: 1.2;
            white-space: pre;
            padding: 1em;
            }
            &lt;/style&gt;
            &lt;/head&gt;

            &lt;body&gt;
            &lt;div id=&quot;breathContainer&quot;&gt;&lt;/div&gt;

            &lt;script&gt;
            (() =&gt; {
            const YOUR_HEARTBEAT = [300, 800];
            const YOUR_PACE = 10;
            const breathContainer = document.getElementById(&quot;breathContainer&quot;);

            const guideWind = async (phase) =&gt; {
            let conduit, start, end, step;

            switch (phase) {
            case &quot;draw_in&quot;:
            conduit = &quot;&gt;&quot;;
            start = 1;
            end = YOUR_PACE;
            step = 1;
            break;
            case &quot;stillness&quot;:
            conduit = &quot;=&quot;;
            start = YOUR_PACE;
            end = YOUR_PACE;
            step = 0;
            break;
            case &quot;let_out&quot;:
            conduit = &quot;&lt;&quot;;
            start = YOUR_PACE;
            end = 1;
            step = -1;
            break;
            }

            for (let i = start, moment = 0; step === 0 ? moment &lt; YOUR_PACE : i !== end + step; i += step, moment++)
            {
            breathContainer.textContent += conduit.repeat(i) + &quot;\n&quot;;
            breathContainer.scrollTop = breathContainer.scrollHeight;
            await new Promise((resolve) =&gt; setTimeout(resolve, YOUR_HEARTBEAT[moment % YOUR_HEARTBEAT.length]));
            }
            };

            (async () =&gt; {
            await new Promise((resolve) =&gt; setTimeout(resolve, 1000));
            await guideWind(&quot;draw_in&quot;);
            await guideWind(&quot;stillness&quot;);
            await guideWind(&quot;let_out&quot;);
            await new Promise((resolve) =&gt; setTimeout(resolve, 1000));
            })();
            })();
            &lt;/script&gt;
            &lt;/body&gt;

            &lt;/html&gt;</tw-passagedata><tw-passagedata pid="18" name="wind hall.txt" tags="" position="1400,1175"
            size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="19" name="anytime.txt" tags="" position="1400,1675"
            size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="20" name="that crucial moment.txt" tags=""
            position="1400,1800" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="21" name="thursday.txt" tags="" position="1400,1925"
            size="100,100">&lt;pre&gt;
            `
            / / / / / / / / / / / / / / / / / / / / / / /
            / it’s another thursday it’s every thursday /
            / / / / / / / / / / / / / / / / / / / / / / /
            `
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="22" name="and yet we were all born within.txt" tags=""
            position="1200,2050" size="100,100">&lt;pre&gt;
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
            &lt;/pre&gt;</tw-passagedata><tw-passagedata pid="23" name="are you my teacher.txt" tags=""
            position="1200,2175" size="100,100">&lt;pre&gt;
            `
            ///////////////////////////////////////////////////
            who will dissolve me? ask for what you already have
            ///////////////////////////////////////////////////
            `
            &lt;/pre&gt;</tw-passagedata>
    </tw-storydata>
    <script src="/assets/js/shed-your-skin.js"></script>

</body>

</html>