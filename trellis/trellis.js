/* GLOBALS */

let gameData = null;

const gameState = {
    time: {
        currentTime: 0,
    },
    calendar: {
        currentWeek: 1,
        currentYear: 1,
        currentSeason: "Winter",
    },
    grid: {
        tiles: [],
        highlightedTile: { x: null, y: null },
    },
    player: {
        position: { x: null, y: null },
        inventory: {
            produce: [],
            fertilizer: 0,
            mulch: 0,
        },
    },
    score: {
        biodiversity: 0,
    },
};

/* INITIALIZATION */

window.onload = function () {
    const gameDataURL = document.querySelector('meta[name="game-data"]')?.content;
    if (!gameDataURL) {
        console.error("Game data URL is not defined in the HTML <meta> tag.");
        return;
    }

    fetch(gameDataURL)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load game data from ${gameDataURL}: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            gameData = data;
            console.log("Game data loaded successfully:\n", gameData);
            initGame();
        })
        .catch((error) => {
            console.error("Error fetching game data:", error);
        });
};

function initGame() {
    if (!gameData) {
        console.error("JSON game data is missing.");
        return;
    }

    const { CONFIG: config, UI: uiData, INVENTORY: inventoryData } = gameData;

    if (!config) {
        console.error("Config data is missing.");
        return;
    }
    if (!uiData) {
        console.error("UI data is missing.");
        return;
    }
    if (!inventoryData) {
        console.error("Inventory data is missing.");
        return;
    }

    initializeGameData(config);
    initializeGameState(config);
    initializeGrid(config);
    console.log("Grid initialized:", gameState.grid);
    initializeUI(uiData);
    initializeInventory(inventoryData);

    showTutorial();
}

// Assign static fields from JSON config to gameData
function initializeGameData(config) {
    Object.assign(gameData, {
        DAY_START: config.GAME_CONFIG.TIME.START,
        DAY_END: config.GAME_CONFIG.TIME.END,
        TILE_SIZE: config.GAME_CONFIG.GRID.TILE_SIZE,
        GRID_WIDTH: config.GAME_CONFIG.GRID.WIDTH,
        GRID_HEIGHT: config.GAME_CONFIG.GRID.HEIGHT,
        WEEKS_PER_SEASON: config.CALENDAR_CONFIG.WEEKS_PER_SEASON,
        SEASONS: config.CALENDAR_CONFIG.SEASONS,
        WEEKS_PER_YEAR: config.CALENDAR_CONFIG.WEEKS_PER_SEASON * config.CALENDAR_CONFIG.SEASONS.length,
        REGION_NAME: config.GAME_CONFIG.REGION_NAME,
        PEST_OUTBREAK_CHANCE: config.PEST_OUTBREAK_CHANCE,
        TILE_TYPES: config.TILE_CONFIG.TYPES,
        TILE_STATS: config.TILE_CONFIG.STATS || {},
        ACTIONS: config.ACTIONS,
        PLANT_DATA: config.PLANTS,
        KEY_BINDINGS: config.KEY_BINDINGS,
    });
}

// Assign dynamic fields to gameState
function initializeGameState(config) {
    Object.assign(gameState.time, {
        currentTime: config.GAME_CONFIG.TIME.START,
    });

    Object.assign(gameState.calendar, {
        currentWeek: config.GAME_CONFIG.DEFAULT_WEEK,
        currentYear: config.GAME_CONFIG.DEFAULT_YEAR,
        currentSeason: config.GAME_CONFIG.DEFAULT_SEASON,
    });

    gameState.player.position = {
        x: Math.floor(gameData.GRID_WIDTH / 2),
        y: Math.floor(gameData.GRID_HEIGHT / 2),
    };

    gameState.grid.highlightedTile = { ...gameState.player.position };
}

