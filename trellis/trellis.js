/* CLASSES */

class GameState {
    constructor(config) {
        this.config = config;
        this.time = {
            currentTime: config.GAME_CONFIG.TIME.START,
        };
        this.calendar = {
            currentWeek: config.GAME_CONFIG.DEFAULT_WEEK,
            currentYear: config.GAME_CONFIG.DEFAULT_YEAR,
            currentSeason: config.GAME_CONFIG.DEFAULT_SEASON,
        };
        this.grid = {
            tiles: this.initGrid(config),
            highlightedTile: { x: null, y: null },
        };
        this.player = {
            position: {
                x: Math.floor(config.GAME_CONFIG.GRID.WIDTH / 2),
                y: Math.floor(config.GAME_CONFIG.GRID.HEIGHT / 2),
            },
            inventory: new Inventory(config.INVENTORY),
        };
        this.score = {
            biodiversity: 0,
        };
        this.ui = {
            isTutorialActive: true,
        };
    }

    initGrid(config) {
        const { WIDTH, HEIGHT } = config.GAME_CONFIG.GRID;
        const defaultTypeKey = config.TILE_CONFIG.DEFAULT_TYPE;

        return Array.from({ length: HEIGHT }, (_, y) =>
            Array.from({ length: WIDTH }, (_, x) =>
                new Tile(TileService.createTile(defaultTypeKey), x, y))
        );
    }
}

class Tile {
    constructor(data, x, y) {
        Object.assign(this, data);
        this.x = x;
        this.y = y;
    }

    isType(typeKey) {
        return this.TYPE === typeKey;
    }

    setType(typeKey) {
        TileService.updateTile(this, typeKey);
    }

    highlight(gameState) {
        const prevTile = window.gameState.grid.highlightedTile;
        if (prevTile) {
            document
                .querySelector(`#tile-${prevTile.y}-${prevTile.x}`)
                ?.classList.remove("highlighted");
        }
        const tileElement = document.querySelector(`#tile-${this.y}-${this.x}`);
        tileElement?.classList.add("highlighted");
        window.gameState.grid.highlightedTile = { x: this.x, y: this.y };
    }

    till() {
        const emptyKey = window.gameData.CONFIG.TILE_CONFIG.DEFAULT_TYPE; // Dynamically reference the default type
        const plotKey = Object.keys(window.gameData.CONFIG.TILE_CONFIG.TYPES).find(key => window.gameData.CONFIG.TILE_CONFIG.TYPES[key].IS_TILLED);

        if (this.isType(emptyKey) && plotKey) {
            this.setType(plotKey);
        }
    }

    fertilize() {
        if (this.IS_TILLED && window.gameState.player.inventory.FERTILIZER > 0) {
            this.updateSoilNutrients({
                N: 10,
                P: 5,
                K: 5
            });
            Inventory.update('FERTILIZER', -1);
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
        if (this.IS_TILLED && window.gameState.player.inventory.MULCH > 0) {
            this.MOISTURE_DECAY_RATE = Math.max(this.MOISTURE_DECAY_RATE - 1, 0);
            Inventory.update('MULCH', -1);
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
            const yieldAmount = window.gameData.CONFIG.PLANTS[plantType.toUpperCase()].YIELD;
            if (yieldAmount > 0) {
                Inventory.update(`produce.${plantType}`, yieldAmount); // Add harvested yield
                console.log(`Harvested ${yieldAmount} ${plantType}(s).`);
            }
            this.PLANT_DATA.VALUE = null;
            this.IS_TILLED = false;
        }
    }

    clear() {
        const defaultType = window.gameData.CONFIG.TILE_CONFIG.DEFAULT_TYPE;
        this.setType(defaultType);
    }

    updateMoisture(decayRate) {
        if (!this.MOISTURE) return;
        this.MOISTURE.VALUE = Math.max(this.MOISTURE.VALUE - decayRate, 0);
    }

    updateSoilNutrients({
        N,
        P,
        K
    }) {
        this.SOIL_NUTRIENTS.N += N;
        this.SOIL_NUTRIENTS.P += P;
        this.SOIL_NUTRIENTS.K += K;
    }

    growPlant(conditions) {
        if (!this.PLANT_DATA || !this.PLANT_DATA.VALUE) return;
        const {
            N,
            P,
            K
        } = this.SOIL_NUTRIENTS;
        if (conditions.isSufficient(N, P, K, this.MOISTURE.VALUE)) {
            this.PLANT_DATA.VALUE.AGE++;
        }
    }
}

class TileService {
    static defaults = {};
    static types = {};
    static styles = new Map();

