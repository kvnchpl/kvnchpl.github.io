// Spoiler-aware character reference and concept appendix.
(() => {
  'use strict';

  const referencePage = document.querySelector('.reference-page');
  if (!referencePage) return;

  const referenceData = window.HOMESTUCK_REFERENCE;
  const characterBrowser = document.getElementById('character-browser');
  const characterRoster = document.getElementById('character-roster');
  const characterProfiles = document.getElementById('character-profiles');
  const readingStageGroups = document.getElementById('reading-stage-groups');
  const selectedReadingLink = document.getElementById('selected-reading-link');
  const spoilerlog = document.getElementById('spoilerlog');
  const referenceLoadingMessage = document.getElementById('reference-loading');
  const appendix = document.getElementById('concept-appendix');
  const appendixSearchInput = document.getElementById('concept-search');
  const appendixClearButton = document.getElementById('concept-clear');
  const appendixResults = document.getElementById('concept-results');
  const appendixEmptyMessage = document.getElementById('concept-empty');

  // Print the reading controls even if their native disclosure is collapsed.
  let spoilerlogWasOpenBeforePrint;
  window.addEventListener('beforeprint', () => {
    if (!spoilerlog || spoilerlogWasOpenBeforePrint !== undefined) return;
    spoilerlogWasOpenBeforePrint = spoilerlog.open;
    spoilerlog.open = true;
  });
  window.addEventListener('afterprint', () => {
    if (!spoilerlog || spoilerlogWasOpenBeforePrint === undefined) return;
    spoilerlog.open = spoilerlogWasOpenBeforePrint;
    spoilerlogWasOpenBeforePrint = undefined;
  });

  if (!referenceData || !characterBrowser || !characterRoster || !characterProfiles ||
    !readingStageGroups || !selectedReadingLink) {
    if (referenceLoadingMessage) {
      referenceLoadingMessage.textContent = 'The spoiler-safe reference could not be loaded.';
    }
    return;
  }

  const { stages, groups: characterGroups, characters } = referenceData;
  if (!Array.isArray(stages) || !stages.length) return;

  const storageKey = 'homestuck-reference-progress';
  const stageIndexByKey = new Map(stages.map((stage, index) => [stage.key, index]));
  // A missing or invalid club cap fails closed to the first reading stage.
  const clubReadingCap = stages.find(stage => stage.key === referenceData.availableThrough) || stages[0];
  let readingCap = clubReadingCap;
  let capPreviewActive = false;

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
    'undying-umbrage': '#323232',
    'gcat': '#4ac925',
    'squarewave': '#e00707',
    'sawtooth': '#252525',
    'post-scratch-hb': '#252525',
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
    'post-scratch-jack-noir': '#252525',
    'post-scratch-dd': '#252525',
    'post-scratch-cd': '#252525',
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

  let selectedReadingStage = stages[0];
  let selectedCharacterId = null;
  let rosterButtons = [];
  let profilePanels = [];

  function clampReadingStage(valueOrKey) {
    const requested = stages.find(stage =>
      stage.key === String(valueOrKey) || stage.value === Number(valueOrKey)
    ) || stages[0];
    return requested.value > readingCap.value ? readingCap : requested;
  }

  function hasReachedStage(requiredKey, atKey = selectedReadingStage.key) {
    if (!requiredKey) return true;
    const required = stageIndexByKey.get(requiredKey);
    const current = stageIndexByKey.get(atKey);
    return required !== undefined && current !== undefined && required <= current;
  }

  function resolveVariant(variants, stageKey = selectedReadingStage.key) {
    if (!Array.isArray(variants)) return null;
    let match = null;
    for (const variant of variants) {
      if (hasReachedStage(variant.from, stageKey)) match = variant;
    }
    return match;
  }

  function resolvedValue(variants, stageKey = selectedReadingStage.key) {
    return resolveVariant(variants, stageKey)?.value ?? null;
  }

  function resolvedGroupId(character, stageKey = selectedReadingStage.key) {
    if (Array.isArray(character.group)) return resolvedValue(character.group, stageKey);
    return character.group;
  }

  function loadReadingStage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return stages[0];
      return clampReadingStage(saved);
    } catch {
      return stages[0];
    }
  }

  function saveReadingStage(stage) {
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
    return img;
  }

  function showCharacter(id, { updateHash = true, focus = false } = {}) {
    const tab = rosterButtons.find(item => item.dataset.characterId === id);
    const profilePanel = profilePanels.find(item => item.dataset.characterId === id);
    if (!tab || !profilePanel) return false;

    const changedCharacter = selectedCharacterId !== id;
    selectedCharacterId = id;
    rosterButtons.forEach(item => {
      const selected = item.dataset.characterId === id;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    profilePanels.forEach(item => {
      item.hidden = item.dataset.characterId !== id;
    });
    if (changedCharacter) {
      const statsScrollRegion = profilePanel.querySelectorAll('.profile-stats-scroll')[0];
      if (statsScrollRegion) statsScrollRegion.scrollTop = 0;
    }

    if (updateHash) history.replaceState(null, '', `#character-${id}`);
    if (focus) tab.focus({ preventScroll: true });
    // Reveal keyboard and fragment selections within the roster only.
    if (characterRoster.clientHeight) {
      const itemBounds = tab.getBoundingClientRect();
      const rosterBounds = characterRoster.getBoundingClientRect();
      const above = itemBounds.top - rosterBounds.top - 6;
      const below = itemBounds.bottom - rosterBounds.bottom + 6;
      if (above < 0) characterRoster.scrollTop += above;
      else if (below > 0) characterRoster.scrollTop += below;
    }
    return true;
  }

  function openCharacterProfile(id) {
    if (!showCharacter(id, { updateHash: false })) return;
    const profileHash = `#character-${id}`;
    if (location.hash !== profileHash) history.pushState(null, '', profileHash);
    profilePanels.find(panel => panel.dataset.characterId === id).focus({ preventScroll: true });
    characterBrowser.scrollIntoView({ block: 'start' });
  }

  function createCharacterProfile(character, groupId, appendixEntries) {
    const nameVariant = resolveVariant(character.name);
    if (!nameVariant) return null;

    const profilePanel = document.createElement('article');
    profilePanel.id = `character-${character.id}`;
    profilePanel.className = `character-profile${groupId === 'trolls' ? ' troll-profile' : ''}`;
    profilePanel.dataset.characterId = character.id;
    profilePanel.setAttribute('role', 'tabpanel');
    profilePanel.tabIndex = 0;
    setCharacterPalette(profilePanel, character.id);

    const portrait = resolvedValue(character.portrait);
    const portraitElement = createPortrait(portrait, 'profile-portrait');
    const header = document.createElement('div');
    header.className = 'profile-header';
    if (portraitElement) header.append(portraitElement);

    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.className = 'profile-intro-link';
    link.href = `https://homestuck.com/story/${nameVariant.introLinkPage || nameVariant.sourcePage || character.introPage}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = nameVariant.value;
    heading.append(link);
    header.append(heading);

    const stats = document.createElement('dl');
    stats.className = 'profile-stats';
    const ownEntryId = appendixEntries.find(entry => entry.characterId === character.id)?.id;
    const appendStatLinks = createAppendixLinker(appendixEntries, ownEntryId, 'profile-term-link', true);
    let statCount = 0;

    for (const stat of character.stats || []) {
      if (stat.until && hasReachedStage(stat.until)) continue;
      const variant = resolveVariant(stat.variants);
      if (!variant) continue;
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = variant.label;
      appendStatLinks(dd, variant.value);
      if (stat.id === 'handle') dd.className = 'profile-handle';
      if (stat.id === 'team') {
        if (variant.value === 'Blue Team') dd.className = 'reference-team-blue';
        if (variant.value === 'Red Team') dd.className = 'reference-team-red';
      }
      row.append(dt, dd);
      stats.append(row);
      statCount += 1;
    }

    profilePanel.append(header);
    if (statCount) {
      const statsScrollRegion = document.createElement('div');
      statsScrollRegion.className = 'profile-stats-scroll';
      statsScrollRegion.tabIndex = 0;
      statsScrollRegion.setAttribute('role', 'region');
      statsScrollRegion.setAttribute('aria-label', `${nameVariant.value} stats`);
      statsScrollRegion.append(stats);
      profilePanel.append(statsScrollRegion);
    }
    return profilePanel;
  }

  function createRosterButton(character, profilePanel, groupId) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'roster-button';
    tab.id = `${profilePanel.id}-tab`;
    tab.dataset.characterId = character.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', profilePanel.id);
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
      const index = rosterButtons.indexOf(tab);
      if (index < 0) return;
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % rosterButtons.length;
      if (event.key === 'ArrowLeft') nextIndex = (index + rosterButtons.length - 1) % rosterButtons.length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const row = Number(tab.dataset.rosterRow);
        const column = Number(tab.dataset.rosterColumn);
        const candidates = rosterButtons.filter(t => (Number(t.dataset.rosterRow) - row) * direction > 0);
        candidates.sort((a, b) =>
          Math.abs(Number(a.dataset.rosterRow) - row) - Math.abs(Number(b.dataset.rosterRow) - row) ||
          Math.abs(Number(a.dataset.rosterColumn) - column) - Math.abs(Number(b.dataset.rosterColumn) - column));
        nextIndex = candidates.length ? rosterButtons.indexOf(candidates[0]) : index;
      }
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = rosterButtons.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      showCharacter(rosterButtons[nextIndex].dataset.characterId, { focus: true });
    });

    profilePanel.setAttribute('aria-labelledby', tab.id);
    return tab;
  }

  function renderCharacters() {
    characterRoster.replaceChildren();
    characterProfiles.replaceChildren();
    rosterButtons = [];
    profilePanels = [];

    const available = characters.filter(character => hasReachedStage(character.reveal));
    const appendixEntries = reachedAppendixEntries();
    const requested = characterFromHash();
    const availableIds = new Set(available.map(character => character.id));
    if (requested && availableIds.has(requested)) selectedCharacterId = requested;
    if (!selectedCharacterId || !availableIds.has(selectedCharacterId)) {
      selectedCharacterId = available[0]?.id || null;
    }

    let rosterRow = 0;
    for (const group of characterGroups) {
      const groupTitle = resolvedValue(group.title);
      if (!groupTitle) continue;
      const groupCharacters = available.filter(character => resolvedGroupId(character) === group.id);
      if (!groupCharacters.length) continue;

      const rosterLabel = document.createElement('div');
      rosterLabel.className = 'roster-group-heading';
      rosterLabel.textContent = groupTitle;
      rosterLabel.setAttribute('role', 'presentation');
      characterRoster.append(rosterLabel);

      const section = document.createElement('section');
      section.className = 'reference-section profile-group';
      section.id = group.id;
      const heading = document.createElement('h2');
      heading.textContent = groupTitle;
      section.append(heading);
      const grid = document.createElement('div');
      grid.className = `profile-grid ${group.id === 'trolls' ? 'troll-grid' : group.id === 'guardians-sprites' ? 'guardian-grid' : group.id === 'exiles' ? 'exiles-grid' : group.id === 'agents' ? 'agents-grid' : group.id === 'felt-associates' ? 'felt-associates-grid' : group.id === 'midnight-crew' ? 'midnight-crew-grid' : 'kid-grid'}`;
      // Preserve links to the former combined group at the start of the exiles.
      if (group.id === 'exiles') grid.id = 'exiles-agents';
      section.append(grid);

      rosterRow += 1;
      let rosterColumn = 0;
      for (const character of groupCharacters) {
        const profilePanel = createCharacterProfile(character, group.id, appendixEntries);
        if (!profilePanel) continue;
        const tab = createRosterButton(character, profilePanel, group.id);
        const column = character.rosterColumn || (rosterColumn % 4) + 1;
        if (column <= rosterColumn) rosterRow += 1;
        rosterColumn = column;
        tab.style.setProperty('grid-column', String(column));
        tab.dataset.rosterColumn = String(column);
        tab.dataset.rosterRow = String(rosterRow);
        characterRoster.append(tab);
        grid.append(profilePanel);
        rosterButtons.push(tab);
        profilePanels.push(profilePanel);
      }
      characterProfiles.append(section);
    }

    if (!profilePanels.length) {
      characterBrowser.hidden = true;
      return;
    }

    characterBrowser.hidden = false;
    characterBrowser.classList.add('is-ready');
    showCharacter(selectedCharacterId || profilePanels[0].dataset.characterId, { updateHash: false });
  }

  function updateReadingStageControls(stage) {
    selectedReadingLink.textContent = stage.label;
    // Scheduled segments are contiguous; each starts after the preceding end.
    const previousStage = stages[stageIndexByKey.get(stage.key) - 1];
    selectedReadingLink.href = `https://homestuck.com/story/${previousStage ? previousStage.endPage + 1 : 1}`;
    document.documentElement.dataset.referenceProgress = stage.key;

    readingStageGroups.querySelectorAll('.reading-stage-button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.stageKey === stage.key));
    });
  }

  function searchableText(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function appendixEntryFromHash() {
    return location.hash.match(/^#concept-([a-z0-9-]+)$/)?.[1] || null;
  }

  function showAppendixEntry(id, { updateHash = true, focusSearch = false } = {}) {
    const concept = (referenceData.concepts || []).find(item => item.id === id);
    const variant = concept && hasReachedStage(concept.reveal) && resolveVariant(concept.variants);
    if (!variant) return false;
    const targetId = `concept-${id}`;
    appendixSearchInput.value = variant.term;
    renderAppendix();
    const entry = document.getElementById(targetId);
    if (!entry) return false;
    if (updateHash && location.hash !== `#${targetId}`) history.pushState(null, '', `#${targetId}`);
    if (focusSearch) {
      appendixSearchInput.focus();
    } else {
      entry.focus({ preventScroll: true });
      entry.scrollIntoView({ block: 'start' });
    }
    return true;
  }

  function reachedAppendixEntries() {
    return (referenceData.concepts || []).filter(concept => hasReachedStage(concept.reveal))
      .map(concept => ({ id: concept.id, characterId: concept.characterId, variant: resolveVariant(concept.variants) }))
      .filter(concept => concept.variant)
      .sort((a, b) => a.variant.term.localeCompare(b.variant.term, 'en'));
  }

  function createAppendixLinker(available, ownId, className = 'concept-link', linkCharacters = false) {
    const characterTargets = new Map(available.filter(entry => linkCharacters && entry.characterId &&
      referenceData.characters.some(character => character.id === entry.characterId &&
        hasReachedStage(character.reveal) && resolveVariant(character.name)))
      .map(entry => [entry.id, entry.characterId]));
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
      return (element, text) => { element.textContent = text; };
    }
    // Longest phrases win; whole-word matching avoids links inside unrelated words.
    const pattern = new RegExp(`\\b(${labels.join('|')})(s)?\\b`, 'gi');
    return (element, text) => {
      const linked = new Set();
      let cursor = 0;
      for (const match of text.matchAll(pattern)) {
        const id = phrases.get(match[1].toLowerCase());
        if (linked.has(id)) continue;
        element.append(document.createTextNode(text.slice(cursor, match.index)));
        const link = document.createElement('a');
        link.className = className;
        const characterId = characterTargets.get(id);
        link.href = characterId ? `#character-${characterId}` : `#concept-${id}`;
        link.textContent = match[0];
        link.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
          event.preventDefault();
          if (characterId) openCharacterProfile(characterId);
          else showAppendixEntry(id, { focusSearch: true });
        });
        element.append(link);
        linked.add(id);
        cursor = match.index + match[0].length;
      }
      element.append(document.createTextNode(text.slice(cursor)));
    };
  }

  function renderAppendix() {
    if (![appendix, appendixSearchInput, appendixClearButton, appendixResults, appendixEmptyMessage].every(Boolean)) return;
    // Resolve first: unreached names, aliases, and definitions never enter search or the DOM.
    const available = reachedAppendixEntries();
    const query = searchableText(appendixSearchInput.value || '');
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

    appendixResults.replaceChildren();
    for (const { id, characterId, variant } of matches) {
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
      createAppendixLinker(available, id)(definition, variant.definition);
      copy.append(definition);
      const profilePanel = profilePanels.find(panel => panel.dataset.characterId === characterId);
      if (profilePanel) {
        const profileLink = document.createElement('a');
        const profileHash = `#character-${characterId}`;
        profileLink.className = 'concept-profile-link';
        profileLink.href = profileHash;
        profileLink.textContent = 'View profile.';
        profileLink.setAttribute('aria-label', `View profile: ${variant.term}`);
        profileLink.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
          event.preventDefault();
          openCharacterProfile(characterId);
        });
        const profileCommand = document.createElement('ul');
        profileCommand.className = 'command-links concept-profile-command';
        const commandItem = document.createElement('li');
        commandItem.append(profileLink);
        profileCommand.append(commandItem);
        copy.append(profileCommand);
      }
      entry.append(heading, copy);
      appendixResults.append(entry);
    }

    appendixClearButton.disabled = !appendixSearchInput.value;
    appendixEmptyMessage.hidden = !words.length || matches.length > 0;
    appendixEmptyMessage.textContent = !words.length ? '' : available.length
      ? 'No matching terms at this reading point. Try another word or clear the search.'
      : 'No terms have been added for this reading point yet.';
    appendix.hidden = false;
  }

  function selectReadingStage(valueOrKey, { persist = true } = {}) {
    selectedReadingStage = clampReadingStage(valueOrKey);
    updateReadingStageControls(selectedReadingStage);
    renderCharacters();
    renderAppendix();
    if (referenceLoadingMessage) referenceLoadingMessage.hidden = true;
    if (persist && !capPreviewActive) saveReadingStage(selectedReadingStage);
  }

  function renderReadingStageButtons() {
    readingStageGroups.replaceChildren();
    const stageSections = new Map();
    for (const stage of stages) {
      const sectionLabel = stage.section || 'Reading segments';
      if (!stageSections.has(sectionLabel)) {
        const section = document.createElement('section');
        section.className = 'reading-stage-group';
        const heading = document.createElement('h3');
        heading.id = `reading-section-${stageSections.size + 1}`;
        heading.textContent = sectionLabel;
        section.setAttribute('aria-labelledby', heading.id);
        const segments = document.createElement('div');
        segments.className = 'reading-stage-buttons';
        section.append(heading, segments);
        readingStageGroups.append(section);
        stageSections.set(sectionLabel, segments);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reading-stage-button';
      button.dataset.stageKey = stage.key;
      button.textContent = stage.shortLabel;
      const locked = stage.value > readingCap.value;
      button.disabled = locked;
      button.title = locked ? `${stage.label} - not yet available` : stage.label;
      button.setAttribute('aria-label', locked ? `${stage.label} - not yet available` : `Show reference through ${stage.label}`);
      button.setAttribute('aria-pressed', 'false');
      if (!locked) button.addEventListener('click', () => selectReadingStage(stage.key));
      stageSections.get(sectionLabel).append(button);
    }
  }

  const capPreviewDialog = document.getElementById('reading-cap-preview');
  const capPreviewSelect = document.getElementById('reading-cap-preview-select');
  const capPreviewForm = document.getElementById('reading-cap-preview-form');
  const capPreviewResetButton = document.getElementById('reading-cap-preview-reset');
  const capPreviewCancelButton = document.getElementById('reading-cap-preview-cancel');

  if (capPreviewDialog && capPreviewSelect && capPreviewForm && capPreviewResetButton && capPreviewCancelButton) {
    for (const stage of stages) {
      const option = document.createElement('option');
      option.value = stage.key;
      option.textContent = stage.label;
      capPreviewSelect.append(option);
    }

    window.addEventListener('keydown', event => {
      if (event.repeat || event.altKey || !event.shiftKey ||
        !(event.ctrlKey || event.metaKey) || event.code !== 'Period') return;
      if (typeof capPreviewDialog.showModal !== 'function') return;
      event.preventDefault();
      capPreviewSelect.value = readingCap.key;
      if (!capPreviewDialog.open) capPreviewDialog.showModal();
      capPreviewSelect.focus();
    });

    capPreviewForm.addEventListener('submit', event => {
      event.preventDefault();
      const requested = stages.find(stage => stage.key === capPreviewSelect.value);
      if (!requested) return;
      readingCap = requested;
      capPreviewActive = true;
      renderReadingStageButtons();
      selectReadingStage(requested.key, { persist: false });
      capPreviewDialog.close();
      selectedReadingLink.focus();
    });

    capPreviewResetButton.addEventListener('click', () => {
      readingCap = clubReadingCap;
      capPreviewActive = false;
      renderReadingStageButtons();
      selectReadingStage(loadReadingStage().key, { persist: false });
      capPreviewDialog.close();
      selectedReadingLink.focus();
    });

    capPreviewCancelButton.addEventListener('click', () => capPreviewDialog.close());
  }

  renderReadingStageButtons();

  window.addEventListener('hashchange', () => {
    const id = characterFromHash();
    if (id) showCharacter(id, { updateHash: false });
    const conceptId = appendixEntryFromHash();
    if (conceptId) showAppendixEntry(conceptId, { updateHash: false });
  });

  appendixSearchInput?.addEventListener('input', renderAppendix);
  appendixClearButton?.addEventListener('click', () => {
    appendixSearchInput.value = '';
    renderAppendix();
    appendixSearchInput.focus();
  });

  selectReadingStage(loadReadingStage().key, { persist: false });
  const initialAppendixEntryId = appendixEntryFromHash();
  if (initialAppendixEntryId) showAppendixEntry(initialAppendixEntryId, { updateHash: false });
})();

