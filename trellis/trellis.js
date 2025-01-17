/* GLOBALS */

let gameData = null;

let TILE_SIZE, GRID_WIDTH, GRID_HEIGHT;
let DAY_START, DAY_END;
let PEST_OUTBREAK_CHANCE;
let BASE_MOISTURE_START, BASE_MOISTURE_DECAY;
let REGION_NAME;

let TILE_TYPE = {};
let TILE_STAT = {};
let TIME_COST = {};
let GROWTH_TIME = {};
let PRODUCE_YIELD = {};
let PLANT_DATA = {};

let WEEKS_PER_SEASON, WEEKS_PER_YEAR, SEASONS;

/* GAME STATE */

const gameState = {
    currentWeek: 0,
    currentYear: 0,
    currentSeason: "",
    currentTime: 0,
    biodiversityScore: 0,
    grid: [],
    tileTemplate: null,
    player: {
        x: null,
        y: null,
    },
    highlightedTile: {
        x: null,
        y: null,
    },
    inventory: {}
};

/* INITIALIZATION */

window.onload = function () {
    const gameDataURL = document.querySelector('meta[name="game-data"]')?.content;
    if (!gameDataURL) {
        console.error("Game data URL is not defined in the HTML <meta> tag.");
        return;
    }

    fetch(gameDataURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load game data from ${gameDataURL}: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            gameData = data;
            console.log("Game data loaded successfully:\n", gameData);
            initGame();
        })
        .catch(error => {
            console.error("Error fetching game data:", error);
        });
};

function initGame() {
    if (!gameData) {
        console.error("JSON game data is missing.");
        return;
    }

    const {
        CONFIG: config,
        UI: uiData,
        INVENTORY: inventoryData
    } = gameData;

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

    initializeConstants(config);
    initializeGameState(config);
    initializeGrid(config);
    initializeUI(uiData);
    initializeInventory(inventoryData);

    showTutorial();
}

function initializeConstants(config) {
    initializeGameConfig(config.GAME_CONFIG);
    initializeCalendarConfig(config.CALENDAR_CONFIG);
    initializeTileConfig(config.TILE_CONFIG);
    initializeTimeCosts(config.TIME_COSTS);
    initializePlants(config.PLANTS);
}

function initializeGameConfig(gameConfig) {
    TILE_SIZE = gameConfig.GRID.TILE_SIZE;
    GRID_WIDTH = gameConfig.GRID.WIDTH;
    GRID_HEIGHT = gameConfig.GRID.HEIGHT;
    DAY_START = gameConfig.TIME.START;
    DAY_END = gameConfig.TIME.END;
    BASE_MOISTURE_START = gameConfig.MOISTURE.START;
    BASE_MOISTURE_DECAY = gameConfig.MOISTURE.DECAY;
    PEST_OUTBREAK_CHANCE = gameConfig.PEST_OUTBREAK_CHANCE;
    REGION_NAME = gameConfig.REGION;
}

function initializeCalendarConfig(calendarConfig) {
    WEEKS_PER_SEASON = calendarConfig.WEEKS_PER_SEASON;
    SEASONS = calendarConfig.SEASONS;
    WEEKS_PER_YEAR = WEEKS_PER_SEASON * SEASONS.length;
}

function initializeTileConfig(tileConfig) {
    Object.assign(TILE_TYPE, tileConfig.TYPES);
}

function initializeTimeCosts(timeCosts) {
    Object.assign(TIME_COST, timeCosts);
}

function initializePlants(plants) {
    Object.assign(PLANT_DATA, plants);
}

function initializeGameState(config) {
    const { GAME_CONFIG: gameConfig } = config;

    gameState.currentWeek = gameConfig.DEFAULT_WEEK;
    gameState.currentYear = gameConfig.DEFAULT_YEAR;
    gameState.currentSeason = gameConfig.DEFAULT_SEASON;
    gameState.currentTime = DAY_START;

    gameState.player.x = Math.floor(GRID_WIDTH / 2);
    gameState.player.y = Math.floor(GRID_HEIGHT / 2);
}

function initializeGrid(config) {
    const { TILE_CONFIG: tileConfig } = config;

    const defaultType = tileConfig.DEFAULT_TYPE;
    const defaultTile = structuredClone(tileConfig.TYPES[defaultType]);

    gameState.grid = Array.from({
        length: GRID_HEIGHT
    }, () =>
        Array.from({
            length: GRID_WIDTH
        }, () => {
            const tile = {
                TYPE: {
                    VALUE: defaultType
                }
            };
            for (const [key, value] of Object.entries(defaultTile)) {
                tile[key] = structuredClone(value) ?? {
                    VALUE: null
                };
            }
            return tile;
        })
    );
    render();
}