    static initializeDefaults(defaults, types) {
        this.defaults = structuredClone(defaults);
        this.types = structuredClone(types);
    }

    static initializeStyles() {
        Object.keys(this.types).forEach((typeKey) => {
            const cssVariable = `--tile-${typeKey.toLowerCase()}`;
            const style = getCSSVariable(cssVariable) || getCSSVariable(window.gameData.CONFIG.TILE_CONFIG.DEFAULT_STYLE);
            this.styles.set(typeKey, style);
        });
    }

    static createTile(typeKey) {
        const typeConfig = this.types[typeKey];
        if (!typeConfig) {
            console.error(`Tile type '${typeKey}' not found.`);
            return null;
        }
        return new Tile({
            ...this.defaults,
            ...typeConfig,
            TYPE: typeKey
        });
    }

    static updateTile(tile, typeKey) {
        const typeConfig = this.types[typeKey];
        if (!typeConfig) {
            console.error(`Tile type '${typeKey}' not found.`);
            return;
        }
        Object.assign(tile, {
            ...this.defaults,
            ...typeConfig,
            TYPE: typeKey
        });
    }

    static getTypeConfig(typeKey) {
        return this.types[typeKey] || null;
    }
}

class Inventory {
    constructor(data) {
        Object.assign(this, data);
    }

    static update(itemKey, delta) {
        if (window.gameState.player.inventory[itemKey] !== undefined) {
            window.gameState.player.inventory[itemKey] = Math.max(0, window.gameState.player.inventory[itemKey] + delta);
            this.updateUI(itemKey, window.gameState.player.inventory[itemKey]);
        } else {
            console.error(`Invalid inventory item: ${itemKey}`);
        }
    }

    static updateUI(itemKey, value) {
        const fieldId = `inventory${itemKey.charAt(0).toUpperCase() + itemKey.slice(1)}`;
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
            fieldElement.textContent = value;
        } else {
            console.warn(`Field element with ID '${fieldId}' not found.`);
        }
    }
}

class Tutorial {
    constructor(overlayData) {
        this.overlayId = overlayData.CONTAINER;
        this.overlay = document.getElementById(this.overlayId);
        this.isActive = true;
    }

    show() {
        this.isActive = true;
        this.overlay.classList.remove("hidden");
    }

    hide() {
        this.isActive = false;
        this.overlay.classList.add("hidden");
    }
}

/* INITIALIZATION */

async function initGame() {
    try {
        TileService.initializeDefaults(window.gameData.CONFIG.TILE_CONFIG.DEFAULTS, window.gameData.CONFIG.TILE_CONFIG.TYPES);
        TileService.initializeStyles();

        window.gameState = new GameState(window.gameData.CONFIG);
        const tutorial = new Tutorial(window.gameData.UI.TUTORIAL_OVERLAY);

        window.hideTutorial = () => tutorial.hide();

        // Set the initial highlighted tile to the player's position
        window.gameState.grid.highlightedTile = { ...window.gameState.player.position };

        // Iterate through all UI sections and render them
        Object.values(window.gameData.UI).forEach(uiSection => {
            renderUISection(uiSection, window.gameData);
        });

        // Attach event listeners
        attachUIEventListeners();
        attachCanvasEventListeners();

        // Update UI with initial values
        updateTimeDisplay();
        updateWeekDisplay();
        updateBiodiversityDisplay();
        updateTileStats();

        if (tutorial.overlay) {
            tutorial.show();
        } else {
            console.warn("Tutorial overlay not found. Skipping tutorial setup.");
        }

        return {
            gameState: window.gameState,
            inventory,
            tutorial
        };
    } catch (error) {
        console.error("Error during game initialization:", error);
        throw error;
    }
}

