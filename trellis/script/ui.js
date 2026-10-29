import {
    evaluateCondition,
    resetPlantState,
    attemptActionOnTile,
    getBlockedActionMessages
} from './actions.js';

import {
    render,
    updateTileInfoPanelIfChanged
} from './renderer.js';

import {
    gameState,
    getTile,
    resetDailyStats,
    advanceDay,
    advanceTime,
    updateGrowth,
    saveGameState,
    isSaveProtected
} from './state.js';

export const inputState = {
    modalOpen: false,
    keysPressed: {}
};

export let strings = {};

let plantModalButtonList = [];
let plantModalFocusedIndex = 0;
let lastSaveSizeUpdate = 0;
let returnFocus = null;
let returnAction = null;
let activeModal = null;

export const modalRegistry = {
    gameMessage: {
        overlayId: 'game-message-overlay',
        modalId: 'game-message-modal',
        setup: ({ title, message, confirmText = 'OK', cancelText, onConfirm, onCancel }) => {
            const overlay = document.getElementById('game-message-overlay');
            const titleEl = document.getElementById('game-message-title');
            const contentEl = document.getElementById('game-message-content');
            const confirmBtn = document.getElementById('game-message-confirm');
            const cancelBtn = document.getElementById('game-message-cancel');

            titleEl.textContent = title;
            contentEl.innerHTML = Array.isArray(message)
                ? `<ul>${message.map(m => `<li>${m}</li>`).join('')}</ul>`
                : `<div>${message}</div>`;

            confirmBtn.textContent = confirmText;
            confirmBtn.onclick = () => {
                showModal('closeAll');
                onConfirm?.();
            };

            if (cancelText) {
                cancelBtn.textContent = cancelText;
                cancelBtn.style.display = 'inline-block';
                cancelBtn.onclick = () => {
                    showModal('closeAll');
                    onCancel?.();
                };
            } else {
                cancelBtn.style.display = 'none';
            }

            overlay.style.display = 'flex';
            openModal();

            overlay.onclick = (e) => {
                if (e.target === overlay && cancelText) {
                    cancelBtn.click();
                }
            };

            confirmBtn.focus();
        }
    },
    plantSelection: {
        overlayId: 'plant-modal-overlay',
        modalId: 'plant-modal',
        setup: (config, tile, x, y) => {
            const overlay = document.getElementById('plant-modal-overlay');
            const container = document.getElementById('plant-modal-buttons');
            container.innerHTML = '';

            plantModalButtonList = [];
            plantModalFocusedIndex = 0;

            Object.entries(config.plants.definitions).forEach(([plantKey, def], idx) => {
                const btn = document.createElement('button');
                btn.textContent = `[${idx + 1}] ${def.label}`;
                btn.className = 'ui-button';
                btn.tabIndex = 0;
                btn.onclick = () => {
                    const newTile = resetPlantState({ ...tile });
                    newTile.plantType = plantKey;
                    newTile.growthStage = def.growthStages[0];
                    newTile.growthProgress = 0;

                    // Assign a random plant variant immediately
                    newTile.plantVariant = Math.floor(Math.random() * (config._imageCache.plants[plantKey][newTile.growthStage]?.length || 1));

                    gameState.map[`${x},${y}`] = newTile;
                    gameState.dailyStats.planted++;
                    showModal('closeAll');
                    finalizeAction(config.tiles.actions.plant, config);
                };
                container.appendChild(btn);
                plantModalButtonList.push(btn);
            });

            overlay.style.display = 'flex';
            openModal();

            if (plantModalButtonList.length > 0) {
                plantModalButtonList[0].focus();
            }

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    showModal('closeAll');
                }
            };
        }
    },
    dayComplete: {
        setup: (stats, config) => {
            const overlay = document.getElementById('game-message-overlay');
            const titleEl = document.getElementById('game-message-title');
            const contentEl = document.getElementById('game-message-content');
            const confirmBtn = document.getElementById('game-message-confirm');
            const cancelBtn = document.getElementById('game-message-cancel');

            overlay.onclick = null;
            confirmBtn.textContent = 'Continue';
            titleEl.textContent = 'DAY COMPLETE';
            contentEl.innerHTML = `
            <div>Steps walked: ${stats.steps}</div>
            <div>Crops planted: ${stats.planted}</div>
            <div>Tiles tilled: ${stats.tilled}</div>
            <div>Tiles watered: ${stats.watered}</div>
            <div>Tiles fertilized: ${stats.fertilized}</div>
            <div>Crops harvested: ${stats.harvested}</div>
        `;

            // Hide cancel button
            cancelBtn.style.display = 'none';

            overlay.style.display = 'flex';
            openModal();
            confirmBtn.focus();

            confirmBtn.onclick = () => {
                showModal('closeAll');
                // Advance to next day
                advanceDay(config);
                resetDailyStats();
                // Growth occurs exactly once when a week is completed.
                updateGrowth(config);
                updateTileInfoPanel(config);
                render(config);
                updateTimePanel(config);
                saveGameState(config);
                updateSaveSizeDisplay(config);
            };
        }
    },

};

