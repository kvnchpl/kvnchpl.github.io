// Spoiler-aware character reference and concept appendix.
(() => {
  'use strict';

  const referencePage = document.querySelector('.reference-page');
  if (!referencePage) return;

  const data = window.HOMESTUCK_REFERENCE;
  const select = document.getElementById('character-select');
  const roster = document.getElementById('character-roster');
  const groupsContainer = document.getElementById('character-groups');
  const progressScale = document.getElementById('reading-progress-scale');
  const progressOutput = document.getElementById('reading-progress-output');
  const loadingMessage = document.getElementById('reference-loading');
  const appendix = document.getElementById('concept-appendix');
  const conceptSearch = document.getElementById('concept-search');
  const conceptClear = document.getElementById('concept-clear');
  const conceptResults = document.getElementById('concept-results');
  const conceptEmpty = document.getElementById('concept-empty');

  if (!data || !select || !roster || !groupsContainer ||
    !progressScale || !progressOutput) {
    if (loadingMessage) {
      loadingMessage.textContent = 'The spoiler-safe reference could not be loaded.';
    }
    return;
  }

  const { stages, groups, characters } = data;
  if (!Array.isArray(stages) || !stages.length) return;

  const storageKey = 'homestuck-reference-progress';
  const stageIndex = new Map(stages.map((stage, index) => [stage.key, index]));
  // A missing or invalid club cap fails closed to the first reading stage.
  const clubStage = stages.find(stage => stage.key === data.availableThrough) || stages[0];
  let availableStage = clubStage;
  let debugCapActive = false;

  // Named accents match the user-supplied site CSS; provenance is in local docs.
  const characterColors = {
    'john': '#0715cd',
    'rose': '#b536da',
    'dave': '#e00707',
    'jade': '#4ac925',
    'jane': '#00d5f2',
    'jake': '#1f9400',
    'lalonde': '#ff6ff2',
    'strider': '#f2a400',
    'uranian-umbra': '#929292',
    'dad-crocker': '#555555',
    'poppop': '#0715cd',
    'grandma': '#4ac925',
    'auto-responder': '#e00707',
    'brobot': '#f2a400',
    'lil-seb': '#e00707',
    'aradia': '#a10000',
    'tavros': '#a16000',
    'sollux': '#a1a100',
    'karkat': '#626262',
    'nepeta': '#416600',
    'kanaya': '#008141',
    'terezi': '#008282',
    'vriska': '#005682',
    'equius': '#000056',
    'gamzee': '#2b0057',
    'eridan': '#6a006a',
    'feferi': '#77003c',
    'signless': '#626262',
    'dolorosa': '#008141',
    'disciple': '#416600',
    'psiioniic': '#a1a100',
    'handmaid': '#a10000',
    'condesce': '#77003c',
    'mindfang': '#005682',
    'dualscar': '#6a006a',
    'grand-highblood': '#2b0057',
    'redglare': '#008282',
    'darkleer': '#000056',
    'summoner': '#a16000',
    'dad': '#555555',
    'mom': '#a64d79',
    'bro': '#a65f26',
    'grandpa': '#82733b',
    'nannasprite': '#00d5f2',
    'jadesprite': '#1f9400',
    'jaspersprite': '#f141ef',
    'davesprite': '#f2a400',
    'bec': '#5c963a',
    'wv': '#806b4b',
    'pm': '#75858d',
    'ar': '#b58b2b',
    'wq': '#a3936a',
    'jack-noir': '#252525',
    'dd': '#252525',
    'cd': '#252525',
    'hb': '#252525',
    'spades-slick': '#252525',
    'diamonds-droog': '#252525',
    'clubs-deuce': '#252525',
    'hearts-boxcars': '#252525',
    'snowman': '#000000',
    'doc-scratch': '#ffffff',
    'lord-english': '#2ed73a'
  };

  let currentStage = stages[0];
  let selectedCharacterId = null;
  let currentTabs = [];
  let currentCards = [];

  function stageFor(valueOrKey) {
    const requested = stages.find(stage =>
      stage.key === String(valueOrKey) || stage.value === Number(valueOrKey)
    ) || stages[0];
    return requested.value > availableStage.value ? availableStage : requested;
  }

  function reached(requiredKey, atKey = currentStage.key) {
    if (!requiredKey) return true;
    const required = stageIndex.get(requiredKey);
    const current = stageIndex.get(atKey);
    return required !== undefined && current !== undefined && required <= current;
  }

  function resolveVariant(variants, stageKey = currentStage.key) {
    if (!Array.isArray(variants)) return null;
    let match = null;
    for (const variant of variants) {
      if (reached(variant.from, stageKey)) match = variant;
    }
    return match;
  }

  function resolvedValue(variants, stageKey = currentStage.key) {
    return resolveVariant(variants, stageKey)?.value ?? null;
  }

  function resolvedGroupId(character, stageKey = currentStage.key) {
    if (Array.isArray(character.group)) return resolvedValue(character.group, stageKey);
    return character.group;
  }

  function storedStage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return stages[0];
      return stageFor(saved);
    } catch {
      return stages[0];
    }
  }

  function saveStage(stage) {
    try {
      localStorage.setItem(storageKey, stage.key);
    } catch {
      // The reference still works when storage is blocked.
    }
  }

  function characterFromHash() {
    const match = location.hash.match(/^#character-(.+)$/);
    return match ? match[1] : null;
  }

  function setCharacterPalette(element, id) {
    const color = characterColors[id];
    if (!color) return;
    // Keep the exact character color on a uniform light surface.
    // Only Doc Scratch's white lettering receives a neutral outline.
    element.style.setProperty('--character-color', color);
    element.style.setProperty('--character-name-shadow', id === 'doc-scratch'
      ? '-1px 0 #555, 1px 0 #555, 0 -1px #555, 0 1px #555'
      : 'none');
  }

  function createPortrait(portrait, className, loading = 'lazy') {
    if (!portrait?.src) {
      if (!portrait?.placeholder) return null;
      const placeholder = document.createElement('span');
      placeholder.className = `${className} portrait-placeholder`;
      placeholder.textContent = '?';
      return placeholder;
    }
    const img = document.createElement('img');
    img.className = className;
    img.src = portrait.src;
    img.alt = portrait.alt || '';
    img.loading = loading;
    if (portrait.crop) {
      const { x, y, size, width, height } = portrait.crop;
      const frame = document.createElement('span');
      frame.className = `${className} portrait-frame`;
      img.className = 'portrait-framed-image';
      img.style.setProperty('width', `${width / size * 100}%`);
      img.style.setProperty('height', `${height / size * 100}%`);
      img.style.setProperty('left', `${-x / size * 100}%`);
      img.style.setProperty('top', `${-y / size * 100}%`);
      frame.append(img);
      return frame;
    }
    return img;
  }

  function showCharacter(id, { updateHash = true, focus = false } = {}) {
    const tab = currentTabs.find(item => item.dataset.characterId === id);
    const card = currentCards.find(item => item.dataset.characterId === id);
    if (!tab || !card) return false;

    selectedCharacterId = id;
    currentTabs.forEach(item => {
      const selected = item.dataset.characterId === id;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    currentCards.forEach(item => {
      item.hidden = item.dataset.characterId !== id;
    });

    if (updateHash) history.replaceState(null, '', `#character-${id}`);
    if (focus) tab.focus();
    return true;
  }

  function makeCharacterCard(character, groupId) {
    const nameVariant = resolveVariant(character.name);
    if (!nameVariant) return null;

    const card = document.createElement('article');
    card.id = `character-${character.id}`;
    card.className = `character-card${groupId === 'trolls' ? ' troll-card' : ''}`;
    card.dataset.characterId = character.id;
    card.setAttribute('role', 'tabpanel');
    card.tabIndex = 0;
    setCharacterPalette(card, character.id);

    const portrait = resolvedValue(character.portrait);
    const portraitElement = createPortrait(portrait, 'character-portrait');
    if (portraitElement) card.append(portraitElement);

    const copy = document.createElement('div');
    copy.className = 'character-copy';

    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.className = 'character-intro-link';
    link.href = `https://homestuck.com/story/${nameVariant.introLinkPage || nameVariant.sourcePage || character.introPage}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = nameVariant.value;
    heading.append(link);
    copy.append(heading);

    const stats = document.createElement('dl');
    stats.className = 'character-stats';
    let statCount = 0;

    for (const stat of character.stats || []) {
      const variant = resolveVariant(stat.variants);
      if (!variant) continue;
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = variant.label;
      dd.textContent = variant.value;
      if (stat.id === 'handle') dd.className = 'character-handle';
      if (stat.id === 'team') {
        if (variant.value === 'Blue Team') dd.className = 'reference-team-blue';
        if (variant.value === 'Red Team') dd.className = 'reference-team-red';
      }
      row.append(dt, dd);
      stats.append(row);
      statCount += 1;
    }

    if (statCount) copy.append(stats);

    card.append(copy);
    return card;
  }

  function makeRosterTab(character, card, groupId) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'character-option';
    tab.id = `${card.id}-tab`;
    tab.dataset.characterId = character.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', card.id);
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    setCharacterPalette(tab, character.id);

    const portrait = resolvedValue(character.portrait);
    const thumbnail = createPortrait(portrait, 'roster-portrait', 'eager');
    if (thumbnail) {
      if (thumbnail.tagName.toLowerCase() === 'img') thumbnail.alt = '';
      thumbnail.setAttribute('aria-hidden', 'true');
      tab.append(thumbnail);
    }

    const name = document.createElement('span');
    name.className = 'roster-name';
    name.textContent = resolvedValue(character.rosterLabel) || resolvedValue(character.name) || character.id;
    tab.append(name);
    tab.setAttribute('aria-label', name.textContent);

    tab.addEventListener('click', () => showCharacter(character.id));
    tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = currentTabs.indexOf(tab);
      if (index < 0) return;
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % currentTabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index + currentTabs.length - 1) % currentTabs.length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const row = Number(tab.dataset.rosterRow);
        const column = Number(tab.dataset.rosterColumn);
        const candidates = currentTabs.filter(t => (Number(t.dataset.rosterRow) - row) * direction > 0);
        candidates.sort((a, b) =>
          Math.abs(Number(a.dataset.rosterRow) - row) - Math.abs(Number(b.dataset.rosterRow) - row) ||
          Math.abs(Number(a.dataset.rosterColumn) - column) - Math.abs(Number(b.dataset.rosterColumn) - column));
        nextIndex = candidates.length ? currentTabs.indexOf(candidates[0]) : index;
      }
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = currentTabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      showCharacter(currentTabs[nextIndex].dataset.characterId, { focus: true });
    });

    card.setAttribute('aria-labelledby', tab.id);
    return tab;
  }

  function renderCharacters() {
    roster.replaceChildren();
    groupsContainer.replaceChildren();
    currentTabs = [];
    currentCards = [];

    const available = characters.filter(character => reached(character.reveal));
    const requested = characterFromHash();
    const availableIds = new Set(available.map(character => character.id));
    if (requested && availableIds.has(requested)) selectedCharacterId = requested;
    if (!selectedCharacterId || !availableIds.has(selectedCharacterId)) {
      selectedCharacterId = available[0]?.id || null;
    }

    let rosterRow = 0;
    for (const group of groups) {
      const groupTitle = resolvedValue(group.title);
      if (!groupTitle) continue;
      const groupCharacters = available.filter(character => resolvedGroupId(character) === group.id);
      if (!groupCharacters.length) continue;

      const rosterLabel = document.createElement('div');
      rosterLabel.className = 'roster-group-label';
      rosterLabel.textContent = groupTitle;
      rosterLabel.setAttribute('role', 'presentation');
      roster.append(rosterLabel);

      const section = document.createElement('section');
      section.className = 'reference-section character-group';
      section.id = group.id;
      const heading = document.createElement('h2');
      heading.textContent = groupTitle;
      section.append(heading);
      const grid = document.createElement('div');
      grid.className = `character-grid ${group.id === 'trolls' ? 'troll-grid' : group.id === 'guardians-sprites' ? 'guardian-grid' : group.id === 'exiles-agents' ? 'exiles-agents-grid' : group.id === 'felt-associates' ? 'felt-associates-grid' : group.id === 'midnight-crew' ? 'midnight-crew-grid' : 'kid-grid'}`;
      section.append(grid);

      rosterRow += 1;
      let rosterColumn = 0;
      for (const character of groupCharacters) {
        const card = makeCharacterCard(character, group.id);
        if (!card) continue;
        const tab = makeRosterTab(character, card, group.id);
        const column = character.rosterColumn || (rosterColumn % 4) + 1;
        if (column <= rosterColumn) rosterRow += 1;
        rosterColumn = column;
        tab.style.setProperty('grid-column', String(column));
        tab.dataset.rosterColumn = String(column);
        tab.dataset.rosterRow = String(rosterRow);
        roster.append(tab);
        grid.append(card);
        currentTabs.push(tab);
        currentCards.push(card);
      }
      groupsContainer.append(section);
    }

    if (!currentCards.length) {
      select.hidden = true;
      return;
    }

    select.hidden = false;
    select.classList.add('is-ready');
    showCharacter(selectedCharacterId || currentCards[0].dataset.characterId, { updateHash: false });
  }

  function updateStageUI(stage) {
    progressOutput.value = stage.label;
    progressOutput.textContent = stage.label;
    document.documentElement.dataset.referenceProgress = stage.key;

    progressScale.querySelectorAll('.reading-progress-tick').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.stageKey === stage.key));
    });
  }

  function searchableText(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function conceptFromHash() {
    return location.hash.match(/^#concept-([a-z0-9-]+)$/)?.[1] || null;
  }

  function showConcept(id, { updateHash = true } = {}) {
    const concept = (data.concepts || []).find(item => item.id === id);
    const variant = concept && reached(concept.reveal) && resolveVariant(concept.variants);
    if (!variant) return false;
    const targetId = `concept-${id}`;
    if (!document.getElementById(targetId)) {
      conceptSearch.value = variant.term;
      renderConcepts();
    }
    const entry = document.getElementById(targetId);
    if (!entry) return false;
    if (updateHash && location.hash !== `#${targetId}`) history.pushState(null, '', `#${targetId}`);
    entry.focus({ preventScroll: true });
    entry.scrollIntoView({ block: 'start' });
    return true;
  }

  function appendLinkedDefinition(element, text, ownId, available) {
    const phrases = new Map();
    for (const { id, variant } of available) {
      if (id === ownId) continue;
      for (const phrase of [variant.term, ...(variant.aliases || []), ...(variant.linkPhrases || [])]) {
        const key = phrase.toLowerCase();
        // Ambiguous labels remain plain text rather than choosing an arbitrary entry.
        phrases.set(key, phrases.has(key) && phrases.get(key) !== id ? null : id);
      }
    }
    const labels = [...phrases.keys()].filter(key => phrases.get(key))
      .sort((a, b) => b.length - a.length)
      .map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!labels.length) {
      element.textContent = text;
      return;
    }
    // Longest phrases win; whole-word matching avoids links inside unrelated words.
    const pattern = new RegExp(`\\b(${labels.join('|')})(s)?\\b`, 'gi');
    const linked = new Set();
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      const id = phrases.get(match[1].toLowerCase());
      if (linked.has(id)) continue;
      element.append(document.createTextNode(text.slice(cursor, match.index)));
      const link = document.createElement('a');
      link.className = 'concept-link';
      link.href = `#concept-${id}`;
      link.textContent = match[0];
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        showConcept(id);
      });
      element.append(link);
      linked.add(id);
      cursor = match.index + match[0].length;
    }
    element.append(document.createTextNode(text.slice(cursor)));
  }

  function renderConcepts() {
    if (![appendix, conceptSearch, conceptClear, conceptResults, conceptEmpty].every(Boolean)) return;
    const concepts = data.concepts || [];
    // Resolve first: unreached names, aliases, and definitions never enter search or the DOM.
    const available = concepts.filter(concept => reached(concept.reveal))
      .map(concept => ({ id: concept.id, variant: resolveVariant(concept.variants) }))
      .filter(concept => concept.variant)
      .sort((a, b) => a.variant.term.localeCompare(b.variant.term, 'en'));
    const query = searchableText(conceptSearch.value || '');
    const words = query ? query.split(/\s+/) : [];
    const nameMatches = [];
    const definitionMatches = [];
    // Partition the alphabetical list so name matches lead without duplicates.
    for (const concept of words.length ? available : []) {
      const { variant } = concept;
      const names = [variant.term, ...(variant.aliases || [])].map(searchableText);
      const matchesWords = text => words.every(word => text.includes(word));
      if (names.some(matchesWords)) {
        nameMatches.push(concept);
      } else if (matchesWords([...names, searchableText(variant.definition)].join(' '))) {
        definitionMatches.push(concept);
      }
    }
    const matches = [...nameMatches, ...definitionMatches];

    conceptResults.replaceChildren();
    for (const { id, variant } of matches) {
      const entry = document.createElement('article');
      entry.className = 'concept-entry';
      entry.id = `concept-${id}`;
      entry.tabIndex = -1;
      const heading = document.createElement('h3');
      heading.textContent = variant.term;
      const copy = document.createElement('div');
      copy.className = 'concept-copy';
      const definition = document.createElement('p');
      definition.className = 'concept-definition';
      appendLinkedDefinition(definition, variant.definition, id, available);
      copy.append(definition);
      entry.append(heading, copy);
      conceptResults.append(entry);
    }

    conceptClear.disabled = !conceptSearch.value;
    conceptEmpty.hidden = !words.length || matches.length > 0;
    conceptEmpty.textContent = !words.length ? '' : available.length
      ? 'No matching terms at this reading point. Try another word or clear the search.'
      : 'No terms have been added for this reading point yet.';
    appendix.hidden = false;
  }

  function applyProgress(valueOrKey, { persist = true } = {}) {
    currentStage = stageFor(valueOrKey);
    updateStageUI(currentStage);
    renderCharacters();
    renderConcepts();
    if (loadingMessage) loadingMessage.hidden = true;
    if (persist && !debugCapActive) saveStage(currentStage);
  }

  function renderStageSelector() {
    progressScale.replaceChildren();
    const stageSections = new Map();
    for (const stage of stages) {
      const sectionLabel = stage.section || 'Reading segments';
      if (!stageSections.has(sectionLabel)) {
        const section = document.createElement('section');
        section.className = 'reading-progress-section';
        const heading = document.createElement('h3');
        heading.id = `reading-section-${stageSections.size + 1}`;
        heading.textContent = sectionLabel;
        section.setAttribute('aria-labelledby', heading.id);
        const segments = document.createElement('div');
        segments.className = 'reading-progress-segments';
        section.append(heading, segments);
        progressScale.append(section);
        stageSections.set(sectionLabel, segments);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reading-progress-tick';
      button.dataset.stageKey = stage.key;
      button.textContent = stage.shortLabel;
      const locked = stage.value > availableStage.value;
      button.disabled = locked;
      button.title = locked ? `${stage.label} - not yet available` : stage.label;
      button.setAttribute('aria-label', locked ? `${stage.label} - not yet available` : `Show reference through ${stage.label}`);
      button.setAttribute('aria-pressed', 'false');
      if (!locked) button.addEventListener('click', () => applyProgress(stage.key));
      stageSections.get(sectionLabel).append(button);
    }
  }

  const debugDialog = document.getElementById('reference-debug');
  const debugSelect = document.getElementById('reference-debug-cap');
  const debugForm = document.getElementById('reference-debug-form');
  const debugReset = document.getElementById('reference-debug-reset');
  const debugCancel = document.getElementById('reference-debug-cancel');
  const capStatus = document.getElementById('reading-progress-limit');

  if (debugDialog && debugSelect && debugForm && debugReset && debugCancel) {
    for (const stage of stages) {
      const option = document.createElement('option');
      option.value = stage.key;
      option.textContent = stage.label;
      debugSelect.append(option);
    }

    window.addEventListener('keydown', event => {
      if (event.repeat || event.altKey || !event.shiftKey ||
        !(event.ctrlKey || event.metaKey) || event.code !== 'Period') return;
      if (typeof debugDialog.showModal !== 'function') return;
      event.preventDefault();
      debugSelect.value = availableStage.key;
      if (!debugDialog.open) debugDialog.showModal();
      debugSelect.focus();
    });

    debugForm.addEventListener('submit', event => {
      event.preventDefault();
      const requested = stages.find(stage => stage.key === debugSelect.value);
      if (!requested) return;
      availableStage = requested;
      debugCapActive = true;
      if (capStatus) capStatus.textContent = `Debug cap: ${requested.label} (resets on reload).`;
      renderStageSelector();
      applyProgress(requested.key, { persist: false });
      debugDialog.close();
      progressOutput.focus();
    });

    debugReset.addEventListener('click', () => {
      availableStage = clubStage;
      debugCapActive = false;
      if (capStatus) capStatus.textContent = '';
      renderStageSelector();
      applyProgress(storedStage().key, { persist: false });
      debugDialog.close();
      progressOutput.focus();
    });

    debugCancel.addEventListener('click', () => debugDialog.close());
  }

  renderStageSelector();

  window.addEventListener('hashchange', () => {
    const id = characterFromHash();
    if (id) showCharacter(id, { updateHash: false });
    const conceptId = conceptFromHash();
    if (conceptId) showConcept(conceptId, { updateHash: false });
  });

  conceptSearch?.addEventListener('input', renderConcepts);
  conceptClear?.addEventListener('click', () => {
    conceptSearch.value = '';
    renderConcepts();
    conceptSearch.focus();
  });

  applyProgress(storedStage().key, { persist: false });
  const initialConcept = conceptFromHash();
  if (initialConcept) showConcept(initialConcept, { updateHash: false });
})();