window.onload = async () => {
    const gameDataURL = document.querySelector('meta[name="game-data"]')?.content;
    if (!gameDataURL) {
        console.error("Game data URL is not defined in the HTML <meta> tag.");
        return;
    }
    try {
        const response = await fetch(gameDataURL);
        if (!response.ok) {
            throw new Error(`Failed to fetch game data: ${response.status} ${response.statusText}`);
        }

        window.gameData = await response.json(); // Assign the fetched gameData to the global window object

        const initializedComponents = await initGame();
        console.log("Game successfully initialized: ", initializedComponents);
    } catch (error) {
        console.error("Error during game loading or initialization:", error);
    }
};

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

    canvas.width = window.gameData.CONFIG.GAME_CONFIG.GRID.WIDTH * window.gameData.CONFIG.GAME_CONFIG.GRID.TILE_SIZE;
    canvas.height = window.gameData.CONFIG.GAME_CONFIG.GRID.HEIGHT * window.gameData.CONFIG.GAME_CONFIG.GRID.TILE_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
}

function drawGrid(context) {
    const tileSize = window.gameData.CONFIG.GAME_CONFIG.GRID.TILE_SIZE;
    const defaultBorderStyle = window.gameData.CONFIG.TILE_CONFIG.BORDER_STYLE;
    const highlightStyle = window.gameData.CONFIG.TILE_CONFIG.HIGHLIGHT_STYLE;
    const playerStyle = window.gameData.CONFIG.TILE_CONFIG.PLAYER_STYLE;

    for (let row = 0; row < window.gameState.grid.tiles.length; row++) {
        for (let col = 0; col < window.gameState.grid.tiles[row].length; col++) {
            const tile = window.gameState.grid.tiles[row][col];
            const baseColor = getTileStyle(tile.TYPE);

            const adjustments = calculateAdjustments(tile);
            const finalColor = parseAndAdjustRGB(baseColor, adjustments);

            context.fillStyle = finalColor;
            context.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);

            // Draw the border (highlight if highlighted, otherwise default)
            context.strokeStyle =
                row === window.gameState.grid.highlightedTile.y && col === window.gameState.grid.highlightedTile.x ?
                    getCSSVariable(highlightStyle) :
                    getCSSVariable(defaultBorderStyle);

            context.lineWidth = row === window.gameState.grid.highlightedTile.y &&
                col === window.gameState.grid.highlightedTile.x ?
                3 :
                1;

            context.strokeRect(
                col * tileSize,
                row * tileSize,
                tileSize,
                tileSize
            );

            // Draw the player marker if the player is on this tile
            if (row === window.gameState.player.position.y && col === window.gameState.player.position.x) {
                context.fillStyle = getCSSVariable(playerStyle);
                const padding = tileSize * 0.2; // Shrink player marker a bit
                context.fillRect(
                    col * tileSize + padding,
                    row * tileSize + padding,
                    tileSize - padding * 2,
                    tileSize - padding * 2
                );
            }
        }
    }
}

