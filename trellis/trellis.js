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
            produce: {
                tomato: 0,
                kale: 0,
                corn: 0,
                beans: 0,
            },
            fertilizer: 0,
            mulch: 0,
        },
    },
    score: {
        biodiversity: 0,
    },
    ui: {
        isTutorialActive: true,
    }
};

/* CLASSES */

class Tile {
    constructor(data) {
        Object.assign(this, data);
    }

    highlight() {
        const prevTile = gameState.grid.highlightedTile;
        if (prevTile) {
            const prevTileElement = document.querySelector(`#tile-${prevTile.y}-${prevTile.x}`);
            if (prevTileElement) {
                prevTileElement.classList.remove("highlighted");
            }
        }

        const tileElement = document.querySelector(`#tile-${this.y}-${this.x}`);
        if (tileElement) {
            tileElement.classList.add("highlighted");
        }

        gameState.grid.highlightedTile = { x: this.x, y: this.y };
    }

    till() {
        if (this.TYPE === gameData.TILE_TYPES.EMPTY.TYPE) {
            this.TYPE = gameData.TILE_TYPES.PLOT.TYPE;
            this.IS_TILLED = true;
        }
    }

    fertilize() {
        if (this.IS_TILLED && gameState.player.inventory.fertilizer > 0) {
            this.SOIL_NUTRIENTS.N += 10;
            this.SOIL_NUTRIENTS.P += 5;
            this.SOIL_NUTRIENTS.K += 5;
            Inventory.update('fertilizer', -1);
        }
    }

    plant(seedType = "tomato") {
        if (this.IS_TILLED && !this.PLANT_DATA.VALUE) {
            this.PLANT_DATA.VALUE = {
                NAME: seedType,
                AGE: 0,
                IS_MATURE: false
            };
        }

    }

    water() {
        this.MOISTURE.VALUE = Math.min(this.MOISTURE.VALUE + 20, 100);
    }

    mulch() {
        if (this.IS_TILLED && gameState.inventory.mulch > 0) {
            this.MOISTURE_DECAY_RATE = Math.max(this.MOISTURE_DECAY_RATE - 1, 0);
            updateInventory('mulch', -1);
        }
    }

    weed() {
        if (this.WEED_LEVEL.VALUE > 0) {
            this.WEED_LEVEL.VALUE = 0;
        }
    }

    harvest() {
        if (this.PLANT_DATA.VALUE && this.PLANT_DATA.VALUE.IS_MATURE) {
            const plantType = this.PLANT_DATA.VALUE.NAME;
            const yieldAmount = PLANT_DATA[plantType].YIELD;
            updateInventory(`produce.${plantType}`, yieldAmount);
            this.PLANT_DATA.VALUE = null;
            this.IS_TILLED = false;
        }
    }

    clear() {
        if (this.TYPE === TILE_TYPES.PLOT.TYPE) {
            this.TYPE = TILE_TYPES.EMPTY.TYPE;
            this.IS_TILLED = false;
            this.PLANT_DATA.VALUE = null;
        }
    }

    updateMoisture(decayRate) {
        if (!this.MOISTURE) return;
        this.MOISTURE.VALUE = Math.max(this.MOISTURE.VALUE - decayRate, 0);
    }

    growPlant(conditions) {
        if (!this.PLANT_DATA || !this.PLANT_DATA.VALUE) return;
        const { N, P, K } = this.SOIL_NUTRIENTS;
        if (conditions.isSufficient(N, P, K, this.MOISTURE.VALUE)) {
            this.PLANT_DATA.VALUE.AGE++;
        }
    }
}

class Inventory {
    static update(item, delta) {
        const [category, itemKey] = item.split('.');
        const inventoryCategory = gameState.player.inventory[category];
        if (!inventoryCategory || !(itemKey in inventoryCategory)) {
            console.error(`Inventory item '${itemKey}' not found in category '${category}'.`);
            return;
        }

        inventoryCategory[itemKey] = Math.max(0, inventoryCategory[itemKey] + delta);
        updateField(`${category}.${itemKey}`, inventoryCategory[itemKey]);
    }
}

