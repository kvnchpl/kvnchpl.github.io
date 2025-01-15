/* GLOBALS */

const JSON_URL = "https://kvnchpl.github.io/trellis/trellis.json";

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
let PLANT = {};

const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
const WEEKS_PER_SEASON = 13;
const WEEKS_PER_YEAR = WEEKS_PER_SEASON * SEASONS.length;

/* GAME STATE */

const gameState = {
    currentWeek: 1,
    currentYear: 1,
    currentSeason: "Winter",
    currentTime: 0, // Time in minutes past 7:00 AM
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
    inventory: {
        seeds: {
            tomato: 5,
            kale: 5,
        },
        produce: {
            tomato: 0,
            kale: 0,
        },
        fertilizer: 2,
        mulch: 5,
    },
};

/* INITIALIZATION */

window.onload = function() {
    fetch(JSON_URL)
        .then(response => {
        if (!response.ok) {
            throw new Error("Failed to load trellis.json: " + response.status);
        }
        return response.json();
    })
        .then(data => {
        gameData = data;   // Store the JSON data
        console.log("gameData loaded! \n", gameData);
        initGame();        // Initialize the game after data is set
    })
        .catch(error => {
        console.error("Error fetching trellis.json:", error);
    });
};

function initGame() {
    if (!gameData || !gameData.GAME_CONFIG || !gameData.TILE_CONFIG) {
        console.error("JSON data is missing required sections:", gameData);
        return;
    }

    const {
        GAME_CONFIG: gameConfig,
        TILE_CONFIG: tileConfig,
        TIME_COSTS: timeCosts,
        PLANTS: plants,
        UI: uiData
    } = gameData;

    if (!gameConfig || !tileConfig || !timeCosts || !plants || !uiData) {
        console.error("JSON data is missing required sections:", gameData);
        return;
    }

    // Configure game constants
    configureGameConstants(gameConfig, tileConfig, timeCosts, plants);


    // Set default placeholder for player position
    gameState.player.x = Math.floor(GRID_WIDTH / 2);
    gameState.player.y = Math.floor(GRID_HEIGHT / 2);

    // Initialize grid
    if (!gameData || !gameData.TILE_CONFIG || !gameData.TILE_CONFIG.TYPES) {
        console.error("TILE_CONFIG is missing or undefined:", gameData?.TILE_CONFIG);
                      return;
                      }
                      initGrid();

                      // Reset player position (ensures synchronization with grid)
                      resetPlayerPosition();

                      // Initialize UI
                      initializeUI(uiData);

                      // Show the tutorial overlay
                      showTutorial();
                      }

                      function configureGameConstants(gameConfig, tileConfig, timeCosts, plants) {
                      if (!gameConfig || !tileConfig || !timeCosts || !plants) {
                      console.error("configureGameConstants received invalid arguments:", {
                      gameConfig,
                      tileConfig,
                      timeCosts,
                      plants
                      });
                      return;
                      }

                      // Assign game configuration
                      TILE_SIZE = gameConfig.GRID.TILE_SIZE;
                      GRID_WIDTH = gameConfig.GRID.WIDTH;
                      GRID_HEIGHT = gameConfig.GRID.HEIGHT;
                      DAY_START = gameConfig.TIME.START;
                      DAY_END = gameConfig.TIME.END;
                      BASE_MOISTURE_START = gameConfig.MOISTURE.START;
                      BASE_MOISTURE_DECAY = gameConfig.MOISTURE.DECAY;
                      PEST_OUTBREAK_CHANCE = gameConfig.PEST_OUTBREAK_CHANCE;
                      REGION_NAME = gameConfig.REGION;

                      // Assign tile configuration
                      Object.assign(TILE_TYPE, tileConfig.TYPES);

                      // Assign plant data and time costs
                      Object.assign(PLANT, plants);
                      Object.assign(TIME_COST, timeCosts);

                      // Directly assign FIELDS from gameData
                      if (!gameData.FIELDS) {
                      console.error("FIELDS is missing in gameData:", gameData);
                      return;
                      }
                      }

                      function initGrid() {
                      if (!gameData.TILE_CONFIG || !gameData.TILE_CONFIG.TYPES) {
                      console.error("TILE_CONFIG or TILE_CONFIG.TYPES is missing:", gameData.TILE_CONFIG);
                      return;
                      }

                      // Initialize grid with default tiles
                      gameState.grid = Array.from({ length: GRID_HEIGHT }, () =>
        Array.from({ length: GRID_WIDTH }, () => {
            // Create a default tile
            const tile = structuredClone(gameData.TILE_CONFIG.TYPES.EMPTY);

            // Initialize missing properties
            tile.TYPE = { VALUE: "EMPTY" };
            tile.MOISTURE = { VALUE: gameData.TILE_CONFIG.TYPES.EMPTY.MOISTURE };
            tile.IS_TILLED = { VALUE: gameData.TILE_CONFIG.TYPES.EMPTY.IS_TILLED };
            tile.PLANT = { VALUE: null };
            tile.WEED_LEVEL = { VALUE: 0 };
            tile.MOISTURE_DECAY_RATE = { VALUE: gameData.GAME_CONFIG.MOISTURE.DECAY };

            return tile;
        })
        );

        console.log("Grid initialized successfully:", gameState.grid);
        render();
    }

    function initializeUI(uiData) {
        // Populate sections initially
        populateSections(uiData);

        // Debugging: Check button availability
        console.log("Buttons in DOM after populateSections:", {
            nextWeekBtn: !!document.getElementById("nextWeekBtn"),
            resetPositionBtn: !!document.getElementById("resetPositionBtn"),
            closeTutorialBtn: !!document.getElementById("closeTutorialBtn"),
        });

        // Delay attaching event listeners until the DOM is fully populated
        setTimeout(() => {
            const nextWeekBtn = document.getElementById("nextWeekBtn");
            const resetPositionBtn = document.getElementById("resetPositionBtn");
            const closeTutorialBtn = document.getElementById("closeTutorialBtn");

            if (!nextWeekBtn || !resetPositionBtn || !closeTutorialBtn) {
                console.error("Required buttons are not yet available in the DOM.");
                return;
            }

            // Attach event listeners
            attachEventListeners();

            // Update dynamic content
            updateUISection("gameUI", uiData.GAME_UI);
            updateUISection("tileStats", uiData.TILE_STATS);
            updateUISection("inventory", uiData.INVENTORY);

            // Additional static updates
            updateTimeDisplay();
            updateYearAndSeason();
            updateWeekDisplay();
            updateBiodiversityDisplay();
        }, 0); // Defer execution to the next event loop
    }

    function populateSections(uiData) {
        populateUISection("tutorialOverlay", uiData.TUTORIAL);
        populateUISection("gameUI", uiData.GAME_UI);
        populateUISection("tileStats", uiData.TILE_STATS);
        populateUISection("inventory", uiData.INVENTORY);
        if (!uiData.BUTTONS){
            console.error("Missing uiData.BUTTONS.");
            return;
        }
        
        populateUISection("buttonContainer", uiData.BUTTONS);
    }

    function populateUISection(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || !data) {
            console.error(`Container or data missing for ID: ${containerId}`);
            return;
        }

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Add heading
        if (data.DISPLAY_HEADING) {
            const heading = document.createElement("strong");
            heading.textContent = data.HEADING;
            container.appendChild(heading);
        }

        // Populate fields
        if (data.FIELDS) {
            data.FIELDS.forEach(fieldKey => {
                const field = safeGet(gameData, `FIELDS.${fieldKey}`, null);
                if (!field) {
                    console.warn(`Field '${fieldKey}' not found in FIELDS.`);
                    return;
                }

                const fieldRow = document.createElement("div");
                const label = document.createElement("span");
                label.textContent = `${field.LABEL}: `;

                const value = document.createElement("span");
                value.id = field.ID;
                value.textContent = field.DEFAULT_VALUE;

                fieldRow.appendChild(label);
                fieldRow.appendChild(value);
                container.appendChild(fieldRow);
            });
        }