function initializeGrid(config) {
    gameState.grid.tiles = Array.from({ length: gameData.GRID_WIDTH }, () =>
        Array.from({ length: gameData.GRID_WIDTH }, () => {
            const defaultType = config.TILE_CONFIG.DEFAULT_TYPE;
            return structuredClone(gameData.TILE_TYPES[defaultType]);
        })
    );
}

function initializeUI(uiData) {
    Object.assign(gameData.UI, uiData);
    Object.entries(uiData).forEach(([sectionKey, sectionData]) => {
        renderUISection(sectionData.CONTAINER, sectionData);
        updateUISection(sectionData.CONTAINER, sectionData);
    });

    attachUIEventListeners();
    attachCanvasEventListeners();

    updateTimeDisplay();
    updateYearAndSeason();
    updateWeekDisplay();
    updateBiodiversityDisplay();
}

function initializeInventory(inventoryData) {
    Object.assign(gameState.player.inventory, inventoryData);
}

/* RENDERING */

function render() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
}

function drawGrid(context) {
    const tileStyles = {
        default: getComputedStyle(document.documentElement).getPropertyValue("--tile-default").trim(),
        moistureHigh: getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-high").trim(),
        moistureLow: getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-low").trim(),
        tilled: getComputedStyle(document.documentElement).getPropertyValue("--tile-tilled").trim(),
        plantMature: getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-mature").trim(),
        plantYoung: getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-young").trim(),
        highlight: getComputedStyle(document.documentElement).getPropertyValue("--tile-highlight").trim(),
        player: getComputedStyle(document.documentElement).getPropertyValue("--tile-player").trim(),
        border: getComputedStyle(document.documentElement).getPropertyValue("--color-canvas-border").trim()
    };

    for (let row = 0; row < gameData.GRID_HEIGHT; row++) {
        for (let col = 0; col < gameData.GRID_WIDTH; col++) {
            const tile = gameState.grid.tiles[row][col];
            let tileColor = tileStyles.default;
            const tileType = gameData.TILE_TYPES[tile.TYPE.VALUE];

            if (tileType && tileType.COLOR) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue(tileType.COLOR).trim();
            }
            if (tile.MOISTURE.VALUE > 70) {
                tileColor = tileStyles.moistureHigh;
            } else if (tile.MOISTURE.VALUE < 30) {
                tileColor = tileStyles.moistureLow;
            }
            if (tile.IS_TILLED) {
                tileColor = tileStyles.tilled;
            }
            if (tile.PLANT_DATA.VALUE) {
                tileColor = tile.PLANT_DATA.VALUE.IS_MATURE ? tileStyles.plantMature : tileStyles.plantYoung;
            }

            context.fillStyle = tileColor;
            context.fillRect(col * gameState.grid.tileSize, row * gameState.grid.tileSize, gameState.grid.tileSize, gameState.grid.tileSize);

            context.strokeStyle = (row === gameState.grid.highlightedTile.y && col === gameState.grid.highlightedTile.x) ? tileStyles.highlight : tileStyles.border;
            context.lineWidth = (row === gameState.grid.highlightedTile.y && col === gameState.grid.highlightedTile.x) ? 3 : 1;
            context.strokeRect(col * gameState.grid.tileSize, row * gameState.grid.tileSize, gameState.grid.tileSize, gameState.grid.tileSize);

            if (row === gameState.player.position.y && col === gameState.player.position.x) {
                context.strokeStyle = tileStyles.player;
                context.lineWidth = 3;
                context.strokeRect(col * gameState.grid.tileSize + 1, row * gameState.grid.tileSize + 1, gameState.grid.tileSize - 2, gameState.grid.tileSize - 2);
            }
        }
    }
}

