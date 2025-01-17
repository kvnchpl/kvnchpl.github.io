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

    const { CONFIG: config, UI: uiData, INVENTORY: inventoryData } = gameData;

    initializeConstants(config);
    initializeGameState(config);
    initializeGrid(config);
    initializeUI(uiData);
    initializeInventory(inventoryData);

    showTutorial();
}

function initializeConstants(config) {
    if (!config) {
        console.error("Configuration object is missing.");
        return;
    }

    Object.entries(config).forEach(([key, value]) => {
        switch (key) {
            case 'GAME_CONFIG':
                TILE_SIZE = value.GRID.TILE_SIZE;
                GRID_WIDTH = value.GRID.WIDTH;
                GRID_HEIGHT = value.GRID.HEIGHT;
                DAY_START = value.TIME.START;
                DAY_END = value.TIME.END;
                BASE_MOISTURE_START = value.MOISTURE.START;
                BASE_MOISTURE_DECAY = value.MOISTURE.DECAY;
                PEST_OUTBREAK_CHANCE = value.PEST_OUTBREAK_CHANCE;
                REGION_NAME = value.REGION;
                break;
            case 'CALENDAR_CONFIG':
                WEEKS_PER_SEASON = value.WEEKS_PER_SEASON;
                SEASONS = value.SEASONS;
                WEEKS_PER_YEAR = WEEKS_PER_SEASON * SEASONS.length;
                break;
            case 'TILE_CONFIG':
                Object.assign(TILE_TYPE, value.TYPES);
                break;
            case 'TIME_COSTS':
                Object.assign(TIME_COST, value);
                break;
            case 'PLANTS':
                Object.assign(PLANT_DATA, value);
                break;
            default:
                console.warn(`Unhandled configuration category: '${key}'`);
                break;
        }
    });
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
    try {
        const defaultType = tileConfig.DEFAULT_TYPE;
        const defaultTile = structuredClone(tileConfig.TYPES[defaultType]);

        gameState.grid = Array.from({ length: GRID_HEIGHT }, () =>
            Array.from({ length: GRID_WIDTH }, () => {
                const tile = { TYPE: { VALUE: defaultType } };
                for (const [key, value] of Object.entries(defaultTile)) {
                    tile[key] = structuredClone(value) ?? { VALUE: null };
                }
                return tile;
            })
        );
        render();
    } catch (error) {
        console.error("Error initializing grid:", error);
        throw error;
    }
}

function initializeUI(uiData) {
    try {
        Object.entries(uiData).forEach(([sectionKey, sectionData]) => {
            renderUISection(sectionData.CONTAINER, sectionData);
            updateUISection(sectionData.CONTAINER, sectionData);
        });

        attachUIEventListeners();
        updateTimeDisplay();
        updateYearAndSeason();
        updateWeekDisplay();
        updateBiodiversityDisplay();
    } catch (error) {
        console.error("Error initializing UI:", error);
        throw error;
    }
}

function initializeInventory(inventoryData) {
    gameState.inventory = inventoryData;
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

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (!data.FIELDS) {
        console.warn(`No fields provided for container '${containerId}'.`);
        return;
    }

    data.FIELDS.forEach(fieldKey => {
        const fieldData = gameData.FIELDS[fieldKey];
        if (!fieldData) {
            console.warn(`Field data for key '${fieldKey}' not found.`);
            return;
        }

        const sectionType = gameData.SECTION_TYPES[fieldData.SECTION_TYPE];
        if (!sectionType) {
            console.warn(`Section type '${fieldData.SECTION_TYPE}' not found for field '${fieldKey}'.`);
            return;
        }

        const element = document.createElement(sectionType.TAG);
        element.id = fieldData.ID || `${containerId}-${fieldKey}`;
        element.textContent = fieldData.LABEL || sectionType.DEFAULT || "Unnamed Field";
        if (sectionType.CLASS) {
            element.className = sectionType.CLASS;
        }

        container.appendChild(element);

        if (sectionType.EVENT_PROPERTY && fieldData[sectionType.EVENT_PROPERTY]) {
            const handler = window[fieldData[sectionType.EVENT_PROPERTY]];
            if (typeof handler === "function") {
                element.addEventListener("click", handler);
            } else {
                console.error(`Handler function '${fieldData[sectionType.EVENT_PROPERTY]}' not found.`);
            }
        }
    });
}

