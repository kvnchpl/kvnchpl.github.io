import {parseSavedGame} from './saves.js';
import {
    getBlockedActionMessages
} from './actions.js';

import {
    initPlayer,
    updatePlayer
} from './player.js';

import {
    render,
    refreshScreenIfChanged,
    preloadImages,
    resizeCanvasAndTiles,
    updateFog
} from './renderer.js';

import {
    gameState,
    initState,
    getTile,
    saveGameState,
    readSavedGame,
    clearSavedGame,
    protectSavedGame
} from './state.js';

import {
    updateTileInfoPanel,
    updateTimePanel,
    inputState,
    loadStrings,
    showModal,
    closeModal,
    updateSaveSizeDisplay,
    incrementTimeUI,
    finalizeAction,
    strings
} from './ui.js';

const configUrl = 'config.json';
let config;

async function fetchConfig() {
    try {
        const response = await fetch(configUrl);
        if (!response.ok) throw new Error('Failed to load config');
        config = await response.json();
        return config;
    } catch (error) {
        console.error('Error loading config:', error);
        throw error;
    }
}

function loadGameState() {
    const saved = readSavedGame();
    if (saved === null) return false;
    try {
        const data = parseSavedGame(saved, config);
        Object.assign(gameState, data);
        // Game loaded successfully
        return true;
    } catch (e) {
        protectSavedGame();
        console.warn("Previous save preserved; playing a temporary farm.");
        return false;
    }
}

function startNewGame() {
    showModal('gameMessage', {
        title: "Start a new game?",
        message: "This will replace your current farm and any previous save.",
        confirmText: "OK",
        cancelText: "Cancel",
        onConfirm: () => {
            clearSavedGame();
            initState(config);
            updateFog(config);
            updateTimePanel(config);
            render(config);
            updateTileInfoPanel(config);
            updateSaveSizeDisplay(config);
        }
    });
}

function endDayPrompt() {
    showModal('gameMessage', {
        title: "End the day?",
        message: "You won’t be able to take more actions today.",
        confirmText: "End Day",
        cancelText: "Cancel",
        onConfirm: () => showModal('dayComplete', { ...gameState.dailyStats }, config)
    });
}

async function initGame(loadExisting = true) {
    await fetchConfig();
    await loadStrings();

    window.addEventListener('resize', () => {
        resizeCanvasAndTiles(config);
        render(config);
    });

    // Ensure images are loaded before any render
    await preloadImages(config);
    resizeCanvasAndTiles(config);
    render(config);

    if (loadExisting && loadGameState()) {
        console.log("Loaded game from localStorage.");
        gameState.selector = {
            ...gameState.player
        };
        updateFog(config);

        // Force initial render
        render(config);
        updateTileInfoPanel(config);
        updateTimePanel(config);
    } else {
        initState(config);
        saveGameState(config);
        updateSaveSizeDisplay(config);
    }

    initPlayer(inputState, config);
    if (gameState.time.hour >= config.dayEndHour) {
        showModal('dayComplete', { ...gameState.dailyStats }, config);
    }
    refreshScreenIfChanged(config);
    requestAnimationFrame(() => gameLoop(config));
}

function gameLoop(config) {
    if (!inputState.modalOpen) {
        const { movementTime, selectorMoved, actionInfo } = updatePlayer(config, inputState) || {};

        if (movementTime) {
            incrementTimeUI(movementTime, config);
            updateSaveSizeDisplay(config);
        }
        if (selectorMoved) {
            updateTileInfoPanel(config);
            render(config);
        }
        if (actionInfo) {
            const { actionLabel, result } = actionInfo;
            if (!result.success) {
                const tile = getTile(gameState.selector.x, gameState.selector.y, config);
                const actionDef = { ...config.tiles.actions[actionLabel], name: actionLabel };
                const reasonText = getBlockedActionMessages(tile, actionDef, strings);

                showModal('gameMessage', {
                    title: `Cannot ${strings.actions[actionLabel] || actionLabel} this tile`,
                    message: reasonText.length > 0 ? reasonText : ["The tile does not meet the requirements for this action."]
                });
            } else if (result.plantModal) {
                showModal('plantSelection', config, getTile(gameState.selector.x, gameState.selector.y, config), gameState.selector.x, gameState.selector.y);
            } else {
                finalizeAction(config.tiles.actions[actionLabel], config);
            }
        }
    }

    refreshScreenIfChanged(config);
    requestAnimationFrame(() => gameLoop(config));
}

initGame(true).catch((err) => {
    console.error('Error initializing game:', err);
    alert('Failed to start the game. Please try again later.');
}).then(() => {
    document.getElementById('download-save').addEventListener('click', () => {
        const saved = readSavedGame();
        if (saved === null) return;
        const url = URL.createObjectURL(new Blob([saved], {type: 'application/json'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'trellis-previous-save.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const newGameBtn = document.getElementById('new-game');
    const endDayBtn = document.getElementById('end-day');
    const cancelBtn = document.getElementById('plant-modal-cancel');
    const overlay = document.getElementById('plant-modal-overlay');

    newGameBtn.addEventListener('click', () => {
        startNewGame();
    });

    endDayBtn.addEventListener('click', () => {
        endDayPrompt();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
});