function initializeUI(uiData) {
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
    gameState.inventory = inventoryData;
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

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = gameState.grid[row][col];
            let tileColor = tileStyles.default;
            const tileType = gameData.CONFIG.TILE_CONFIG.TYPES[tile.TYPE.VALUE];

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
            context.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            context.strokeStyle = (row === gameState.highlightedTile.y && col === gameState.highlightedTile.x) ? tileStyles.highlight : tileStyles.border;
            context.lineWidth = (row === gameState.highlightedTile.y && col === gameState.highlightedTile.x) ? 3 : 1;
            context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            if (row === gameState.player.y && col === gameState.player.x) {
                context.strokeStyle = tileStyles.player;
                context.lineWidth = 3;
                context.strokeRect(col * TILE_SIZE + 1, row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            }
        }
    }
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent) element.textContent = options.textContent;
    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    return element;
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

    const uiClasses = gameData.UI_CLASSES;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    data.FIELDS.forEach(fieldKey => {
        const fieldData = gameData.FIELDS[fieldKey] || gameData.ACTIONS[fieldKey];
        if (!fieldData) {
            console.warn(`Field data for key '${fieldKey}' not found.`);
            return;
        }

        const sectionType = gameData.SECTION_TYPES[fieldData.SECTION_TYPE] || gameData.SECTION_TYPES.BUTTON;
        if (!sectionType) {
            console.warn(`Section type '${fieldData.SECTION_TYPE}' not found for field '${fieldKey}'.`);
            return;
        }

        const fieldContainer = createElement(sectionType.TAG, {
            className: uiClasses.FIELD_CONTAINER
        });

        if (sectionType.TAG === gameData.SECTION_TYPES.BUTTON.TAG) {
            const label = `${fieldData.LABEL} (${fieldData.TIME_COST})`;
            const buttonElement = createElement(sectionType.TAG, {
                id: fieldData.ID || `${containerId}-${fieldKey}`,
                className: sectionType.CLASS || uiClasses.FIELD_VALUE,
                textContent: label
            });
            buttonElement.dataset.onClick = fieldData.FUNCTION;
            fieldContainer.appendChild(buttonElement);
        } else {
            const labelType = gameData.SECTION_TYPES.LABEL;
            const labelElement = createElement(labelType.TAG, {
                className: labelType.CLASS || uiClasses.FIELD_LABEL,
                textContent: `${fieldData.LABEL}: `
            });
            fieldContainer.appendChild(labelElement);

            if (fieldData.SUBFIELDS) {
                container.appendChild(fieldContainer); // Append the parent field container first
                renderSubfields(container, fieldData.SUBFIELDS, sectionType, fieldData.DEFAULT_VALUE, 1);
                return; // Skip appending the parent field container again
            } else {
                const valueElement = createElement(sectionType.TAG, {
                    id: fieldData.ID || `${containerId}-${fieldKey}`,
                    className: sectionType.CLASS || uiClasses.FIELD_VALUE,
                    textContent: fieldData.DEFAULT_VALUE
                });
                fieldContainer.appendChild(valueElement);
            }
        }

        container.appendChild(fieldContainer);
    });
}