function updateUISection(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container missing for ID: ${containerId}`);
        return;
    }

    if (!data) {
        console.error(`Data missing for ID: ${containerId}`);
        return;
    }

    if (!data.FIELDS) return;

    console.log(`A) Updating UI section: '${containerId}' with data:`, data);

    data.FIELDS.forEach(fieldKey => {
        const fieldData = gameData.FIELDS[fieldKey];
        if (!fieldData) {
            console.warn(`Field data for key '${fieldKey}' not found.`);
            return;
        }

        const value = gameState[fieldKey] ?? fieldData.DEFAULT_VALUE;
        console.log(`B) Updating field '${fieldKey}' with value: ${value}.`);
        updateField(fieldData.ID, value);
    });
}

function appendTileStat(container, label, id) {
    const field = document.createElement("div");

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${capitalize(label)}: `;
    field.appendChild(labelSpan);

    const valueSpan = document.createElement("span");
    valueSpan.id = id;
    valueSpan.textContent = "N/A";
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

    window.addEventListener("keydown", preventArrowKeyScroll);
    window.addEventListener("keydown", handleKeyDown);
}

function preventArrowKeyScroll(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    }
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

    updateField("YEAR", "Year: " + gameState.currentYear);
    updateField("SEASON", gameState.currentSeason);
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
        case keyBindings.ACTION_TILL:
            handleTileAction('till', getTargetTile());
            break;
        case keyBindings.ACTION_FERTILIZE:
            handleTileAction('fertilize', getTargetTile());
            break;
        case keyBindings.ACTION_PLANT:
            handleTileAction('plant', getTargetTile(), { seedType: 'tomato' });
            break;
        case keyBindings.ACTION_WATER:
            handleTileAction('water', getTargetTile());
            break;
        case keyBindings.ACTION_MULCH:
            handleTileAction('mulch', getTargetTile());
            break;
        case keyBindings.ACTION_WEED:
            handleTileAction('weed', getTargetTile());
            break;
        case keyBindings.ACTION_HARVEST:
            handleTileAction('harvest', getTargetTile());
            break;
        case keyBindings.ACTION_CLEAR:
            handleTileAction('clear', getTargetTile());
            break;
        default:
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

function resetPlayerPosition() {
    try {
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
    } catch (error) {
        console.error("Error resetting player position:", error);
        throw error;
    }

}

document.getElementById("gameCanvas").addEventListener("click", (e) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

    highlightTile(x, y);
});

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

function updateTilePlant(tile, row, col) {
    if (!tile.PLANT_DATA.VALUE) return;

    const plantName = tile.PLANT_DATA.VALUE.NAME;
    const plantData = PLANT_DATA[plantName];

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

    if (tile.PLANT_DATA.VALUE.AGE >= plantData.growthTime) {
        tile.PLANT_DATA.VALUE.IS_MATURE = true;
    }
}

function updateTileStats() {
    const {
        x,
        y
    } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    updateStatsFromFields(gameData.UI.TILE_STATS.FIELDS, tile, "tileStats");
}

function clearTileStats() {
    const statsContainer = document.getElementById("tileStats");
    const spans = statsContainer.querySelectorAll("span");
    spans.forEach(span => (span.textContent = "N/A"));
}

/* UI UPDATES */

function updateTimeDisplay() {
    const totalMinutes = gameState.currentTime;
    const hours = Math.floor(totalMinutes / 60) % 12 || 12;
    const minutes = totalMinutes % 60;
    const ampm = totalMinutes < 720 ? "AM" : "PM";
    const formattedTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;

    updateField("TIME", formattedTime);
}

function updateWeekDisplay() {
    document.getElementById("weekDisplay").textContent = "Week: " + gameState.currentWeek;
}

function updateBiodiversityDisplay() {
    document.getElementById("biodiversityScore").textContent = "Biodiversity: " + gameState.biodiversityScore;
}

/* PLAYER ACTIONS */

// TILL
function tillSoil() {
    const tile = getTargetTile();

    if (tile.TYPE.VALUE == TILE_TYPE.EMPTY) {
        tile.TYPE.VALUE = TILE_TYPE.PLOT;
        tile.IS_TILLED = true;

        console.log("Soil tilled at:", tile);
        advanceTime(TIME_COST.TILL);
        updateTileStats();
    } else {
        console.log("Cannot till this tile.");
    }
}