console.log("data: ", data);
        // Populate buttons
        if (data.BUTTONS) {
            console.log("Rendering buttons:", data.BUTTONS);
            Object.values(data.BUTTONS).forEach(buttonConfig => {
                const button = document.createElement("button");
                button.id = buttonConfig.ID;
                button.textContent = buttonConfig.LABEL;

                const handler = window[buttonConfig.ON_CLICK];
                if (typeof handler === "function") {
                    button.addEventListener("click", handler);
                } else {
                    console.error(`Handler function '${buttonConfig.ON_CLICK}' not found.`);
                }

                container.appendChild(button);
            });

            console.log("Buttons added to container:", containerId);
        }
    }

    function updateUISection(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || !data) {
            console.error(`Container or data missing for ID: ${containerId}`);
            return;
        }

        // Ensure FIELDS is defined in gameData
        if (!gameData?.FIELDS) {
            console.error("FIELDS is missing in gameData:", gameData);
            return;
            }

            if (!data.FIELDS) {
            console.error(`FIELDS is missing in the provided data for container ${containerId}.`);
return;
}

// Update field values dynamically
data.FIELDS.forEach(fieldKey => {
const field = gameData.FIELDS[fieldKey];
if (!field) {
console.warn(`Field '${fieldKey}' not found in FIELDS.`);
return;
}

const element = document.getElementById(field.ID);
if (element) {
element.textContent = field.VALUE ?? field.DEFAULT_VALUE;
}
});
}