function renderSubfields(container, subfields, sectionType, defaultValues, level = 1) {
    const uiClasses = gameData.UI_CLASSES;

    Object.entries(subfields).forEach(([key, subfieldData]) => {
        const subfieldContainer = createElement(sectionType.TAG, {
            className: `${uiClasses.FIELD_CONTAINER} ${uiClasses.SUBFIELD_CONTAINER}`,
            style: `--level: ${level};`
        });
        const labelType = gameData.SECTION_TYPES.LABEL;
        const subfieldLabelElement = createElement(labelType.TAG, {
            className: labelType.CLASS || uiClasses.FIELD_LABEL,
            textContent: `${subfieldData.LABEL}: `
        });
        const subfieldValueElement = createElement(sectionType.TAG, {
            id: subfieldData.ID,
            className: sectionType.CLASS || uiClasses.FIELD_VALUE,
            textContent: defaultValues[key] || subfieldData.DEFAULT_VALUE
        });
        subfieldContainer.appendChild(subfieldLabelElement);
        subfieldContainer.appendChild(subfieldValueElement);
        container.appendChild(subfieldContainer);

        if (subfieldData.SUBFIELDS) {
            renderSubfields(container, subfieldData.SUBFIELDS, sectionType, subfieldData.DEFAULT_VALUE, level + 1);
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

    console.log(`A) Updating UI section: '${containerId}' with data:`, data);

    data.FIELDS.forEach(fieldKey => {
        const fieldData = gameData.FIELDS[fieldKey];
        if (!fieldData) {
            console.warn(`Field data for key '${fieldKey}' not found.`);
            return;
        }

        let value = gameState[fieldKey] ?? fieldData.DEFAULT_VALUE;
        console.log(`B) Updating field '${fieldData.ID}' with value:`, value);

        if (fieldData.SUBFIELDS) {
            updateSubfields(fieldData.SUBFIELDS, value);
        } else {
            if (typeof value === "object") {
                console.warn(`Skipping update for field '${fieldData.ID}' because it has subfields.`);
                return;
            }
            updateField(fieldData.ID, value);
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
    const sectionType = gameData.SECTION_TYPES.FIELD_CONTAINER;
    const labelType = gameData.SECTION_TYPES.LABEL;
    const valueType = gameData.SECTION_TYPES.VALUE;
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
            console.error(`Handler function '${handlerName}' not found.`);
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
    let newX = gameState.player.x;
    let newY = gameState.player.y;

    const keyBindings = gameData.KEY_BINDINGS;

    switch (e.key) {
        case keyBindings.PLAYER_MOVE_UP:
            newY = gameState.player.y - 1;
            break;
        case keyBindings.PLAYER_MOVE_DOWN:
            newY = gameState.player.y + 1;
            break;
        case keyBindings.PLAYER_MOVE_LEFT:
            newX = gameState.player.x - 1;
            break;
        case keyBindings.PLAYER_MOVE_RIGHT:
            newX = gameState.player.x + 1;
            break;
        case keyBindings.HIGHLIGHT_TILE_UP:
            highlightTile(gameState.highlightedTile.x, gameState.highlightedTile.y - 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_DOWN:
            highlightTile(gameState.highlightedTile.x, gameState.highlightedTile.y + 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_LEFT:
            highlightTile(gameState.highlightedTile.x - 1, gameState.highlightedTile.y);
            return;
        case keyBindings.HIGHLIGHT_TILE_RIGHT:
            highlightTile(gameState.highlightedTile.x + 1, gameState.highlightedTile.y);
            return;
        case keyBindings.RESET_HIGHLIGHT:
            highlightTile(gameState.player.x, gameState.player.y);
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

    if (newX !== gameState.player.x || newY !== gameState.player.y) {
        if (
            newX >= 0 &&
            newX < GRID_WIDTH &&
            newY >= 0 &&
            newY < GRID_HEIGHT &&
            gameState.grid[newY][newX].TYPE.VALUE !== TILE_TYPE.PLOT
        ) {
            gameState.player.x = newX;
            gameState.player.y = newY;

            highlightTile(gameState.player.x, gameState.player.y);

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
        const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

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
    gameState.currentTime += minutes;

    if (gameState.currentTime >= DAY_END) {
        skipToNextWeek();
    } else {
        updateTimeDisplay();
        render();
    }
}

function skipToNextWeek() {
    gameState.currentWeek++;
    gameState.currentTime = DAY_START;

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
    gameState.currentYear = Math.floor(gameState.currentWeek / WEEKS_PER_YEAR) + 1;
    gameState.currentSeason = SEASONS[Math.floor((gameState.currentWeek % WEEKS_PER_YEAR) / WEEKS_PER_SEASON)];

    const yearField = gameData.FIELDS.YEAR;
    updateField(yearField.ID, gameState.currentYear);

    const seasonField = gameData.FIELDS.SEASON;
    updateField(seasonField.ID, gameState.currentSeason);
}

function updateBiodiversity() {
    const typesFound = new Set();

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = gameState.grid[row][col];
            if (tile.PLANT_DATA.VALUE) {
                typesFound.add(tile.PLANT_DATA.VALUE.NAME);
            }
        }
    }

    gameState.biodiversityScore = typesFound.size;
    return gameState.biodiversityScore;
}

/* PLAYER MOVEMENT & CONTROLS */

function resetPlayerPosition() {
    if (!gameState.grid || gameState.grid.length === 0) {
        console.error("Cannot reset player position: grid not initialized.");
        return;
    }

    gameState.player.x = Math.floor(GRID_WIDTH / 2);
    gameState.player.y = Math.floor(GRID_HEIGHT / 2);

    gameState.highlightedTile = {
        x: gameState.player.x,
        y: gameState.player.y
    };

    highlightTile(gameState.player.x, gameState.player.y);
    updateTileStats();
    render();
}

function highlightTile(x, y) {
    if (isTileValid(x, y) && isTileAdjacent(x, y)) {
        gameState.highlightedTile = {
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
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = gameState.grid[row][col];
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

    tile.MOISTURE.VALUE = Math.max(tile.MOISTURE.VALUE - BASE_MOISTURE_DECAY, 0);
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
    const plantData = PLANT_DATA[plantName];

    const {
        N,
        P,
        K
    } = tile.SOIL_NUTRIENTS;
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

    if (tile.PLANT_DATA.VALUE.AGE >= plantData.growthTime) {
        tile.PLANT_DATA.VALUE.IS_MATURE = true;
    }
}

function updateTileStats() {
    const { x, y } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    updateStatsFromFields(gameData.UI.TILE_STATS.FIELDS, tile, gameData.SECTION_TYPES.TILE_STATS.CONTAINER);
}

/* UI UPDATES */

function updateTimeDisplay() {
    const totalMinutes = gameState.currentTime;
    const hours = Math.floor(totalMinutes / 60) % 12 || 12;
    const minutes = totalMinutes % 60;
    const ampm = totalMinutes < 720 ? "AM" : "PM";
    const formattedTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;

    const timeField = gameData.FIELDS.TIME;
    updateField(timeField.ID, formattedTime);
}

function updateWeekDisplay() {
    const weekField = gameData.FIELDS.WEEK;
    updateField(weekField.ID, gameState.currentWeek);
}

function updateBiodiversityDisplay() {
    const biodiversityField = gameData.FIELDS.BIODIVERSITY;
    updateField(biodiversityField.ID, gameState.biodiversityScore);
}

/* PLAYER ACTIONS */

function handleTileAction(action, tile, params = {}) {
    const actions = gameData.ACTIONS;
    const actionConfig = actions[action.toUpperCase()];

    if (!actionConfig) {
        console.warn(`Unhandled tile action: '${action}'`);
        return;
    }

    const functionName = actionConfig.FUNCTION;
    const functionParams = actionConfig.PARAMS || {};
    const timeCost = actionConfig.TIME_COST;

    const actionFunction = window[functionName];

    if (typeof actionFunction !== "function") {
        console.error(`Function '${functionName}' not found for action '${action}'`);
        return;
    }

    actionFunction(tile, { ...params, ...functionParams });

    // Deduct time cost from the game state
    gameState.currentTime += timeCost;

    updateTileStats();
    render();
}

function tillSoil(tile) {
    if (tile.TYPE.VALUE === TILE_TYPE.EMPTY) {
        tile.TYPE.VALUE = TILE_TYPE.PLOT;
        tile.IS_TILLED = true;
        advanceTime(TIME_COST.TILL);
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
        advanceTime(TIME_COST.FERTILIZE);
    } else {
        console.log("Cannot fertilize this tile.");
    }
}

function plantSeed(tile, seedType = "tomato") {
    if (tile.IS_TILLED && !tile.PLANT_DATA.VALUE && gameState.inventory.seeds[seedType] > 0) {
        tile.PLANT_DATA.VALUE = {
            NAME: seedType,
            AGE: 0,
            IS_MATURE: false
        };
        updateInventory(`seeds.${seedType}`, -1);
        advanceTime(TIME_COST.PLANT);
    } else {
        console.log("Cannot plant on this tile.");
    }
}

function waterTile(tile) {
    tile.MOISTURE.VALUE = Math.min(tile.MOISTURE.VALUE + 20, 100);
    advanceTime(TIME_COST.WATER);
}

function mulchTile(tile) {
    if (tile.IS_TILLED && gameState.inventory.mulch > 0) {
        tile.MOISTURE_DECAY_RATE = Math.max(tile.MOISTURE_DECAY_RATE - 1, 0);
        updateInventory('mulch', -1);
        advanceTime(TIME_COST.MULCH);
    } else {
        console.log("Cannot apply mulch to this tile.");
    }
}

function weedTile(tile) {
    if (tile.WEED_LEVEL.VALUE > 0) {
        tile.WEED_LEVEL.VALUE = 0;
        advanceTime(TIME_COST.WEED);
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
        advanceTime(TIME_COST.HARVEST);
    } else {
        console.log("No mature plant to harvest.");
    }
}

function clearPlot(tile) {
    if (tile.TYPE.VALUE === TILE_TYPE.PLOT) {
        tile.TYPE.VALUE = TILE_TYPE.EMPTY;
        tile.IS_TILLED = false;
        tile.PLANT_DATA.VALUE = null;
        advanceTime(TIME_COST.CLEAR);
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

/* UTILITY FUNCTIONS */

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
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
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
    if (options.textContent) element.textContent = options.textContent;
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

function toCamelCase(str) {
    return str
        .toLowerCase()
        .replace(/[-_](.)/g, (match, group1) => group1.toUpperCase());
}