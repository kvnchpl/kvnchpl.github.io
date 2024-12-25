const API_KEY = "15956897f6mshdc7a0f36187e559p17b488jsn49f99cb816a4";
const API_HOST = "lingua-robot.p.rapidapi.com";

let ipaOutput = ""; // Store the IPA transcription for further processing
let isAbjadView = false; // Track whether the Abjad view is currently active

const singleLetterIPA = {
    a: "eɪ", b: "biː", c: "siː", d: "diː", e: "iː", f: "ɛf", g: "d͡ʒiː",
    h: "eɪt͡ʃ", i: "aɪ", j: "d͡ʒeɪ", k: "keɪ", l: "ɛl", m: "ɛm", n: "ɛn",
    o: "oʊ", p: "piː", q: "kjuː", r: "ɑr", s: "ɛs", t: "tiː", u: "juː",
    v: "viː", w: "ˈdʌbəl.juː", x: "ɛks", y: "waɪ", z: "ziː"
};

function preprocessInput(text) {
    return text.match(/(\w+|-|[^\w\s])/g) || [];
}

function cleanIPA(ipaText) {
    const nonPhoneticSymbols = /[\/ˈˌ\[\]\(\)]/g;
    return ipaText.replace(nonPhoneticSymbols, '').trim();
}

async function fetchIPA(word, regionPreference) {
    // Preserve original case for the first search
    const originalWord = word;
    const lowercasedWord = word.toLowerCase();

    if (singleLetterIPA[lowercasedWord]) {
        return singleLetterIPA[lowercasedWord];
    }

    async function queryWord(targetWord) {
        const url = `https://${API_HOST}/language/v1/entries/en/${targetWord}`;
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": API_KEY,
                    "X-RapidAPI-Host": API_HOST
                }
            });
            const data = await response.json();
            console.log(`API Response for "${targetWord}":`, data);

            if (!data.entries || data.entries.length === 0) {
                return null; // Indicate no results found
            }

            // Check pronunciations and prioritize stressed transcriptions
            for (const entry of data.entries) {
                const pronunciations = entry.pronunciations || [];
                for (const pronunciation of pronunciations) {
                    if (regionPreference && pronunciation.context?.regions?.includes(regionPreference)) {
                        // Check for stressed transcription
                        let stressedTranscription = pronunciation.transcriptions?.find(t => t.label === 'stressed')?.transcription;
                        if (stressedTranscription) {
                        return cleanIPA(stressedTranscription);
                        }
                        // Fallback to the first transcription
                        let transcription = pronunciation.transcriptions?.[0]?.transcription;
                        if (transcription) {
                        return cleanIPA(transcription);
                        }
                        }
                        }
                        }

                        // Default to the first available transcription if no match
                        let transcription = data.entries[0]?.pronunciations?.[0]?.transcriptions?.[0]?.transcription;
                        return transcription ? cleanIPA(transcription) : null;
                        } catch (error) {
                        console.error(`Error fetching IPA for "${targetWord}":`, error);
                        return null; // Indicate an error occurred
                    }
                }

                // Attempt to query with original case
                let ipa = await queryWord(originalWord);
                if (ipa) {
                    return ipa;
                }

                // Fallback to lowercase query if original case fails
                ipa = await queryWord(lowercasedWord);
                return ipa || word; // Return the word itself if no transcription is found
            }

            function removeVowelsFromIPA(ipaText) {
                const vowels = /[iyɨʉɯuɪʏʊeøɘɵɤoe̞ø̞əɤ̞o̞ɛœɜɞʌɔæɐaɶäɑɒ]/g;
                const nonPhoneticSymbols = /[\/ˈˌ\(\)\.\[\]ː]/g;
                if (ipaText) {
                    ipaText = ipaText.replace(nonPhoneticSymbols, '').trim();
                    ipaText = ipaText.replace(/ɚ/g, 'əɹ').replace(/ɝ/g, 'ɜɹ');
                    const leadingVowelMatch = ipaText.match(/^([iyɨʉɯuɪʏʊeøɘɵɤoe̞ø̞əɤ̞o̞ɛœɜɞʌɔæɐaɶäɑɒ])/);
                    if (leadingVowelMatch) {
                        const leadingVowel = leadingVowelMatch[0];
                        ipaText = `'${ipaText.slice(leadingVowel.length)}`;
                    }
                    ipaText = ipaText.replace(vowels, '');
                    ipaText = ipaText.replace(/\s([,!?;:])/g, '$1').trim();
                }
                return ipaText;
            }

            document.getElementById('convertButton').addEventListener('click', async function () {
                const userInput = document.getElementById('userInput').value;
                const regionPreference = document.getElementById('regionSelect').value;

                if (!userInput.trim()) {
                    document.getElementById('outputText').textContent = 'Please enter some text.';
                    return;
                }

                const segments = preprocessInput(userInput);

                const results = await Promise.all(
                    segments.map(async (segment) => {
                        if (segment.match(/^\w+$/)) {
                            const ipa = await fetchIPA(segment, regionPreference);
                            return ipa;
                        }
                        return segment;
                    })
                );

                ipaOutput = results.filter(segment => segment !== '-').join(' ');
                const cleanedOutput = ipaOutput.replace(/\s([,.!?;:])/g, '$1').trim();

                document.getElementById('outputText').textContent = cleanedOutput;
                document.getElementById('abjadButton').disabled = false;
                isAbjadView = false;
            });

            document.getElementById('abjadButton').addEventListener('click', function () {
                if (!ipaOutput) {
                    document.getElementById('outputText').textContent = 'Please convert to IPA first.';
                    return;
                }

                isAbjadView = !isAbjadView;

                const output = isAbjadView
                ? ipaOutput
                .split(' ')
                .map(segment => {
                    // Ensure vowels are removed from all non-punctuation segments
                    if (!segment.match(/^[,!?;:.]$/)) {
                        return removeVowelsFromIPA(segment);
                    }
                    return segment; // Leave punctuation unchanged
                })
                .join(' ')
                .replace(/\s([,.!?;:])/g, '$1') // Fix spaces before punctuation
                .trim()
                : ipaOutput.replace(/\s([,.!?;:])/g, '$1').trim(); // Clean spaces before punctuation in IPA view

                document.getElementById('outputText').textContent = output;
            });