function renderUISection(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container with ID '${containerId}' not found in the DOM.`);
        return;
    }
    if (!data) {
        console.warn(`No data provided for container '${containerId}'.`);
        return;
    }
    if (!data.FIELDS) {
        console.warn(`No fields provided for container '${containerId}'.`);
        return;
    }

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Loop through each field and render its UI
    data.FIELDS.forEach((fieldKey) => {
        const fieldData = gameData.FIELDS[fieldKey];
        if (!fieldData) {
            console.warn(`Field data for key '${fieldKey}' not found.`);
            return;
        }

        if (fieldData.SECTION_TYPE === "BUTTON") {
            const button = createElement("button", {
                id: fieldData.ID,
                className: gameData.UI_COMPONENTS.BUTTON.CLASS,
                textContent: fieldData.LABEL || "Button",
            });

            // Attach click handler
            if (fieldData.ON_CLICK) {
                button.addEventListener("click", () => {
                    const handler = window[fieldData.ON_CLICK];
                    if (typeof handler === "function") {
                        handler();
                    } else {
                        console.error(`Handler function '${fieldData.ON_CLICK}' not found.`);
                    }
                });
            }

            container.appendChild(button);
        } else if (fieldData.SECTION_TYPE === "FIELD_LABEL") {
            // Handle FIELD_LABEL section type
            const fieldContainer = createElement(gameData.UI_COMPONENTS.FIELD_CONTAINER.TAG, {
                className: gameData.UI_COMPONENTS.FIELD_CONTAINER.CLASS,
            });

            // Create the label
            const labelElement = createElement(gameData.UI_COMPONENTS.FIELD_LABEL.TAG, {
                className: gameData.UI_COMPONENTS.FIELD_LABEL.CLASS,
                textContent: `${fieldData.LABEL}:`, // Set LABEL for the field
            });

            fieldContainer.appendChild(labelElement);
            container.appendChild(fieldContainer);

            // Render subfields if they exist
            if (fieldData.SUBFIELDS) {
                renderSubfields(container, fieldData.SUBFIELDS, 1);
            } else if (fieldData.DEFAULT_VALUE !== undefined) {
                // Render the default value if no subfields exist
                const valueElement = createElement(gameData.UI_COMPONENTS.FIELD_VALUE.TAG, {
                    id: fieldData.ID,
                    className: gameData.UI_COMPONENTS.FIELD_VALUE.CLASS,
                    textContent: fieldData.DEFAULT_VALUE,
                });
                if (!valueElement) {
                    console.error(`Failed to create value element for field '${fieldData.ID}'.`);
                }
                fieldContainer.appendChild(valueElement);
            } else {
                console.warn(`No default value provided for field '${fieldKey}'.`);
            }
        } else {
            console.warn(`Unknown SECTION_TYPE: '${fieldData.SECTION_TYPE}' for field '${fieldKey}'.`);
        }
    });
}

function renderSubfields(container, subfields, defaultValues, level = 1) {
    Object.entries(subfields).forEach(([key, subfieldData]) => {
        const subfieldContainer = createElement(gameData.UI_COMPONENTS.SUBFIELD_CONTAINER.TAG, {
            className: gameData.UI_COMPONENTS.SUBFIELD_CONTAINER.CLASS,
            style: `--level: ${level};`, // Optional styling for hierarchy
        });

        const labelElement = createElement(gameData.UI_COMPONENTS.FIELD_LABEL.TAG, {
            className: gameData.UI_COMPONENTS.FIELD_LABEL.CLASS,
            textContent: `${subfieldData.LABEL}:`, // Use LABEL for subfield
        });

        const valueElement = createElement(gameData.UI_COMPONENTS.FIELD_VALUE.TAG, {
            id: subfieldData.ID,
            className: gameData.UI_COMPONENTS.FIELD_VALUE.CLASS,
            textContent: defaultValues[key] || subfieldData.DEFAULT_VALUE, // Display the default value for the subfield
        });

        subfieldContainer.appendChild(labelElement);
        subfieldContainer.appendChild(valueElement);

        // Append the subfield container after the parent container
        container.appendChild(subfieldContainer);

        // Recursively render nested subfields
        if (subfieldData.SUBFIELDS) {
            renderSubfields(container, subfieldData.SUBFIELDS, defaultValues[key], level + 1);
        }
    });
}

function updateUISection(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container missing for container with ID: ${containerId}`);
        return;
    }
    if (!data || !data.FIELDS) {
        console.error(`Data missing for container with ID: ${containerId}`);
        return;
    }

    Object.entries(data.FIELDS).forEach(([fieldKey, fieldData]) => {
        const fieldElement = document.getElementById(fieldData.ID);
        if (!fieldElement) {
            console.warn(`Field element with ID '${fieldData.ID}' not found.`);
            return;
        }

        // Handle button updates
        if (fieldData.SECTION_TYPE === "BUTTON") {
            if (fieldData.LABEL) {
                fieldElement.textContent = fieldData.LABEL; // Always preserve LABEL
            }
        } else {
            // Update other field types (e.g., FIELD_LABEL)
            const newValue = fieldData.DEFAULT_VALUE || "";
            if (newValue !== undefined) {
                fieldElement.textContent = newValue;
            }
        }
    });
}