class Tutorial {
    constructor(overlayId) {
        this.overlay = document.getElementById(overlayId);
        this.isActive = true;
    }

    show() {
        this.isActive = true;
        this.overlay.classList.remove("hidden");
        toggleButtons(false);
    }

    hide() {
        this.isActive = false;
        this.overlay.classList.add("hidden");
        toggleButtons(true);
    }

    toggleButtons(enable) {
        const buttons = document.querySelectorAll(`button:not(#${gameData.FIELDS.CLOSE_TUTORIAL.ID})`);
        buttons.forEach(button => {
            button.disabled = !enable;
        });
    }
}

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
            try {

                initGame();
            } catch (error) {
                console.error(error.message);
            }
            console.log("Game data loaded successfully:\n", gameData);
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
    validateGameData(gameData);
    validateKeyBindings(gameData.CONFIG.KEY_BINDINGS);

    const { CONFIG: config, UI: uiData, INVENTORY: inventoryData } = gameData;

    initializeGameData(config);
    initializeGameState(config);
    initializeGrid(config);
    initializeUI(uiData);
    initializeInventory(inventoryData);

    const tutorial = new Tutorial(gameData.UI.TUTORIAL_OVERLAY.CONTAINER);
    tutorial.show();
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
            return new Tile(structuredClone(gameData.TILE_TYPES[defaultType]));
        })
    );

    console.log("Initialized grid: ", gameState.grid);
    render();
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
    gameState.player.inventory = { ...inventoryData };
    console.log("Initialized inventory:", gameState.player.inventory);

    updateInventoryUI();
}

function updateInventoryUI() {
    const inventoryFields = gameData.UI.INVENTORY_DISPLAY.FIELDS;
    inventoryFields.forEach(fieldKey => {
        const fieldData = gameData.FIELDS[fieldKey];
        if (fieldData.SUBFIELDS) {
            Object.entries(fieldData.SUBFIELDS).forEach(([key, subFieldData]) => {
                const value = gameState.player.inventory.produce[key] || subFieldData.DEFAULT_VALUE;
                updateField(subFieldData.ID, value);
            });
        } else {
            const value = gameState.player.inventory[fieldData.ID] || fieldData.DEFAULT_VALUE;
            updateField(fieldData.ID, value);
        }
    });
}

/* RENDERING */

function render() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("Canvas not found.");
        return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("Failed to get canvas rendering context.");
        return;
    }

    canvas.width = gameData.GRID_WIDTH * gameData.TILE_SIZE;
    canvas.height = gameData.GRID_HEIGHT * gameData.TILE_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
}