// FERTILIZE
function fertilizeTile() {
    const {
        x,
        y
    } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile.isTilled) {
        console.log("Tile is not tilled. Cannot fertilize.");
        return;
    }

    if (gameState.inventory.fertilizer > 0) {
        tile.soilNutrients.N += 10;
        tile.soilNutrients.P += 5;
        tile.soilNutrients.K += 5;
        updateInventory("fertilizer", -1);
        console.log(`Fertilized tile at (${x}, ${y}).`);

        render();
        updateTileStats();
    } else {
        console.log("No fertilizer available.");
    }
}

// PLANT
function plantSeed(seedType = "tomato") {
    const {
        x,
        y
    } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile.isTilled) {
        console.log("Tile is not tilled. Cannot plant here.");
        return;
    }

    if (tile.plant) {
        console.log("Tile already has a plant.");
        return;
    }

    if (gameState.inventory.seeds[seedType] > 0) {
        tile.plant = {
            TYPE: seedType,
            GROWTH_STAGE: 0
        };
        updateInventory(`seeds.${seedType}`, -1);
        console.log(`Planted '${seedType}' at (${x}, ${y}).`);

        render();
        updateTileStats();
    } else {
        console.log(`No seeds of type '${seedType}' available.`);
    }
}

// WATER
function waterTile() {
    const tile = getTargetTile();

    tile.MOISTURE.VALUE = Math.min(tile.MOISTURE.VALUE + 20, 100);

    console.log("Watered tile at:", tile);
    advanceTime(TIME_COST.WATER);
    updateTileStats();
}

// MULCH
function mulchTile() {
    const {
        x,
        y
    } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile.isTilled) {
        console.log("Tile is not tilled. Cannot apply mulch.");
        return;
    }

    if (gameState.inventory.mulch > 0) {
        tile.moistureDecayRate = Math.max(tile.moistureDecayRate - 1, 0); // Example effect
        updateInventory("mulch", -1);
        console.log(`Applied mulch at (${x}, ${y}).`);

        render();
        updateTileStats();
    } else {
        console.log("No mulch available.");
    }
}

// WEED
function weedTile() {
    const tile = getTargetTile();

    if (tile.WEED_LEVEL.VALUE > 0) {
        tile.WEED_LEVEL.VALUE = 0;

        console.log("Weeds removed at:", tile);
        advanceTime(TIME_COST.WEED);
        updateTileStats();
    } else {
        console.log("No weeds here.");
    }
}

// HARVEST
function harvestPlant() {
    const {
        x,
        y
    } = gameState.highlightedTile;
    const tile = gameState.grid[y][x];

    if (!tile.plant || tile.plant.GROWTH_STAGE < PLANT_DATA[tile.plant.TYPE].GROWTH_TIME) {
        console.log("No mature plant to harvest here.");
        return;
    }

    const plantType = tile.plant.TYPE;
    const yieldAmount = PLANT_DATA[plantType].YIELD;

    updateInventory(`produce.${plantType}`, yieldAmount);
    tile.plant = null;
    tile.isTilled = false;
    console.log(`Harvested ${yieldAmount} units of '${plantType}' at (${x}, ${y}).`);

    render();
    updateTileStats();
}

// CLEAR
function clearPlot() {
    const tile = getTargetTile();

    if (tile.TYPE.VALUE === TILE_TYPE.PLOT) {
        tile.TYPE.VALUE = TILE_TYPE.EMPTY;
        tile.IS_TILLED = false;
        tile.PLANT_DATA.VALUE = null;

        console.log("Plot cleared at:", tile);
        advanceTime(TIME_COST.CLEAR);
        updateTileStats();
    } else {
        console.log("This tile is not a plot.");
    }
}