function updateField(fieldId, value) {
    if (!fieldId) {
        console.error("Field ID is missing.");
        return;
    }

    const fieldElement = document.getElementById(fieldId);
    if (!fieldElement) {
        console.error(`Field element with ID '${fieldId}' not found. Cannot update to value: ${value}`);
        return;
    }

    if (typeof value === "object") {
        console.warn(`Skipping update for field '${fieldId}' because the value is an object.`);
        return;
    }

    fieldElement.textContent = value;
}

function updateStatsFromFields(fields, sourceData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element with id '${containerId}' not found.`);
        return;
    }

    fields.forEach(fieldKey => {
        const fieldConfig = safeGet(gameData.FIELDS, fieldKey, null);
        if (!fieldConfig) {
            console.error(`Field configuration for '${fieldKey}' not found.`);
            return;
        }

        let value = safeGet(sourceData, `${fieldKey}.VALUE`, fieldConfig.DEFAULT_VALUE);
        if (fieldConfig.SUBFIELDS) {
            updateSubfields(fieldConfig.SUBFIELDS, value);
        } else {
            updateField(fieldConfig.ID, value);
        }
    });
}

function updateSubfields(subfields, values) {
    Object.entries(subfields).forEach(([key, subfieldConfig]) => {
        const subfieldValue = safeGet(values, key, subfieldConfig.DEFAULT_VALUE);
        updateField(subfieldConfig.ID, subfieldValue);

        if (subfieldConfig.SUBFIELDS) {
            updateSubfields(subfieldConfig.SUBFIELDS, subfieldValue);
        }
    });
}

function appendTileStat(container, label, id) {
    const sectionType = gameData.UI_COMPONENTS.FIELD_CONTAINER;
    const labelType = gameData.UI_COMPONENTS.LABEL;
    const valueType = gameData.UI_COMPONENTS.VALUE;
    const uiClasses = gameData.UI_CLASSES;

    const field = createElement(sectionType.TAG, {
        className: sectionType.CLASS || uiClasses.FIELD_CONTAINER
    });

    const labelSpan = createElement(labelType.TAG, {
        className: labelType.CLASS || uiClasses.FIELD_LABEL,
        textContent: `${capitalize(label)}: `
    });
    field.appendChild(labelSpan);

    const valueSpan = createElement(valueType.TAG, {
        id: id,
        className: valueType.CLASS || uiClasses.FIELD_VALUE,
        textContent: "N/A"
    });
    field.appendChild(valueSpan);

    container.appendChild(field);
}

/* EVENT LISTENERS */

function attachUIEventListeners() {
    const buttons = document.querySelectorAll("[data-on-click]");
    const handlers = {};

    buttons.forEach(button => {
        const handlerName = button.dataset.onClick;
        if (!handlers[handlerName]) {
            handlers[handlerName] = window[handlerName];
        }
        const handler = handlers[handlerName];
        if (typeof handler === "function") {
            button.addEventListener("click", handler);
        } else {
            console.error(`Handler function '${handlerName}' not found for button:`, button);
        }
    });

    window.addEventListener("keydown", preventKeyBindingScroll);
    window.addEventListener("keydown", handleKeyDown);
}

function preventKeyBindingScroll(e) {
    const keyBindings = gameData.KEY_BINDINGS;
    if (Object.values(keyBindings).includes(e.key)) {
        e.preventDefault();
    }
}

function handleKeyDown(e) {
    let newX = gameState.player.position.x;
    let newY = gameState.player.position.y;

    const keyBindings = gameData.CONFIG.KEY_BINDINGS;

    switch (e.key) {
        case keyBindings.PLAYER_MOVE_UP:
            newY = gameState.player.position.y - 1;
            break;
        case keyBindings.PLAYER_MOVE_DOWN:
            newY = gameState.player.position.y + 1;
            break;
        case keyBindings.PLAYER_MOVE_LEFT:
            newX = gameState.player.position.x - 1;
            break;
        case keyBindings.PLAYER_MOVE_RIGHT:
            newX = gameState.player.position.x + 1;
            break;
        case keyBindings.HIGHLIGHT_TILE_UP:
            highlightTile(gameState.grid.highlightedTile.x, gameState.grid.highlightedTile.y - 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_DOWN:
            highlightTile(gameState.grid.highlightedTile.x, gameState.grid.highlightedTile.y + 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_LEFT:
            highlightTile(gameState.grid.highlightedTile.x - 1, gameState.grid.highlightedTile.y);
            return;
        case keyBindings.HIGHLIGHT_TILE_RIGHT:
            highlightTile(gameState.grid.highlightedTile.x + 1, gameState.grid.highlightedTile.y);
            return;
        case keyBindings.RESET_HIGHLIGHT:
            highlightTile(gameState.player.position.x, gameState.player.position.y);
            return;
        default:
            const actionKey = Object.keys(keyBindings).find(key => keyBindings[key] === e.key);
            if (actionKey && actionKey.startsWith("ACTION_")) {
                const action = actionKey.replace("ACTION_", "").toLowerCase();
                handleTileAction(action, getTargetTile());
                return;
            }
            console.warn(`Unhandled key press: '${e.key}'`);
            break;
    }

    if (newX !== gameState.player.position.x || newY !== gameState.player.position.y) {
        if (
            newX >= 0 &&
            newX < gameState.grid.width &&
            newY >= 0 &&
            newY < gameState.grid.height &&
            gameState.grid.tiles[newY][newX].TYPE.VALUE !== gameState.tileType.PLOT
        ) {
            gameState.player.position.x = newX;
            gameState.player.position.y = newY;

            highlightTile(gameState.player.position.x, gameState.player.position.y);

            render();
        } else {
            console.log("Cannot move onto this tile!");
        }
    }
}

function attachCanvasEventListeners() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }

    const handleClick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / gameData.TILE_SIZE);
        const y = Math.floor((e.clientY - rect.top) / gameData.TILE_SIZE);

        highlightTile(x, y);
    };

    canvas.addEventListener("click", handleClick);

    canvas._handleClick = handleClick;
}

function detachCanvasEventListeners() {
    const canvas = document.getElementById("gameCanvas");

    if (canvas && canvas._handleClick) {
        canvas.removeEventListener("click", canvas._handleClick);
        delete canvas._handleClick;
    }
}

/* TIME & WEEK LOGIC */

function advanceTime(minutes) {
    gameState.time.currentTime += minutes;

    if (gameState.time.currentTime >= gameData.DAY_END) {
        skipToNextWeek();
    } else {
        updateTimeDisplay();
        render();
    }
}

function skipToNextWeek() {
    gameState.calendar.currentWeek++;
    gameState.time.currentTime = gameData.DAY_START;

    updateYearAndSeason();

    updateAllTiles();
    updateBiodiversity();

    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
    updateTileStats();

    render();
}

function updateYearAndSeason() {
    gameState.calendar.currentYear = Math.floor(gameState.calendar.currentWeek / gameData.WEEKS_PER_YEAR) + 1;
    gameState.calendar.currentSeason = gameData.SEASONS[Math.floor((gameState.calendar.currentWeek % gameData.WEEKS_PER_YEAR) / gameData.WEEKS_PER_SEASON)];

    const yearField = gameData.FIELDS.YEAR;
    updateField(yearField.ID, gameState.calendar.currentYear);

    const seasonField = gameData.FIELDS.SEASON;
    updateField(seasonField.ID, gameState.calendar.currentSeason);
}

function updateBiodiversity() {
    const typesFound = new Set();

    for (let row = 0; row < gameState.grid.height; row++) {
        for (let col = 0; col < gameState.grid.width; col++) {
            const tile = gameState.grid.tiles[row][col];
            if (tile.PLANT_DATA.VALUE) {
                typesFound.add(tile.PLANT_DATA.VALUE.NAME);
            }
        }
    }

    gameState.score.biodiversity = typesFound.size;
    return gameState.score.biodiversity;
}

/* PLAYER MOVEMENT & CONTROLS */

function resetPlayerPosition() {
    if (!gameState.grid.tiles || gameState.grid.tiles.length === 0) {
        console.error("Cannot reset player position: grid not initialized.");
        return;
    }

    gameState.player.position.x = Math.floor(gameState.grid.width / 2);
    gameState.player.position.y = Math.floor(gameState.grid.height / 2);

    gameState.grid.highlightedTile = {
        x: gameState.player.position.x,
        y: gameState.player.position.y
    };

    highlightTile(gameState.player.position.x, gameState.player.position.y);
    updateTileStats();
    render();
}

function highlightTile(x, y) {
    if (isTileValid(x, y) && isTileAdjacent(x, y)) {
        gameState.grid.highlightedTile = {
            x,
            y
        };
        updateTileStats();
        render();
    } else {
        console.log("Invalid tile for highlighting.");
    }
}

/* TILE & GRID UPDATES */

function updateAllTiles() {
    for (let row = 0; row < gameState.grid.height; row++) {
        for (let col = 0; col < gameState.grid.width; col++) {
            const tile = gameState.grid.tiles[row][col];
            updateTileMoisture(tile);
            updateTilePlant(tile, row, col);
        }
    }
}

function updateTileMoisture(tile) {
    if (!tile.MOISTURE || !tile.MOISTURE.VALUE) {
        console.warn("Tile moisture data is missing.");
        return;
    }

    tile.MOISTURE.VALUE = Math.max(tile.MOISTURE.VALUE - gameState.baseMoistureDecay, 0);
    if (tile.MOISTURE_DECAY_RATE) {
        tile.MOISTURE.VALUE = Math.max(tile.MOISTURE.VALUE - tile.MOISTURE_DECAY_RATE, 0);
    }

    tile.MOISTURE.VALUE = Math.min(tile.MOISTURE.VALUE, 100);
}

function updateTilePlant(tile, row, col) {
    if (!tile.PLANT_DATA || !tile.PLANT_DATA.VALUE) {
        console.warn(`Plant data missing for tile at (${row}, ${col}).`);
        return;
    }
    const plantName = tile.PLANT_DATA.VALUE.NAME;
    const plantData = gameData.PLANT_DATA[plantName];

    const { N, P, K } = tile.SOIL_NUTRIENTS;
    const sufficientNutrients = N >= 30 && P >= 20 && K >= 20;
    const sufficientMoisture = tile.MOISTURE.VALUE >= 40;

    if (sufficientNutrients && sufficientMoisture) {
        tile.PLANT_DATA.VALUE.AGE += 1;
    } else {
        console.log(`Plant at (${row}, ${col}) is growing slowly due to poor conditions.`);
    }

    if (sufficientNutrients) {
        tile.SOIL_NUTRIENTS.N.VALUE = Math.max(N - 10, 0);
        tile.SOIL_NUTRIENTS.P.VALUE = Math.max(P - 5, 0);
        tile.SOIL_NUTRIENTS.K.VALUE = Math.max(K - 5, 0);
    }

    if (tile.PLANT_DATA.VALUE.AGE >= plantData.GROWTH_TIME) {
        tile.PLANT_DATA.VALUE.IS_MATURE = true;
    }
}

function updateTileStats() {
    const { x, y } = gameState.grid.highlightedTile;
    const tile = gameState.grid.tiles[y][x];

    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    updateStatsFromFields(gameData.UI.TILE_STATS.FIELDS, tile, gameData.UI.TILE_STATS.CONTAINER);
}

/* UI UPDATES */

function updateTimeDisplay() {
    const totalMinutes = gameState.time.currentTime;
    const hours = Math.floor(totalMinutes / 60) % 12 || 12;
    const minutes = totalMinutes % 60;
    const ampm = totalMinutes < 720 ? "AM" : "PM";
    const formattedTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;

    const timeField = gameData.FIELDS.TIME;
    updateField(timeField.ID, formattedTime);
}

function updateWeekDisplay() {
    const weekField = gameData.FIELDS.WEEK;
    updateField(weekField.ID, gameState.calendar.currentWeek);
}

function updateBiodiversityDisplay() {
    const biodiversityField = gameData.FIELDS.BIODIVERSITY;
    updateField(biodiversityField.ID, gameState.score.biodiversity);
}

/* PLAYER ACTIONS */

function handleTileAction(action, tile, params = {}) {
    const actions = gameState.actions;
    const actionConfig = gameData.ACTIONS[action.toUpperCase()];

    if (!actionConfig) {
        console.warn(`Unhandled tile action: '${action}'`);
        return;
    }

    const functionName = actionConfig.ON_CLICK;
    const functionParams = actionConfig.PARAMS || {};
    const timeCost = actionConfig.TIME_COST;

    const actionFunction = window[functionName];

    if (typeof actionFunction !== "function") {
        console.error(`Function '${functionName}' not found for action '${action}'`);
        return;
    }

    actionFunction(tile, { ...params, ...functionParams });

    // Deduct time cost from the game state
    gameState.time.currentTime += timeCost;

    updateTileStats();
    render();
}

function tillSoil(tile) {
    if (tile.TYPE.VALUE === TILE_TYPES.EMPTY) {
        tile.TYPE.VALUE = TILE_TYPES.PLOT;
        tile.IS_TILLED = true;
        advanceTime(gameData.CONFIG.ACTIONS.TILL.TIME_COST);
    } else {
        console.log("Cannot till this tile.");
    }
}

function fertilizeTile(tile) {
    if (tile.IS_TILLED && gameState.inventory.fertilizer > 0) {
        tile.SOIL_NUTRIENTS.N += 10;
        tile.SOIL_NUTRIENTS.P += 5;
        tile.SOIL_NUTRIENTS.K += 5;
        updateInventory('fertilizer', -1);
        advanceTime(gameData.CONFIG.ACTIONS.FERTILIZE.TIME_COST);
    } else {
        console.log("Cannot fertilize this tile.");
    }
}

function plantSeed(tile, seedType = "tomato") {
    if (tile.IS_TILLED && !tile.PLANT_DATA.VALUE) {
        tile.PLANT_DATA.VALUE = {
            NAME: seedType,
            AGE: 0,
            IS_MATURE: false
        };
        advanceTime(gameData.CONFIG.ACTIONS.PLANT.TIME_COST);
    } else {
        console.log("Cannot plant on this tile.");
    }
}

function waterTile(tile) {
    tile.MOISTURE.VALUE = Math.min(tile.MOISTURE.VALUE + 20, 100);
    advanceTime(gameData.CONFIG.ACTIONS.WATER.TIME_COST);
}

function mulchTile(tile) {
    if (tile.IS_TILLED && gameState.inventory.mulch > 0) {
        tile.MOISTURE_DECAY_RATE = Math.max(tile.MOISTURE_DECAY_RATE - 1, 0);
        updateInventory('mulch', -1);
        advanceTime(gameData.CONFIG.ACTIONS.MULCH.TIME_COST);
    } else {
        console.log("Cannot apply mulch to this tile.");
    }
}

function weedTile(tile) {
    if (tile.WEED_LEVEL.VALUE > 0) {
        tile.WEED_LEVEL.VALUE = 0;
        advanceTime(gameData.CONFIG.ACTIONS.WEED.TIME_COST);
    } else {
        console.log("No weeds to remove.");
    }
}

function harvestPlant(tile) {
    if (tile.PLANT_DATA.VALUE && tile.PLANT_DATA.VALUE.IS_MATURE) {
        const plantType = tile.PLANT_DATA.VALUE.NAME;
        const yieldAmount = PLANT_DATA[plantType].YIELD;
        updateInventory(`produce.${plantType}`, yieldAmount);
        tile.PLANT_DATA.VALUE = null;
        tile.IS_TILLED = false;
        advanceTime(gameData.CONFIG.ACTIONS.HARVEST.TIME_COST);
    } else {
        console.log("No mature plant to harvest.");
    }
}

function clearPlot(tile) {
    if (tile.TYPE.VALUE === TILE_TYPES.PLOT) {
        tile.TYPE.VALUE = TILE_TYPES.EMPTY;
        tile.IS_TILLED = false;
        tile.PLANT_DATA.VALUE = null;
        advanceTime(gameData.CONFIG.ACTIONS.CLEAR.TIME_COST);
    } else {
        console.log("This tile is not a plot.");
    }
}

/* INVENTORY */

function updateInventory(item, delta) {
    const [category, itemKey] = item.split('.');
    const inventoryCategory = gameState.inventory[category];
    if (!inventoryCategory || !(itemKey in inventoryCategory)) {
        console.error(`Inventory item '${itemKey}' not found in category '${category}'.`);
        return;
    }

    inventoryCategory[itemKey] = Math.max(0, inventoryCategory[itemKey] + delta);
    updateField(`${category}.${itemKey}`, inventoryCategory[itemKey]);
}

/* TUTORIAL OVERLAY */

function showTutorial() {
    document.getElementById("tutorialOverlay").classList.remove("hidden");
}

function hideTutorial() {
    document.getElementById("tutorialOverlay").classList.add("hidden");
}

/* UTILITY ON_CLICKS */

function getTargetTile() {
    const { x, y } = gameState.highlightedTile.x !== null ?
        gameState.highlightedTile : gameState.player;
    if (x === null || y === null) {
        console.error("Target tile coordinates are invalid:", { x, y });
        return null;
    }
    return { x, y };
}

function isTileValid(x, y) {
    return x >= 0 && x < gameData.GRID_WIDTH && y >= 0 && y < gameData.GRID_HEIGHT;
}

function isTileAdjacent(x, y) {
    return Math.abs(gameState.player.x - x) + Math.abs(gameState.player.y - y) <= 1;
}

function safeGet(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((acc, part) => {
        if (acc && acc.hasOwnProperty(part)) {
            return acc[part];
        }
        return undefined;
    }, obj) ?? defaultValue;
}

function createAndAppendElement(container, tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent) element.textContent = options.textContent;
    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    container.appendChild(element);
    return element;
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent !== undefined) { // Ensure textContent is explicitly set
        element.textContent = options.textContent;
    } else {
        console.warn(`No textContent provided for element with tag: ${tag} and id: ${options.id}`);
    }
    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }
    
    return element;
}

function capitalize(str) {
    if (typeof str !== "string") {
        console.warn("capitalize called with non-string:", str);
        return String(str || "").toUpperCase();
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}