function appendTileStat(container, label, id) {
const field = document.createElement("div");

const labelSpan = document.createElement("span");
labelSpan.textContent = `${capitalize(label)}: `;
field.appendChild(labelSpan);

const valueSpan = document.createElement("span");
valueSpan.id = id;
valueSpan.textContent = "N/A"; // Default value
field.appendChild(valueSpan);

container.appendChild(field);
}

// Helper function to capitalize strings
function capitalize(str) {
if (typeof str !== "string") {
console.warn("capitalize called with non-string:", str);
return String(str || "").toUpperCase(); // Fall back to a default string representation
}
return str.charAt(0).toUpperCase() + str.slice(1);
}


/* EVENT LISTENERS */

function attachEventListeners() {
const nextWeekBtn = document.getElementById("nextWeekBtn");
const resetPositionBtn = document.getElementById("resetPositionBtn");
const closeTutorialBtn = document.getElementById("closeTutorialBtn");

if (nextWeekBtn) nextWeekBtn.addEventListener("click", skipToNextWeek);
if (resetPositionBtn) resetPositionBtn.addEventListener("click", resetPlayerPosition);
if (closeTutorialBtn) closeTutorialBtn.addEventListener("click", hideTutorial);

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

// Clear canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Draw the grid
drawGrid(ctx);
}

function drawGrid(context) {
for (let row = 0; row < GRID_HEIGHT; row++) {
for (let col = 0; col < GRID_WIDTH; col++) {
const tile = gameState.grid[row][col];

// Default tile color
let tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-default").trim();

// Determine color based on type
if (tile.TYPE.VALUE === TILE_TYPE.PATH) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-path").trim();
} else if (tile.TYPE.VALUE === TILE_TYPE.PLOT) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plot").trim();
}

// Modify color based on soil moisture
if (tile.MOISTURE.VALUE > 70) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-high").trim();
} else if (tile.MOISTURE.VALUE < 30) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-low").trim();
}

// Tilled tile color
if (tile.IS_TILLED.VALUE) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-tilled").trim();
}

// Plant growth stage colors
if (tile.PLANT.VALUE) {
if (tile.PLANT.VALUE.IS_MATURE) {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-mature").trim();
} else {
tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-young").trim();
}
}

context.fillStyle = tileColor;
context.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

// Highlight tile with a red border if it's the highlighted tile
if (row === gameState.highlightedTile.y && col === gameState.highlightedTile.x) {
context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tile-highlight").trim();
context.lineWidth = 3;
context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
} else {
context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas-border").trim();
context.lineWidth = 1;
context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

// Add a bright border for the player position
if (row === gameState.player.y && col === gameState.player.x) {
context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tile-player").trim();
context.lineWidth = 3;
context.strokeRect(col * TILE_SIZE + 1, row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
}
}
}
}