function drawGrid(context) {
    // Get tile styles from CSS variables
    const tileStyles = {
        default: getCSSVariable("--tile-default"),
        moistureHigh: getCSSVariable("--tile-moisture-high"),
        moistureLow: getCSSVariable("--tile-moisture-low"),
        tilled: getCSSVariable("--tile-tilled"),
        plantMature: getCSSVariable("--tile-plant-mature"),
        plantYoung: getCSSVariable("--tile-plant-young"),
        highlight: getCSSVariable("--tile-highlight"),
        player: getCSSVariable("--tile-player"),
        border: getCSSVariable("--color-canvas-border"),
    };

    for (let row = 0; row < gameData.GRID_HEIGHT; row++) {
        for (let col = 0; col < gameData.GRID_WIDTH; col++) {
            const tile = gameState.grid.tiles[row][col];
            let tileColor = tileStyles.default;

            const tileType = gameData.TILE_TYPES[tile.TYPE];
            if (tileType && tileType.COLOR) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue(tileType.COLOR).trim();
            }
            if (tile.MOISTURE?.VALUE > 70) {
                tileColor = tileStyles.moistureHigh;
            } else if (tile.MOISTURE?.VALUE < 30) {
                tileColor = tileStyles.moistureLow;
            }
            if (tile.IS_TILLED) {
                tileColor = tileStyles.tilled;
            }
            if (tile.PLANT_DATA?.VALUE) {
                tileColor = tile.PLANT_DATA.VALUE.IS_MATURE
                    ? tileStyles.plantMature
                    : tileStyles.plantYoung;
            }

            context.fillStyle = tileColor;
            context.fillRect(
                col * gameData.TILE_SIZE,
                row * gameData.TILE_SIZE,
                gameData.TILE_SIZE,
                gameData.TILE_SIZE
            );

            context.strokeStyle =
                row === gameState.grid.highlightedTile.y &&
                    col === gameState.grid.highlightedTile.x
                    ? tileStyles.highlight
                    : tileStyles.border;
            context.lineWidth =
                row === gameState.grid.highlightedTile.y &&
                    col === gameState.grid.highlightedTile.x
                    ? 3
                    : 1;
            context.strokeRect(
                col * gameData.TILE_SIZE,
                row * gameData.TILE_SIZE,
                gameData.TILE_SIZE,
                gameData.TILE_SIZE
            );

            if (row === gameState.player.position.y && col === gameState.player.position.x) {
                context.strokeStyle = tileStyles.player;
                context.lineWidth = 3;
                context.strokeRect(
                    col * gameData.TILE_SIZE + 1,
                    row * gameData.TILE_SIZE + 1,
                    gameData.TILE_SIZE - 2,
                    gameData.TILE_SIZE - 2
                );
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
                textContent: fieldData.LABEL,
            });

            // Attach click handler
            if (fieldData.ON_CLICK) {
                button.addEventListener("click", () => {
                    const handler = window[fieldData.ON_CLICK];
                    if (typeof handler === "function") {
                        const { x, y } = gameState.grid.highlightedTile;
                        const tile = gameState.grid.tiles[y]?.[x]; // Safely retrieve the tile
                        if (!tile) {
                            console.error("Invalid tile selected.");
                            return;
                        }
                        handler(tile); // Pass the tile to the handler
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
        textContent: `${label}: `
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
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-on-click]");
        if (!button) return;

        const handlerName = button.dataset.onClick;
        const handler = window[handlerName];
        if (typeof handler === "function") {
            handler();
        } else {
            console.error(`Handler function '${handlerName}' not found for button: `, button);
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
    if (gameState.ui.isTutorialActive) return; // Disable input during tutorial

    const { player, grid } = gameState;
    const keyBindings = gameData.CONFIG.KEY_BINDINGS;

    let newX = player.position.x;
    let newY = player.position.y;

    // Handle movement keys
    switch (e.key) {
        case keyBindings.PLAYER_MOVE_UP:
            newY -= 1;
            break;
        case keyBindings.PLAYER_MOVE_DOWN:
            newY += 1;
            break;
        case keyBindings.PLAYER_MOVE_LEFT:
            newX -= 1;
            break;
        case keyBindings.PLAYER_MOVE_RIGHT:
            newX += 1;
            break;
        case keyBindings.HIGHLIGHT_TILE_UP:
            highlightTile(player.position.x, player.position.y - 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_DOWN:
            highlightTile(player.position.x, player.position.y + 1);
            return;
        case keyBindings.HIGHLIGHT_TILE_LEFT:
            highlightTile(player.position.x - 1, player.position.y);
            return;
        case keyBindings.HIGHLIGHT_TILE_RIGHT:
            highlightTile(player.position.x + 1, player.position.y);
            return;
        case keyBindings.RESET_HIGHLIGHT:
            highlightTile(player.position.x, player.position.y);
            return;
        default:
            // Handle tile action keys
            const actionKey = Object.keys(keyBindings).find(key => keyBindings[key] === e.key);
            if (actionKey && actionKey.startsWith("ACTION_")) {
                const action = actionKey.replace("ACTION_", "").toLowerCase();
                handleTileAction(action, getTargetTile());
                return;
            }
            console.warn(`Unhandled key press: '${e.key}'`);
            break;
    }

    // Validate new position and update player
    if (isTileValid(newX, newY)) {
        const targetTile = grid.tiles[newY]?.[newX];
        if (targetTile?.TYPE === gameData.TILE_TYPES.PLOT.TYPE) {
            console.log("Cannot move onto a PLOT tile.");
            return;
        }

        player.position = { x: newX, y: newY };
        grid.highlightedTile = { x: newX, y: newY };

        highlightTile(newX, newY);
        render();
    } else {
        console.log("Cannot move onto this tile!");
    }
}

function attachCanvasEventListeners() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }

    const handleClick = (e) => {
        if (gameState.ui.isTutorialActive) return;

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

    const gridWidth = gameData.GRID_WIDTH;
    const gridHeight = gameData.GRID_HEIGHT;

    // Ensure positions are within bounds
    gameState.player.position.x = Math.floor(gridWidth / 2) || 0;
    gameState.player.position.y = Math.floor(gridHeight / 2) || 0;

    const { x, y } = gameState.player.position;

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        console.error(`Invalid player position after reset: (${x}, ${y})`);
        return;
    }

    gameState.grid.highlightedTile = { x, y };

    const tile = gameState.grid.tiles[y]?.[x];
    if (!tile) {
        console.error(`Highlighted tile at (${x}, ${y}) is invalid.`);
        return;
    }

    highlightTile(x, y);
    updateTileStats();
}

function highlightTile(x, y) {
    if (!isTileValid(x, y) || !isTileAdjacent(x, y)) {
        console.log("Cannot highlight tile at:", { x, y });
        return;
    }

    const tile = new Tile(gameState.grid.tiles[y][x]);
    tile.highlight(); // Example method
    gameState.grid.highlightedTile = { x, y };

    updateTileStats();
}

/* TILE & GRID UPDATES */

function updateAllTiles() {
    gameState.grid.tiles.forEach(row => {
        row.forEach(tileData => {
            const tile = new Tile(tileData);
            tile.updateMoisture(gameState.baseMoistureDecay);
            tile.growPlant({ isSufficient: checkConditions });
        });
    });
}

function updateTileStats() {
    const { x, y } = gameState.grid.highlightedTile;
    const tile = gameState.grid.tiles[y][x];

    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    updateStatsFromFields(gameData.UI.TILE_STATS.FIELDS, tile, gameData.UI.TILE_STATS.CONTAINER);
    render();
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

function handleTileAction(action, targetTile) {
    if (!targetTile) {
        console.error("Invalid target tile.");
        return;
    }

    const { x, y } = targetTile;
    const tileData = gameState.grid.tiles[y][x];
    const tile = new Tile(tileData);

    if (typeof tile[action] === "function") {
        try {
            tile[action]();
            const timeCost = gameData.CONFIG.ACTIONS[action.toUpperCase()]?.TIME_COST;
        } catch (error) {
            console.error(`Error executing action '${action}' on tile at (${x}, ${y}):`, error);
        }
    } else {
        console.warn(`Invalid action '${action}' for Tile. Ensure it is implemented.`);
    }

    gameState.grid.tiles[y][x] = { ...tile };

    updateTileStats();
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
    tutorial.show();
}

function hideTutorial() {
    tutorial.hide();
}

/* UTILITY */

function validateGameData(data) {
    const requiredFields = ["CONFIG", "UI", "INVENTORY"];
    for (const field of requiredFields) {
        if (!data[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
}

function validateKeyBindings(bindings) {
    const requiredKeys = [
        "PLAYER_MOVE_UP", "PLAYER_MOVE_DOWN", "PLAYER_MOVE_LEFT", "PLAYER_MOVE_RIGHT",
        "HIGHLIGHT_TILE_UP", "HIGHLIGHT_TILE_DOWN", "HIGHLIGHT_TILE_LEFT", "HIGHLIGHT_TILE_RIGHT",
        "RESET_HIGHLIGHT"
    ];
    requiredKeys.forEach(key => {
        if (!bindings[key]) {
            console.warn(`Missing key binding: ${key}`);
        }
    });
}

function getTargetTile() {
    const { x, y } = gameState.grid.highlightedTile.x !== null ?
        gameState.grid.highlightedTile : gameState.player;
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
    return Math.abs(gameState.player.position.x - x) + Math.abs(gameState.player.position.y - y) <= 1;
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

function getCSSVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}