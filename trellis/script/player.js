import { attemptActionOnTile } from './actions.js';
import { gameState, getTile, attemptPlayerMove, isWithinMap } from './state.js';

/**
 * Handles movement keys and updates player state.
 * Returns the number of minutes the player moved (0 if no movement).
 */
function handleMovementKeys(player, controls, inputState, config) {
    let dx = 0, dy = 0;

    if (inputState.keysPressed[controls.up]) { dy = -1; inputState.keysPressed[controls.up] = false; }
    else if (inputState.keysPressed[controls.down]) { dy = 1; inputState.keysPressed[controls.down] = false; }
    else if (inputState.keysPressed[controls.left]) { dx = -1; inputState.keysPressed[controls.left] = false; }
    else if (inputState.keysPressed[controls.right]) { dx = 1; inputState.keysPressed[controls.right] = false; }

    if (dx !== 0 || dy !== 0) {
        const timeCost = attemptPlayerMove(player, dx, dy, config);
        return timeCost;
    }
    return 0;
}

function handleSelectorKeys(player, controls, inputState, config) {
    const sel = gameState.selector;

    // Start selector movement from current selector position
    let newX = sel.x;
    let newY = sel.y;
    let selectorKeyPressed = false;

    // Selector movement is always relative to player position
    if (inputState.keysPressed[controls.selectUp]) {
        selectorKeyPressed = true;
        newX = player.x;
        newY = player.y - 1;
        inputState.keysPressed[controls.selectUp] = false;
    }
    if (inputState.keysPressed[controls.selectDown]) {
        selectorKeyPressed = true;
        newX = player.x;
        newY = player.y + 1;
        inputState.keysPressed[controls.selectDown] = false;
    }
    if (inputState.keysPressed[controls.selectLeft]) {
        selectorKeyPressed = true;
        newX = player.x - 1;
        newY = player.y;
        inputState.keysPressed[controls.selectLeft] = false;
    }
    if (inputState.keysPressed[controls.selectRight]) {
        selectorKeyPressed = true;
        newX = player.x + 1;
        newY = player.y;
        inputState.keysPressed[controls.selectRight] = false;
    }
    if (inputState.keysPressed[controls.resetSelector]) {
        selectorKeyPressed = true;
        newX = player.x;
        newY = player.y;
        inputState.keysPressed[controls.resetSelector] = false;
    }

    if (!isWithinMap(newX, newY, config)) return false;

    if (!selectorKeyPressed) {
        return false;
    }

    const moved = newX !== sel.x || newY !== sel.y;
    if (moved) {
        gameState.selector.x = newX;
        gameState.selector.y = newY;
    }

    return moved;
}

/**
 * Handles actions on the currently selected tile.
 * Only mutates state; no UI handling.
 */
function handleActionKeys(config, inputState, dailyStats) {
    const actionKeys = config.keyBindings.actions || {};
    const sel = gameState.selector;
    const tile = getTile(sel.x, sel.y, config);

    for (const [actionLabel, key] of Object.entries(actionKeys)) {
        if (!inputState.keysPressed[key]) continue;
        inputState.keysPressed[key] = false;

        const result = attemptActionOnTile(tile, actionLabel, config, null, dailyStats); // pass null for strings, UI handles it
        return { actionLabel, result }; // caller handles UI
    }
    return null;
}

let controlsInstalled = false;
export function initPlayer(inputState, config) {
    if (controlsInstalled) return;
    controlsInstalled = true;
    const keys = new Set(Object.entries(config.keyBindings)
        .filter(([name]) => name !== 'actions').map(([, key]) => key)
        .concat(Object.values(config.keyBindings.actions)));
    const clearKeys = () => { inputState.keysPressed = {}; };
    window.addEventListener('keydown', e => {
        if (e.defaultPrevented || inputState.modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (!keys.has(key)) return;
        e.preventDefault();
        inputState.keysPressed[key] = true;
    });
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });
}

/**
 * Updates player/selector state and returns info for UI handling.
 */
export function updatePlayer(config, inputState) {
    if (inputState.modalOpen) return null;

    const player = gameState.player;
    const controls = config.keyBindings;

    const movementTime = handleMovementKeys(player, controls, inputState, config);
    const selectorMoved = handleSelectorKeys(player, controls, inputState, config);
    const actionInfo = handleActionKeys(config, inputState, gameState.dailyStats);

    return {
        movementTime,
        selectorMoved,
        actionInfo
    };
}