/* TIME & WEEK LOGIC */

function advanceTime(minutes) {
gameState.currentTime += minutes; // Update gameState.currentTime instead of currentTime

if (gameState.currentTime >= DAY_END) {
skipToNextWeek();
} else {
updateTimeDisplay();
render();
}
}

function skipToNextWeek() {
// Increment the week and reset time
gameState.currentWeek++;
gameState.currentTime = DAY_START;

// Update time state (year and season)
updateYearAndSeason();

// Perform weekly updates for tiles
updateAllTiles();
updateBiodiversity();

// Update UI
updateTimeDisplay();
updateWeekDisplay();
updateBiodiversityDisplay();
updateTileStats();

// Re-render the grid
render();
}

function updateYearAndSeason() {
gameState.currentYear = Math.floor(gameState.currentWeek / WEEKS_PER_YEAR) + 1;
gameState.currentSeason = SEASONS[Math.floor((gameState.currentWeek % WEEKS_PER_YEAR) / WEEKS_PER_SEASON)];

// Update the display
document.getElementById("yearDisplay").textContent = "Year: " + gameState.currentYear;
document.getElementById("seasonDisplay").textContent = "(" + gameState.currentSeason + ")";
}

function updateBiodiversity() {
const typesFound = new Set();

for (let row = 0; row < GRID_HEIGHT; row++) {
for (let col = 0; col < GRID_WIDTH; col++) {
const tile = gameState.grid[row][col];
if (tile.PLANT.VALUE) {
typesFound.add(tile.PLANT.VALUE.NAME);
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

switch (e.key) {
// Player movement (Arrow keys)
case "ArrowUp":
newY = gameState.player.y - 1;
break;
case "ArrowDown":
newY = gameState.player.y + 1;
break;
case "ArrowLeft":
newX = gameState.player.x - 1;
break;
case "ArrowRight":
newX = gameState.player.x + 1;
break;

// Highlight adjacent tiles (WASD keys)
case "w":
case "W":
highlightTile(gameState.player.x, gameState.player.y - 1); // Highlight above
return;
case "s":
case "S":
highlightTile(gameState.player.x, gameState.player.y + 1); // Highlight below
return;
case "a":
case "A":
highlightTile(gameState.player.x - 1, gameState.player.y); // Highlight left
return;
case "d":
case "D":
highlightTile(gameState.player.x + 1, gameState.player.y); // Highlight right
return;
case "q":
case "Q":
highlightTile(gameState.player.x, gameState.player.y); // Highlight player tile
return;

// Actions (Keys 1–8)
case "1": // Till
tillSoil();
break;
case "2": // Fertilize
fertilizeTile();
break;
case "3": // Plant
plantSeed("tomato"); // Example default plant type
break;
case "4": // Water
waterTile();
break;
case "5": // Mulch
mulchTile();
break;
case "6": // Weed
weedTile();
break;
case "7": // Harvest
harvestPlant();
break;
case "8": // Clear
clearPlot();
break;

default:
return; // Do nothing for other keys
}

// Check if the player is attempting to move to a new tile
if (newX !== gameState.player.x || newY !== gameState.player.y) {
// Prevent movement if the target tile is out of bounds or a plot
if (
newX >= 0 &&
newX < GRID_WIDTH &&
newY >= 0 &&
newY < GRID_HEIGHT &&
gameState.grid[newY][newX].TYPE.VALUE !== TILE_TYPE.PLOT
) {
gameState.player.x = newX;
gameState.player.y = newY;

// Reset highlighted tile to the player's current position
highlightTile(gameState.player.x, gameState.player.y);

render();
} else {
console.log("Cannot move onto this tile!");
}
}
}

function resetPlayerPosition() {
if (!gameState.grid || gameState.grid.length === 0) {
console.error("Cannot reset player position: grid not initialized.");
return;
}

// Reset player position to the center of the grid
gameState.player.x = Math.floor(GRID_WIDTH / 2);
gameState.player.y = Math.floor(GRID_HEIGHT / 2);

// Align the highlighted tile with the player's position
gameState.highlightedTile = { x: gameState.player.x, y: gameState.player.y };

highlightTile(gameState.player.x, gameState.player.y);
updateTileStats();
render();
}

document.getElementById("gameCanvas").addEventListener("click", (e) => {
const canvas = e.target;
const rect = canvas.getBoundingClientRect();

const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

highlightTile(x, y); // Directly call highlightTile with the clicked coordinates
});
function highlightTile(x, y) {
if (isTileValid(x, y) && isTileAdjacent(x, y)) {
gameState.highlightedTile = { x, y };
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
const oldMoisture = tile.MOISTURE;
updateTileMoisture(tile);
updateTilePlant(tile, row, col);
}
}
}

function updateTileMoisture(tile) {
if (tile.MOISTURE.VALUE !== undefined && tile.MOISTURE_DECAY_RATE.VALUE !== undefined) {
const oldMoisture = tile.MOISTURE.VALUE;
tile.MOISTURE.VALUE = Math.max(tile.MOISTURE.VALUE - tile.MOISTURE_DECAY_RATE.VALUE, 0);
} else {
console.error("Moisture properties missing for tile:", tile);
}
}

function updateTilePlant(tile, row, col) {
if (!tile.PLANT.VALUE) return;

const plantName = tile.PLANT.VALUE.NAME;
const plantData = PLANT[plantName];

// Extract soil properties
const { N, P, K } = tile.SOIL_NUTRIENTS;
const sufficientNutrients = N >= 30 && P >= 20 && K >= 20;
const sufficientMoisture = tile.MOISTURE.VALUE >= 40;

// Grow plant if conditions are sufficient
if (sufficientNutrients && sufficientMoisture) {
tile.PLANT.VALUE.AGE += 1;
} else {
console.log(`Plant at (${row}, ${col}) is growing slowly due to poor conditions.`);
}

// Deplete nutrients if the plant is growing
if (sufficientNutrients) {
tile.SOIL_NUTRIENTS.N.VALUE = Math.max(N - 10, 0);
tile.SOIL_NUTRIENTS.P.VALUE = Math.max(P - 5, 0);
tile.SOIL_NUTRIENTS.K.VALUE = Math.max(K - 5, 0);
}

// Check if the plant is mature
if (tile.PLANT.VALUE.AGE >= plantData.growthTime) {
tile.PLANT.VALUE.IS_MATURE = true;
}
}

function updateTileStats() {
const { x, y } = gameState.highlightedTile;
const tile = gameState.grid[y][x];

if (!tile) {
console.error("Tile stats update failed: Tile is undefined.");
return;
}

const heading = document.getElementById("tileStatsHeading");
if (heading) heading.textContent = `Tile Stats (${x}, ${y})`;

gameData.UI.TILE_STATS.FIELDS.forEach(fieldKey => {
const fieldConfig = safeGet(gameData.FIELDS, fieldKey, null);
if (!fieldConfig) return;

const element = document.getElementById(fieldConfig.ID);
if (element) {
let value = safeGet(tile, `${fieldKey}.VALUE`, fieldConfig.DEFAULT_VALUE);
if (fieldConfig.FORMAT && typeof value === "object") {
value = fieldConfig.FORMAT.replace(/\{(\w+)\}/g, (_, match) => value[match] ?? "N/A");
}
element.textContent = value;
}
});
}

function clearTileStats() {
const statsContainer = document.getElementById("tileStats");
const spans = statsContainer.querySelectorAll("span");
spans.forEach(span => (span.textContent = "N/A"));
}

/* UI UPDATES */

function updateTimeDisplay() {
const timeDisplay = document.getElementById("timeDisplay");

// Convert gameState.currentTime (minutes since 7:00 AM) to HH:MM format
let totalMinutes = gameState.currentTime;
let hours = 7 + Math.floor(totalMinutes / 60);
let minutes = totalMinutes % 60;
let ampm = hours >= 12 ? "PM" : "AM";

// Convert to 12-hour format
if (hours > 12) hours -= 12;
if (hours === 0) hours = 12;

const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
timeDisplay.textContent = `Time: ${hours}:${formattedMinutes} ${ampm}`;
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
tile.IS_TILLED.VALUE = true;

console.log("Soil tilled at:", tile);
advanceTime(TIME_COST.TILL);
updateTileStats();
} else {
console.log("Cannot till this tile.");
}
}

// FERTILIZE
function fertilizeTile() {
const tile = getTargetTile();

if (gameState.inventory.fertilizer > 0) {
tile.SOIL_NUTRIENTS.N.VALUE = Math.min(tile.SOIL_NUTRIENTS.N.VALUE + 20, 100);
tile.SOIL_NUTRIENTS.P.VALUE = Math.min(tile.SOIL_NUTRIENTS.P.VALUE + 10, 100);
tile.SOIL_NUTRIENTS.K.VALUE = Math.min(tile.SOIL_NUTRIENTS.K.VALUE + 10, 100);
gameState.inventory.fertilizer--;

console.log("Fertilized tile at:", tile);
advanceTime(TIME_COST.FERTILIZE);
updateTileStats();
} else {
console.log("No fertilizer left!");
}
}

// PLANT
function plantSeed(seedType) {
const tile = getTargetTile();
if (!tile.IS_TILLED.VALUE) {
console.log("Soil is not tilled. Cannot plant yet.");
return;
}
if (tile.PLANT.VALUE !== null) {
console.log("There's already a plant here!");
return;
}
if (gameState.inventory.seeds[seedType] && gameState.inventory.seeds[seedType] > 0) {
// Use 1 seed
gameState.inventory.seeds[seedType]--;
// Create a new plant object
tile.PLANT.VALUE = {
NAME: seedType,
IS_MATURE: false,
AGE: 0
};
console.log(`Planted ${seedType} at (${gameState.player.x}, ${gameState.player.y})`);
advanceTime(TIME_COST.PLANT);
updateTileStats();
} else {
console.log(`No ${seedType} seeds left.`);
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
const tile = getTargetTile();

if (gameState.inventory.mulch > 0) {
tile.MOISTURE_DECAY_RATE.VALUE = Math.max(tile.MOISTURE_DECAY_RATE.VALUE - 1, 0);
gameState.inventory.mulch--;

console.log("Mulched tile at:", tile);
advanceTime(TIME_COST.MULCH);
updateTileStats();
} else {
console.log("No mulch left!");
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
const tile = getTargetTile();

if (tile.PLANT.VALUE && tile.PLANT.VALUE.IS_MATURE) {
const type = tile.PLANT.VALUE.NAME;
gameState.inventory.produce[type] = (gameState.inventory.produce[type] || 0) + PRODUCE_YIELD[type];

console.log(`Harvested ${type} at:`, tile);

tile.PLANT.VALUE = null; // Remove the plant after harvesting
tile.IS_TILLED.VALUE = false; // Optionally revert to untilled
advanceTime(TIME_COST.HARVEST);
updateTileStats();
} else {
console.log("No mature plant to harvest here.");
}
}

// CLEAR
function clearPlot() {
const tile = getTargetTile();

if (tile.TYPE.VALUE === TILE_TYPE.PLOT) {
tile.TYPE.VALUE = TILE_TYPE.EMPTY;
tile.IS_TILLED.VALUE = false;
tile.PLANT.VALUE = null;

console.log("Plot cleared at:", tile);
advanceTime(TIME_COST.CLEAR);
updateTileStats();
} else {
console.log("This tile is not a plot.");
}
}

/* INVENTORY */

function updateInventory() {
const inventoryData = gameData.UI.INVENTORY;
if (inventoryData) {
updateUISection("inventory", inventoryData);
} else {
console.error("Inventory data is missing in UI.");
}
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
const { x, y } = gameState.highlightedTile.x !== null ? gameState.highlightedTile : gameState.player;
return gameState.grid[y][x];
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