export function showModal(type, ...args) {
    if (type === 'closeAll') { closeModal(); return; }
    const modal = modalRegistry[type];
    if (!modal) throw new Error(`Modal type '${type}' not registered`);
    if (!inputState.modalOpen) {
        returnFocus = document.activeElement;
        returnAction = returnFocus?.dataset.action || null;
    }
    document.getElementById('plant-modal-overlay').style.display = 'none';
    document.getElementById('game-message-overlay').style.display = 'none';
    activeModal = document.getElementById(type === 'plantSelection' ? 'plant-modal' : 'game-message-modal');
    modal.setup(...args);
}

export function openModal() {
    inputState.modalOpen = true;
    inputState.keysPressed = {};
    document.getElementById('top-button-bar').inert = true;
    document.getElementById('game-container').inert = true;
}

export function closeModal() {
    inputState.modalOpen = false;
    inputState.keysPressed = {};
    document.getElementById('plant-modal-overlay').style.display = 'none';
    document.getElementById('game-message-overlay').style.display = 'none';
    document.getElementById('top-button-bar').inert = false;
    document.getElementById('game-container').inert = false;
    activeModal = null;
    const target = returnAction
        ? document.querySelector(`[data-action="${returnAction}"]`) : returnFocus;
    (target?.isConnected ? target : document.getElementById('game-canvas')).focus({preventScroll: true});
    returnFocus = null;
    returnAction = null;
}

/**
 * Loads localized strings from external JSON file.
 */
export async function loadStrings() {
    try {
        const response = await fetch('./data/strings.json');
        if (!response.ok) throw new Error('Failed to load strings.json');
        strings = await response.json();
    } catch (err) {
        console.error('Error loading strings.json:', err);
    }
}

/**
 * Converts failed condition keys into human-readable messages.
 * Uses the unified getActionBlockReasons helper.
 * @param {string[]} failed - Array of failed condition keys/messages (ignored).
 * @param {string} actionLabel - The action being attempted.
 * @param {Object} tile - The tile object.
 * @param {Object} actionDef - The action definition.
 * @returns {string} Formatted reason text
 */
function formatFailedConditions(failed, actionLabel, tile, actionDef) {
    if (!actionDef || !tile) return '';

    // Delegate to unified action-block reason logic
    const reasons = getBlockedActionMessages(tile, { ...actionDef, name: actionLabel }, strings);

    return reasons;
}

/**
 * Finalizes an action by updating the UI, advancing time, saving the game, and rendering.
 * @param {Object} actionDef - The action definition.
 * @param {Object} config - Game configuration.
 */
export function finalizeAction(actionDef, config) {
    updateTileInfoPanel(config);

    // Animate changed values
    Object.entries(actionDef.effect).forEach(([key]) => {
        const el = document.getElementById(`tile-value-${key}`);
        if (el) {
            el.classList.remove('value-changed');
            void el.offsetWidth; // force reflow
            el.classList.add('value-changed');
        }
    });

    // Use per-action timeIncrement
    const timeInc = actionDef.timeIncrement ?? 1; // fallback to 1 if missing
    incrementTimeUI(timeInc, config);
    updateSaveSizeDisplay(config);

    render(config);
}

/**
 * Determines the correct image src and visibility for the tile info panel.
 * @param {Object} tile
 * @param {Object} config
 */