function renderUISection(uiSection, gameData) {
    const containerId = uiSection.CONTAINER;
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container with ID '${containerId}' not found in the DOM.`);
        return;
    }
    if (!uiSection) {
        console.warn(`No data provided for container '${containerId}'.`);
        return;
    }
    if (!uiSection.FIELDS) {
        console.warn(`No fields provided for container '${containerId}'.`);
        return;
    }

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    uiSection.FIELDS.forEach((fieldKey) => {
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
            const fieldContainer = createElement(gameData.UI_COMPONENTS.FIELD_CONTAINER.TAG, {
                className: gameData.UI_COMPONENTS.FIELD_CONTAINER.CLASS,
            });

            const labelElement = createElement(gameData.UI_COMPONENTS.FIELD_LABEL.TAG, {
                className: gameData.UI_COMPONENTS.FIELD_LABEL.CLASS,
                textContent: `${fieldData.LABEL}:`,
            });

            fieldContainer.appendChild(labelElement);

            const valueElement = createElement(gameData.UI_COMPONENTS.FIELD_VALUE.TAG, {
                id: fieldData.ID,
                className: gameData.UI_COMPONENTS.FIELD_VALUE.CLASS,
                textContent: fieldData.DEFAULT_VALUE,
            });
            fieldContainer.appendChild(valueElement);

            container.appendChild(fieldContainer);

            if (fieldData.SUBFIELDS) {
                renderSubfields(container, fieldData.SUBFIELDS, fieldData.DEFAULT_VALUE || {}, gameData);
            }
        } else if (fieldData.SECTION_TYPE === "HEADING") {
            const headingElement = createElement(gameData.UI_COMPONENTS.HEADING.TAG, {
                id: fieldData.ID,
                className: gameData.UI_COMPONENTS.HEADING.CLASS,
                textContent: fieldData.LABEL,
            });
            container.appendChild(headingElement);
        } else if (fieldData.SECTION_TYPE === "CONTENT") {
            const contentElement = createElement(gameData.UI_COMPONENTS.CONTENT.TAG, {
                id: fieldData.ID,
                className: gameData.UI_COMPONENTS.CONTENT.CLASS,
                textContent: fieldData.LABEL,
            });
            container.appendChild(contentElement);
        } else {
            console.warn(`Unknown SECTION_TYPE: '${fieldData.SECTION_TYPE}' for field '${fieldKey}'.`);
        }
    });
}

function renderSubfields(parentContainer, subfields, defaultValues, gameData, level = 1) {
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
            textContent: (defaultValues && defaultValues[key]) || subfieldData.DEFAULT_VALUE, // Display the default value for the subfield
        });

        subfieldContainer.appendChild(labelElement);
        subfieldContainer.appendChild(valueElement);

        // Append the subfield container to the parent container
        parentContainer.appendChild(subfieldContainer);

        // Recursively render nested subfields
        if (subfieldData.SUBFIELDS) {
            renderSubfields(parentContainer, subfieldData.SUBFIELDS, defaultValues ? defaultValues[key] : {}, gameData, level + 1);
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
    const keyBindings = window.gameData.CONFIG.KEY_BINDINGS;
    if (Object.values(keyBindings).includes(e.key)) {
        e.preventDefault();
    }
}

function handleKeyDown(e) {
    const keyConfig = window.gameData.CONFIG.KEY_BINDINGS[e.key];
    if (!keyConfig) return;

    switch (keyConfig.TYPE) {
        case "PLAYER_MOVE":
            handlePlayerMovement(keyConfig.DIRECTION.toLowerCase());
            break;
        case "HIGHLIGHT_TILE":
            handleTileHighlight(keyConfig.DIRECTION.toLowerCase());
            break;
        case "ACTION":
            handleTileAction(keyConfig.ACTION.toLowerCase());
            break;
        default:
            console.warn(`Unknown key type: '${keyConfig.TYPE}'`);
    }
}

function handlePlayerMovement(direction) {
    const { x, y } = window.gameState.player.position;
    let newX = x;
    let newY = y;

    switch (direction) {
        case "up":
            newY -= 1;
            break;
        case "down":
            newY += 1;
            break;
        case "left":
            newX -= 1;
            break;
        case "right":
            newX += 1;
            break;
        default:
            console.warn(`Unknown movement direction: '${direction}'`);
            return;
    }

    if (isTileValid(newX, newY)) {
        const targetTile = window.gameState.grid.tiles[newY]?.[newX];

        if (targetTile && !targetTile.IS_TILLED) {
            window.gameState.player.position = { x: newX, y: newY };
            highlightTile(newX, newY); // Update the highlighted tile
            render();
        } else {
            console.log("Cannot move onto a tilled tile.");
        }
    } else {
        console.log("Invalid move. Out of bounds.");
    }
}

function handleTileHighlight(direction) {
    const playerX = window.gameState.player.position.x;
    const playerY = window.gameState.player.position.y;
    let newX = playerX;
    let newY = playerY;

    switch (direction) {
        case "up":
            newY -= 1;
            break;
        case "down":
            newY += 1;
            break;
        case "left":
            newX -= 1;
            break;
        case "right":
            newX += 1;
            break;
        case "reset":
            // Keep highlight at player position
            break;
        default:
            console.warn(`Unknown highlight direction: '${direction}'`);
            return;
    }

    if (isTileValid(newX, newY) && isTileAdjacent(newX, newY)) {
        highlightTile(newX, newY);
    } else {
        console.log("Cannot highlight invalid tile:", { x: newX, y: newY });
    }
}

function handleTileAction(actionKey) {
    const { x, y } = window.gameState.grid.highlightedTile;
    const tile = window.gameState.grid.tiles[y]?.[x];

    if (!tile) {
        console.error("Invalid target tile for action.");
        return;
    }

    const actionConfig = window.gameData.CONFIG.ACTIONS[actionKey.toUpperCase()];
    if (!actionConfig) {
        console.warn(`Action '${actionKey}' not found in configuration.`);
        return;
    }

    if (typeof tile[actionKey] === "function") {
        tile[actionKey](actionConfig.PARAMS || {});
        advanceTime(actionConfig.TIME_COST || 0);
        render();
    } else {
        console.warn(`Action '${actionKey}' is not implemented for the tile.`);
    }
}

function attachCanvasEventListeners() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }

    const handleClick = (e) => {
        if (window.gameState.ui.isTutorialActive) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / window.gameData.CONFIG.GAME_CONFIG.GRID.TILE_SIZE);
        const y = Math.floor((e.clientY - rect.top) / window.gameData.CONFIG.GAME_CONFIG.GRID.TILE_SIZE);

        highlightTile(x, y);
    };

    canvas.addEventListener("click", handleClick);

    canvas._handleClick = handleClick;
}

/* TIME & WEEK LOGIC */

function advanceTime(minutes) {
    window.gameState.time.currentTime += minutes;

    if (window.gameState.time.currentTime >= window.gameData.CONFIG.GAME_CONFIG.TIME.END) {
        skipToNextWeek();
    } else {
        updateTimeDisplay();
        render();
    }
}

function skipToNextWeek() {
    window.gameState.calendar.currentWeek++;
    window.gameState.time.currentTime = window.gameData.CONFIG.GAME_CONFIG.TIME.START;

    updateYearAndSeason();

    updateAllTiles();
    updateBiodiversity();

    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
    updateTileStats();
}

function updateYearAndSeason() {
    window.gameState.calendar.currentYear = Math.floor(window.gameState.calendar.currentWeek / window.gameData.CONFIG.CALENDAR_CONFIG.WEEKS_PER_SEASON) + 1;
    window.gameState.calendar.currentSeason = window.gameData.CONFIG.CALENDAR_CONFIG.SEASONS[Math.floor((window.gameState.calendar.currentWeek % window.gameData.CONFIG.CALENDAR_CONFIG.WEEKS_PER_SEASON) / window.gameData.CONFIG.CALENDAR_CONFIG.WEEKS_PER_SEASON)];

    const yearField = window.gameData.FIELDS.YEAR;
    updateField(yearField.ID, window.gameState.calendar.currentYear);

    const seasonField = window.gameData.FIELDS.SEASON;
    updateField(seasonField.ID, window.gameState.calendar.currentSeason);
}

function updateBiodiversity() {
    const typesFound = new Set();

    for (let row = 0; row < window.gameState.grid.tiles.length; row++) {
        for (let col = 0; col < window.gameState.grid.tiles[row].length; col++) {
            const tile = window.gameState.grid.tiles[row][col];
            if (tile.PLANT_DATA.VALUE) {
                typesFound.add(tile.PLANT_DATA.VALUE.NAME);
            }
        }
    }

    window.gameState.score.biodiversity = typesFound.size;
    return window.gameState.score.biodiversity;
}

/* PLAYER MOVEMENT & CONTROLS */

function resetPlayerPosition() {
    if (!window.gameState.grid.tiles || window.gameState.grid.tiles.length === 0) {
        console.error("Cannot reset player position: grid not initialized.");
        return;
    }

    const gridWidth = window.gameData.CONFIG.GAME_CONFIG.GRID.WIDTH;
    const gridHeight = window.gameData.CONFIG.GAME_CONFIG.GRID.HEIGHT;

    // Ensure positions are within bounds
    window.gameState.player.position.x = Math.floor(gridWidth / 2) || 0;
    window.gameState.player.position.y = Math.floor(gridHeight / 2) || 0;

    const { x, y } = window.gameState.player.position;

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        console.error(`Invalid player position after reset: (${x}, ${y})`);
        return;
    }

    window.gameState.grid.highlightedTile = { x, y };

    const tile = window.gameState.grid.tiles[y]?.[x];
    if (!tile) {
        console.error(`Highlighted tile at (${x}, ${y}) is invalid.`);
        return;
    }

    highlightTile(x, y);
    updateTileStats();
}

function highlightTile(x, y) {
    if (!isTileValid(x, y)) {
        console.error(`Invalid tile coordinates: (${x}, ${y})`);
        return;
    }

    window.gameState.grid.highlightedTile = { x, y };

    const tile = window.gameState.grid.tiles[y][x];
    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    tile.highlight(window.gameState);
    updateTileStats();
}

/* TILE & GRID UPDATES */

function updateAllTiles() {
    window.gameState.grid.tiles.forEach(row => {
        row.forEach(tileData => {
            const tile = new Tile(tileData);
            tile.updateMoisture(window.gameState.baseMoistureDecay);
            tile.growPlant({ isSufficient: checkConditions });
        });
    });
}

function updateTileStats() {
    const { x, y } = window.gameState.grid.highlightedTile;

    if (x === null || y === null || !isTileValid(x, y)) {
        console.error(`Invalid tile coordinates: (${x}, ${y})`);
        return;
    }

    const tile = window.gameState.grid.tiles[y][x];

    if (!tile) {
        console.error(`Tile at (${x}, ${y}) is undefined.`);
        return;
    }

    updateStatsFromFields(window.gameData.UI.TILE_STATS.FIELDS, tile, window.gameData.UI.TILE_STATS.CONTAINER);
    render();
}

/* UI UPDATES */

function updateTimeDisplay() {
    const totalMinutes = window.gameState.time.currentTime;
    const hours = Math.floor(totalMinutes / 60) % 12 || 12;
    const minutes = totalMinutes % 60;
    const ampm = totalMinutes < 720 ? "AM" : "PM";
    const formattedTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;

    const timeField = window.gameData.FIELDS.TIME;
    updateField(timeField.ID, formattedTime);
}

function updateWeekDisplay() {
    const weekField = window.gameData.FIELDS.WEEK;
    updateField(weekField.ID, window.gameState.calendar.currentWeek);
}

function updateBiodiversityDisplay() {
    const biodiversityField = window.gameData.FIELDS.BIODIVERSITY;
    updateField(biodiversityField.ID, window.gameState.score.biodiversity);
}

/* UTILITY */

function isTileValid(x, y) {
    return x >= 0 && x < window.gameData.CONFIG.GAME_CONFIG.GRID.WIDTH && y >= 0 && y < window.gameData.CONFIG.GAME_CONFIG.GRID.HEIGHT;
}

function isTileAdjacent(x, y) {
    return Math.abs(window.gameState.player.position.x - x) + Math.abs(window.gameState.player.position.y - y) <= 1;
}

function safeGet(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((acc, part) => {
        if (acc && acc.hasOwnProperty(part)) {
            return acc[part];
        }
        return undefined;
    }, obj) ?? defaultValue;
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent !== undefined) element.textContent = options.textContent;
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

function getTileStyle(typeKey) {
    return TileService.styles.get(typeKey) || getCSSVariable(window.gameData.CONFIG.TILE_CONFIG.DEFAULT_STYLE);
}

function parseAndAdjustRGB(baseColor, adjustments) {
    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        return [bigint >> 16, (bigint >> 8) & 255, bigint & 255];
    };

    // Clamp RGB values between 0 and 255
    const clamp = (value) => Math.max(0, Math.min(255, value));

    const [r, g, b] = hexToRgb(baseColor);

    // Apply adjustments and clamp the results
    const adjustedR = clamp(r + (adjustments.r || 0));
    const adjustedG = clamp(g + (adjustments.g || 0));
    const adjustedB = clamp(b + (adjustments.b || 0));

    // Return adjusted RGB as a CSS color
    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
}

function calculateAdjustments(tile) {
    const adjustments = {
        r: 0,
        g: 0,
        b: 0
    };

    for (const [key, config] of Object.entries(window.gameData.CONFIG.TILE_CONFIG.RGB_ADJUSTMENTS)) {
        const {
            SCALE,
            r = 0,
            g = 0,
            b = 0
        } = config;

        if (!SCALE || !SCALE.PATH) continue;

        // Resolve the value from the tile using the path
        const value = resolvePath(tile, SCALE.PATH);

        // Handle scaling
        let scale = 0;
        if (SCALE.CONDITION !== undefined) {
            scale = value === SCALE.CONDITION ? 1 : 0;
        } else if (SCALE.DIVISOR) {
            const divisor = typeof SCALE.DIVISOR === "string" ?
                resolvePath(tile, SCALE.DIVISOR.split(".")) :
                SCALE.DIVISOR;

            if (divisor) {
                scale = value / divisor;
            }
        } else {
            scale = value;
        }

        // Apply adjustments
        adjustments.r += r * scale;
        adjustments.g += g * scale;
        adjustments.b += b * scale;
    }

    return adjustments;
}

function resolvePath(obj, path) {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
}