(() => {
  'use strict';

  const recapReader = document.querySelector('.recap-reader');
  if (!recapReader) return;
  const slides = [...recapReader.querySelectorAll('.slide')];
  if (!slides.length) return;

  const recapControls = document.querySelector('.recap-controls');
  const slideCounter = document.getElementById('counter');
  const sourceLink = document.getElementById('source-link');
  const previousButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const nextRecapLink = document.getElementById('next-recap');
  const startOverButton = document.getElementById('start-over');
  // Keep the document readable if required reader controls are missing.
  if (![recapControls, slideCounter, sourceLink, previousButton, nextButton, startOverButton].every(Boolean)) return;
  const sourcePagesBySlide = new Map();
  const panelImages = [...recapReader.querySelectorAll('.slide-media img')];
  const panelImagesBySlide = new Map(slides.map(slide => [slide, panelImages.filter(img => img.closest('.slide') === slide)]));

  function loadSlide(slide) {
    for (const img of panelImagesBySlide.get(slide) || []) img.loading = 'eager';
  }

  // Print includes every slide, including panels not yet visited in the reader.
  window.addEventListener('beforeprint', () => {
    panelImages.forEach(img => { img.loading = 'eager'; });
  });
  // Canonical act/intermission subdivisions, plus legacy act and recap prefixes.
  const panelFilenamePattern = /^(A\d+(?:\.?[AI]\d+)*|I\d+|R\d+)_(\d+)[_-]story-(\d+)\.(gif|png|jpe?g|webp)$/i;

  panelImages.forEach(img => {
    if (img.hasAttribute('data-external-diagram')) return;
    let filename;
    try {
      filename = decodeURIComponent(new URL(img.src).pathname.split('/').pop());
    } catch {
      return; // Unrecognized asset URLs do not prevent reading the recap.
    }
    const match = filename.match(panelFilenamePattern);
    if (!match) return;
    const [, section, , paddedPage] = match;
    const page = Number(paddedPage);
    if (!Number.isSafeInteger(page) || page < 1) return;
    const sectionLabel = /^R/i.test(section) ? `Recap ${Number(section.slice(1))}` :
      section.match(/[AI]\d+/gi).map(part =>
        `${/^I/i.test(part) ? 'Intermission' : 'Act'} ${part.slice(1)}`).join(', ');
    if (!img.hasAttribute('alt')) img.alt = `Homestuck ${sectionLabel}, page ${page}`;
    sourcePagesBySlide.set(img.closest('.slide'), page);
  });

  let currentSlideIndex = 0;
  function slideIndexFromHash() {
    const match = location.hash.match(/^#(\d+)$/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  }
  function showSlide(nextSlideIndex, updateHash = true) {
    const previousSlideIndex = currentSlideIndex;
    currentSlideIndex = Math.max(0, Math.min(slides.length - 1, nextSlideIndex));
    const isCover = slides[currentSlideIndex].classList.contains('slide-cover');
    const page = isCover ? undefined : sourcePagesBySlide.get(slides[currentSlideIndex]);
    const isLastSlide = currentSlideIndex === slides.length - 1;
    const focusedElement = document.activeElement;
    const focusedSlide = focusedElement.closest('.slide');
    // Move focus before hiding/disabling anything: browsers otherwise reset it to body.
    if ((focusedSlide && focusedSlide !== slides[currentSlideIndex]) ||
      (focusedElement === sourceLink && page === undefined) ||
      (focusedElement === previousButton && currentSlideIndex === 0) ||
      (focusedElement === nextButton && isLastSlide) ||
      (focusedElement === startOverButton && isCover) ||
      (focusedElement === nextRecapLink && !isLastSlide)) {
      recapReader.focus({ preventScroll: true });
    }
    slides.forEach((slide, n) => {
      slide.hidden = n !== currentSlideIndex;
      slide.classList.toggle('active', n === currentSlideIndex);
      slide.setAttribute('aria-label', `Slide ${n + 1} of ${slides.length}`);
    });
    // Fetch the selected panel and one ahead; other slides stay lazy.
    loadSlide(slides[currentSlideIndex]);
    loadSlide(slides[currentSlideIndex + 1]);
    slideCounter.textContent = `${currentSlideIndex + 1} / ${slides.length}`;
    (slides[currentSlideIndex].querySelector('.slide-media') || slides[currentSlideIndex]).append(slideCounter);
    slideCounter.hidden = isCover;
    startOverButton.disabled = isCover;
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
    previousButton.disabled = currentSlideIndex === 0;
    nextButton.disabled = isLastSlide;
    nextButton.hidden = nextButton.disabled && Boolean(nextRecapLink);
    if (nextRecapLink) {
      nextRecapLink.hidden = !nextButton.disabled;
    }
    if (updateHash) history.replaceState(null, '', `#${currentSlideIndex + 1}`);
    // After reading a long caption, start the next slide at its panel on small screens.
    if (currentSlideIndex !== previousSlideIndex && window.matchMedia('(max-width: 600px), (max-height: 600px)').matches) {
      recapReader.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  previousButton.addEventListener('click', () => showSlide(currentSlideIndex - 1));
  nextButton.addEventListener('click', () => showSlide(currentSlideIndex + 1));
  startOverButton.addEventListener('click', () => {
    if (startOverButton.disabled) return;
    showSlide(0);
    recapReader.focus({ preventScroll: true });
    recapReader.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    // Space/Enter on a focused control retain their native activation behavior.
    if (event.key === ' ' && event.target.closest('button, a, [role="button"]')) return;
    switch (event.key.toLowerCase()) {
      case 'arrowright': case 'pagedown': case ' ': showSlide(currentSlideIndex + 1); break;
      case 'arrowleft': case 'pageup': showSlide(currentSlideIndex - 1); break;
      case 'home': showSlide(0); break;
      case 'end': showSlide(slides.length - 1); break;
      default: return;
    }
    event.preventDefault();
  });
  recapReader.addEventListener('click', event => {
    if (event.target.closest('button, a') || window.getSelection().toString()) return;
    // Touch readers use the visible arrows, so taps while reading do not skip slides.
    if (event.pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches) return;
    const bounds = slides[currentSlideIndex].getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    showSlide(currentSlideIndex + (event.clientX < bounds.left + bounds.width * .35 ? -1 : 1));
  });
  window.addEventListener('hashchange', () => showSlide(slideIndexFromHash(), false));
  document.body.classList.add('is-presenting');
  recapControls.hidden = false;
  showSlide(slideIndexFromHash(), false);
})();