function _getTileImage(tile, config) {
    const imageEl = document.getElementById('tile-image');
    if (!imageEl) return;

    const fallbackImage = 'assets/debug/missing.png';

    // Plant image (with variants)
    if (tile.plantType && config.plants.images && config.plants.images[tile.plantType]) {
        const def = config.plants.definitions[tile.plantType];
        if (!def) {
            console.warn('Missing plant definition for', tile.plantType);
            imageEl.style.display = 'none';
            return;
        }

        const variants = config._imageCache.plants[tile.plantType]?.[tile.growthStage];
        if (!variants || variants.length === 0) {
            console.warn('Missing plant images for', tile.plantType, tile.growthStage);
            imageEl.style.display = 'none';
            return;
        }

        const idx = tile.plantVariant ?? 0;
        imageEl.src = variants[idx]?.src || fallbackImage;
        imageEl.style.display = 'block';
        return;
    }

    // Tile image (with variants)
    const imageKey = tile.tile || 'default';
    const variants = config._imageCache.tiles[imageKey];
    if (!variants || variants.length === 0) {
        console.warn('Missing tile images for', imageKey);
        imageEl.style.display = 'none';
        return;
    }

    const idx = tile.tileVariant ?? 0;
    imageEl.src = variants[idx]?.src || fallbackImage;
    imageEl.style.display = 'block';
}

/**
 * Formats the value for a given tile detail key, applying labels, booleans, percentages, etc.
 * @param {Object} tile
 * @param {string} key
 * @param {Object} config
 * @returns {Object} { label, value }
 */
function _formatTileDetailValue(tile, key, config) {
    let value = tile[key];

    // Normalize undefined or null to 'none' for tile and plantType
    if ((key === 'tile' || key === 'plantType') && (value === null || value === undefined)) {
        value = 'none';
    }

    // Handle boolean values: always display Yes or No
    if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
    }

    // Apply labels if defined
    if (key === 'tile' && config.tiles.labels && config.tiles.labels[value]) {
        value = config.tiles.labels[value];
    }
    if (key === 'plantType') {
        value = config.plants.definitions[value]?.label || value;
    }

    // Format numeric values
    if ((key === 'moisture' || key === 'fertility') && typeof value === 'number') {
        value = `${value}%`;
    }

    // Fallback if still no value
    if (value === null || value === undefined) {
        value = '–';
    }

    // Apply custom labels for these keys if defined
    const label = (config.tiles.labels && config.tiles.labels[key]) ?
        config.tiles.labels[key] :
        key;
    return { label, value };
}

/**
 * Renders the action buttons for the tile info panel.
 * @param {Object} tile
 * @param {Object} config
 */
function _renderActionButtons(tile, config) {
    const actionsEl = document.getElementById('tile-actions');
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    // Sort actions by their keyBindings number
    const sortedActions = Object.entries(config.tiles.actions)
        .sort(([aLabel], [bLabel]) => {
            const aKey = parseInt(config.keyBindings.actions[aLabel] || 99);
            const bKey = parseInt(config.keyBindings.actions[bLabel] || 99);
            return aKey - bKey;
        });

    for (const [actionLabel, actionDef] of sortedActions) {
        const isPlant = actionLabel === "plant";
        // Always get the current tile state in case it was updated
        const tileNow = getTile(gameState.selector.x, gameState.selector.y, config);
        let validNow = evaluateCondition(tileNow, actionDef.condition);
        // Prevent planting if tile already has a plant
        if (isPlant && tileNow.plantType) {
            validNow = false;
        }

        const key = config.keyBindings.actions[actionLabel] || '';
        const btn = document.createElement('button');
        btn.className = 'ui-button';
        btn.dataset.action = actionLabel;
        btn.textContent = `[${key}] ${actionLabel}`;

        if (!validNow) btn.classList.add('disabled');

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tileLatest = getTile(gameState.selector.x, gameState.selector.y, config);
            const valid = evaluateCondition(tileLatest, actionDef.condition);
            if (isPlant && tileLatest.plantType) {
                // Prevent planting if already planted
                return;
            }
            if (!valid) {
                const reasonText = formatFailedConditions(null, actionLabel, tileLatest, actionDef);
                showModal('gameMessage', {
                    title: `Cannot ${strings.actions[actionLabel] || actionLabel} this tile`,
                    message: Array.isArray(reasonText) ? reasonText : "The tile does not meet the requirements for this action."
                });
                return;
            }
            if (isPlant) {
                showModal('plantSelection', config, tileLatest, gameState.selector.x, gameState.selector.y);
            } else {
                attemptActionOnTile(tileLatest, actionLabel, config, strings, gameState.dailyStats);
                finalizeAction(actionDef, config);
            }
        };
        actionsEl.appendChild(btn);
    }
}

/**
 * Updates the tile information panel based on the currently selected tile.
 * @param {Object} config - Game configuration.
 */