function handleTileAction(action, tile, params = {}) {
    switch (action) {
        case 'till':
            if (tile.TYPE.VALUE === TILE_TYPE.EMPTY) {
                tile.TYPE.VALUE = TILE_TYPE.PLOT;
                tile.IS_TILLED = true;
                advanceTime(TIME_COST.TILL);
            } else {
                console.log("Cannot till this tile.");
            }
            break;
        case 'fertilize':
            if (tile.IS_TILLED && gameState.inventory.fertilizer > 0) {
                tile.SOIL_NUTRIENTS.N += 10;
                tile.SOIL_NUTRIENTS.P += 5;
                tile.SOIL_NUTRIENTS.K += 5;
                updateInventory('fertilizer', -1);
                advanceTime(TIME_COST.FERTILIZE);
            } else {
                console.log("Cannot fertilize this tile.");
            }
            break;
        case 'plant':
            if (tile.IS_TILLED && !tile.PLANT_DATA.VALUE && gameState.inventory.seeds[params.seedType] > 0) {
                tile.PLANT_DATA.VALUE = { NAME: params.seedType, AGE: 0, IS_MATURE: false };
                updateInventory(`seeds.${params.seedType}`, -1);
                advanceTime(TIME_COST.PLANT);
            } else {
                console.log("Cannot plant on this tile.");
            }
            break;
        case 'water':
            tile.MOISTURE.VALUE = Math.min(tile.MOISTURE.VALUE + 20, 100);
            advanceTime(TIME_COST.WATER);
            break;
        case 'mulch':
            if (tile.IS_TILLED && gameState.inventory.mulch > 0) {
                tile.MOISTURE_DECAY_RATE = Math.max(tile.MOISTURE_DECAY_RATE - 1, 0);
                updateInventory('mulch', -1);
                advanceTime(TIME_COST.MULCH);
            } else {
                console.log("Cannot apply mulch to this tile.");
            }
            break;
        case 'weed':
            if (tile.WEED_LEVEL.VALUE > 0) {
                tile.WEED_LEVEL.VALUE = 0;
                advanceTime(TIME_COST.WEED);
            } else {
                console.log("No weeds to remove.");
            }
            break;
        case 'harvest':
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
            break;
        case 'clear':
            if (tile.TYPE.VALUE === TILE_TYPE.PLOT) {
                tile.TYPE.VALUE = TILE_TYPE.EMPTY;
                tile.IS_TILLED = false;
                tile.PLANT_DATA.VALUE = null;
                advanceTime(TIME_COST.CLEAR);
            } else {
                console.log("This tile is not a plot.");
            }
            break;
        default:
            console.warn(`Unhandled tile action: '${action}'`);
            break;
    }
    updateTileStats();
    render();
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
    try {
        document.getElementById("tutorialOverlay").classList.remove("hidden");
    } catch (error) {
        console.error("Error showing tutorial:", error);
        throw error;
    }
}

function hideTutorial() {
    try {
        document.getElementById("tutorialOverlay").classList.add("hidden");
    } catch (error) {
        console.error("Error hiding tutorial:", error);
        throw error;
    }
}

/* UTILITY FUNCTIONS */

function getTargetTile() {
    const { x, y } = gameState.highlightedTile.x !== null ? gameState.highlightedTile : gameState.player;
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

function updateField(fieldKey, value) {
    try {
        const fieldElement = document.getElementById(fieldKey);
        if (!fieldElement) {
            console.error(`Field element with key '${fieldKey}' not found to update to ${value}.`);
            return;
        }
        fieldElement.textContent = value;
    } catch (error) {
        console.error(`Error updating field '${fieldKey}':`, error);
    }
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

        if (fieldConfig.FORMAT && typeof value === "object") {
            try {
                value = fieldConfig.FORMAT.replace(/\{(\w+)\}/g, (_, key) => value[key] ?? '');
            } catch (error) {
                console.error(`Error formatting value for '${fieldKey}':`, error);
                return;
            }
        }

        try {
            updateField(fieldKey, value);
        } catch (error) {
            console.error(`Error updating field '${fieldKey}' with value '${value}':`, error);
        }
    });
}

function createAndAppendElement(container, tagName, options = {}) {
    try {
        const {
            id,
            textContent,
            className,
            attributes,
            children
        } = options;
        const element = document.createElement(tagName);

        if (id) element.id = id;
        if (textContent) element.textContent = textContent;
        if (className) element.className = className;

        if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        }

        if (children) {
            children.forEach(child => element.appendChild(child));
        }

        container.appendChild(element);
        return element;
    } catch (error) {
        console.error(`Error creating and appending element '${tagName}':`, error);
        return null;
    }
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