(() => {
  'use strict';

  const deck = document.querySelector('.deck');
  if (!deck) return;
  const slides = [...deck.querySelectorAll('.slide')];
  if (!slides.length) return;

  const controls = document.querySelector('.controls');
  const counter = document.getElementById('counter');
  const sourceLink = document.getElementById('source-link');
  const previousButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const nextRecap = document.getElementById('next-recap');
  const startOver = document.getElementById('start-over');
  // Keep the document readable if required reader controls are missing.
  if (![controls, counter, sourceLink, previousButton, nextButton, startOver].every(Boolean)) return;
  const sources = new Map();
  const panels = [...deck.querySelectorAll('.media img')];
  const panelsBySlide = new Map(slides.map(slide => [slide, panels.filter(img => img.closest('.slide') === slide)]));

  function loadSlide(slide) {
    for (const img of panelsBySlide.get(slide) || []) img.loading = 'eager';
  }

  // Print includes every slide, including panels not yet visited in the reader.
  window.addEventListener('beforeprint', () => {
    panels.forEach(img => { img.loading = 'eager'; });
  });
  // Support legacy act prefixes and the recap workflow's RNN filenames.
  const panelPattern = /^(A\d+(?:\.I\d+)?|I\d+|R\d+)_(\d+)[_-]story-(\d+)\.(gif|png|jpe?g|webp)$/i;

  panels.forEach(img => {
    if (img.hasAttribute('data-external-diagram')) return;
    let filename;
    try {
      filename = decodeURIComponent(new URL(img.src).pathname.split('/').pop());
    } catch {
      return; // Unrecognized asset URLs do not prevent reading the recap.
    }
    const match = filename.match(panelPattern);
    if (!match) return;
    const [, section, , paddedPage] = match;
    const page = Number(paddedPage);
    if (!Number.isSafeInteger(page) || page < 1) return;
    const sectionLabel = /^R/i.test(section) ? `Recap ${Number(section.slice(1))}` :
      /^I/i.test(section) ? `Intermission ${section.slice(1)}` : `Act ${section.slice(1)}`;
    if (!img.hasAttribute('alt')) img.alt = `Homestuck ${sectionLabel}, page ${page}`;
    sources.set(img.closest('.slide'), page);
  });

  let index = 0;
  function indexFromHash() {
    const match = location.hash.match(/^#(\d+)$/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  }
  function show(nextIndex, updateHash = true) {
    const previousIndex = index;
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    const isCover = slides[index].classList.contains('cover');
    const page = isCover ? undefined : sources.get(slides[index]);
    const isLast = index === slides.length - 1;
    const focused = document.activeElement;
    const focusedSlide = focused.closest('.slide');
    // Move focus before hiding/disabling anything: browsers otherwise reset it to body.
    if ((focusedSlide && focusedSlide !== slides[index]) ||
      (focused === sourceLink && page === undefined) ||
      (focused === previousButton && index === 0) ||
      (focused === nextButton && isLast) ||
      (focused === startOver && isCover) ||
      (focused === nextRecap && !isLast)) {
      deck.focus({ preventScroll: true });
    }
    slides.forEach((slide, n) => {
      slide.hidden = n !== index;
      slide.classList.toggle('active', n === index);
      slide.setAttribute('aria-label', `Slide ${n + 1} of ${slides.length}`);
    });
    // Fetch the selected panel and one ahead; other slides stay lazy.
    loadSlide(slides[index]);
    loadSlide(slides[index + 1]);
    counter.textContent = `${index + 1} / ${slides.length}`;
    (slides[index].querySelector('.media') || slides[index]).append(counter);
    counter.hidden = isCover;
    startOver.disabled = isCover;
    sourceLink.hidden = page === undefined;
    if (page !== undefined) {
      sourceLink.href = `https://homestuck.com/story/${page}`;
      sourceLink.textContent = `p. ${page} ↗`;
      sourceLink.setAttribute('aria-label', `Open Homestuck page ${page} (new tab)`);
    } else {
      sourceLink.removeAttribute('href');
      sourceLink.removeAttribute('aria-label');
      sourceLink.textContent = '';
    }
    previousButton.disabled = index === 0;
    nextButton.disabled = isLast;
    nextButton.hidden = nextButton.disabled && Boolean(nextRecap);
    if (nextRecap) {
      nextRecap.hidden = !nextButton.disabled;
    }
    if (updateHash) history.replaceState(null, '', `#${index + 1}`);
    // After reading a long caption, start the next slide at its panel on small screens.
    if (index !== previousIndex && window.matchMedia('(max-width: 600px), (max-height: 600px)').matches) {
      deck.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  previousButton.addEventListener('click', () => show(index - 1));
  nextButton.addEventListener('click', () => show(index + 1));
  startOver.addEventListener('click', () => {
    if (startOver.disabled) return;
    show(0);
    deck.focus({ preventScroll: true });
    deck.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    // Space/Enter on a focused control retain their native activation behavior.
    if (event.key === ' ' && event.target.closest('button, a, [role="button"]')) return;
    switch (event.key.toLowerCase()) {
      case 'arrowright': case 'pagedown': case ' ': show(index + 1); break;
      case 'arrowleft': case 'pageup': show(index - 1); break;
      case 'home': show(0); break;
      case 'end': show(slides.length - 1); break;
      default: return;
    }
    event.preventDefault();
  });
  deck.addEventListener('click', event => {
    if (event.target.closest('button, a') || window.getSelection().toString()) return;
    // Touch readers use the visible arrows, so taps while reading do not skip slides.
    if (event.pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches) return;
    const bounds = slides[index].getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    show(index + (event.clientX < bounds.left + bounds.width * .35 ? -1 : 1));
  });
  window.addEventListener('hashchange', () => show(indexFromHash(), false));
  document.body.classList.add('is-presenting');
  controls.hidden = false;
  show(indexFromHash(), false);
})();