export function updateTileInfoPanel(config) {
    const focusedAction = document.activeElement?.dataset.action;
    const tile = getTile(gameState.selector.x, gameState.selector.y, config);
    const detailsEl = document.getElementById('tile-details');
    if (!detailsEl) return;

    _getTileImage(tile, config);

    detailsEl.innerHTML = '';
    config.tiles.detailsOrder.forEach((key) => {
        const { label, value } = _formatTileDetailValue(tile, key, config);
        const p = document.createElement('p');
        p.innerHTML = `<strong>${label}:</strong> <span id="tile-value-${key}">${value}</span>`;
        detailsEl.appendChild(p);
    });

    _renderActionButtons(tile, config);
    if (focusedAction && !inputState.modalOpen) {
        document.querySelector(`[data-action="${focusedAction}"]`)?.focus({preventScroll: true});
    }
}

/**
 * Updates the time panel display.
 * @param {Object} config - Game configuration.
 */
export function updateTimePanel(config) {
    const el = document.getElementById('time-display');
    if (!el) return;
    const {
        hour,
        minute,
        week,
        seasonIndex
    } = gameState.time;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = ((hour - 1) % 12 + 1);
    const paddedMinute = minute.toString().padStart(2, '0');
    const season = config.seasons[seasonIndex];
    el.textContent = `${season} - WEEK ${week} - ${displayHour}:${paddedMinute} ${period}`;
}

export function incrementTimeUI(minutes, config) {
    advanceTime(minutes, config); // pure state update

    // Check for end-of-day
    if (gameState.time.hour >= config.dayEndHour) {
        showModal('dayComplete', { ...gameState.dailyStats }, config);
    }

    // Update UI elements
    updateTimePanel(config);
}

// One dialog handler owns each key, including focus containment.
document.addEventListener('keydown', e => {
    if (!inputState.modalOpen || !activeModal) return;
    const buttons = [...activeModal.querySelectorAll('button')]
        .filter(button => !button.disabled && button.getClientRects().length);
    const focused = document.activeElement;
    if (e.key === 'Tab') {
        e.preventDefault();
        const index = buttons.indexOf(focused);
        const next = (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
        return;
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        if (activeModal.id === 'plant-modal') closeModal();
        else if (document.getElementById('game-message-cancel').getClientRects().length) {
            document.getElementById('game-message-cancel').click();
        }
        return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (buttons.includes(focused)) focused.click();
        return;
    }
    if (activeModal.id !== 'plant-modal') return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const directions = {ArrowRight: 1, d: 1, ArrowLeft: -1, a: -1, ArrowDown: 2, s: 2, ArrowUp: -2, w: -2};
    if (Object.hasOwn(directions, key)) {
        e.preventDefault();
        const index = plantModalButtonList.indexOf(focused);
        plantModalFocusedIndex = Math.max(0, Math.min(plantModalButtonList.length - 1,
            (index < 0 ? 0 : index) + directions[key]));
        plantModalButtonList[plantModalFocusedIndex]?.focus();
    } else if (/^[1-9]$/.test(key)) {
        e.preventDefault();
        plantModalButtonList[Number(key) - 1]?.click();
    }
});

export function updateSaveSizeDisplay(config) {
    const saveEl = document.getElementById("save-size");
    if (!saveEl) return;

    document.getElementById('download-save').hidden = !isSaveProtected();
    const sizeInBytes = saveGameState(config);
    if (isSaveProtected()) {
        saveEl.textContent = 'Not saved: previous save could not be loaded and is preserved. Download it before using New Game to replace it.';
        return;
    }
    if (sizeInBytes === null) {
        saveEl.textContent = 'Not saved: browser storage is unavailable. Progress is kept for this visit.';
        return;
    }
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    let warningText = "";
    if (config?.saveSizeWarningKB && sizeInBytes > 1024 * config.saveSizeWarningKB) {
        warningText = " ⚠ nearing limit";
    }
    if (config?.saveSizeCriticalKB && sizeInBytes > 1024 * config.saveSizeCriticalKB) {
        warningText = " ⚠⚠ close to limit!";
    }

    saveEl.textContent = `(${sizeInKB} KB${warningText})`;
}

function maybeUpdateSaveSizeDisplay(config) {
    const now = performance.now();
    if (now - lastSaveSizeUpdate > 2000) {
        updateSaveSizeDisplay(config);
        lastSaveSizeUpdate = now;
    }
}

export function refreshUI(config) {
    updateTimePanel(config);
    updateTileInfoPanelIfChanged(config);
    maybeUpdateSaveSizeDisplay(config);
}
