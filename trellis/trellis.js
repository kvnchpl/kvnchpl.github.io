/* GLOBALS */

let gameData = null;

let TILE_SIZE, GRID_WIDTH, GRID_HEIGHT;
let DAY_START, DAY_END;
let TIME_COST = {};
let GROWTH_TIME = {};
let PRODUCE_YIELD = {};

let BASE_MOISTURE_START, BASE_MOISTURE_DECAY;

const TILE_TYPE = {
    PLOT: "Plot",
    EMPTY: "Empty",
    PATH: "Path",
};

const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
const WEEKS_PER_SEASON = 13;
const WEEKS_PER_YEAR = 52;

function getSeasonAndYear(currentWeek) {
    const year = Math.floor((currentWeek - 1) / WEEKS_PER_YEAR) + 1;
    const seasonIndex = Math.floor(((currentWeek - 1) % WEEKS_PER_YEAR) / WEEKS_PER_SEASON);
    const season = SEASONS[seasonIndex];
    return { year, season };
}

/* GAME STATE */
let currentWeek = 1;
let currentTime = 0;
let biodiversityScore = 0;

const grid = [];
const player = { x: 0, y: 0 };
let highlightedTile = { x: null, y: null };



const inventory = {
    seeds: {
        tomato: 5,
        kale: 5
    },
    produce: {
        tomato: 0,
        kale: 0
    },
    fertilizer: 2,
    mulch: 5
};

/* GAME INIT */

function initGame() {

    if (!gameData) {
        console.error("Game data not loaded yet!");
        return;
    }

    const { plants, timeCosts, gameConfig } = gameData;

    console.log("Initialized game with plant data:", plants);
    console.log("Action time costs:", timeCosts);
    console.log("Core game config:", gameConfig);

    TILE_SIZE               = gameConfig.TILE_SIZE;
    GRID_WIDTH              = gameConfig.GRID_WIDTH;
    GRID_HEIGHT             = gameConfig.GRID_HEIGHT;
    DAY_START               = gameConfig.DAY_START;
    DAY_END                 = gameConfig.DAY_END;
    TIME_COST               = timeCosts;
    GROWTH_TIME             = {};
    PRODUCE_YIELD           = {};
    BASE_MOISTURE_START     = gameConfig.BASE_MOISTURE_START;
    BASE_MOISTURE_DECAY     = gameConfig.BASE_MOISTURE_DECAY;

    for (let p in plants) {
        GROWTH_TIME[p] = plants[p].GROWTH_TIME;
        PRODUCE_YIELD[p] = plants[p].PRODUCE_YIELD;
    }

    currentTime = DAY_START;
    const { year, season } = getSeasonAndYear(currentWeek);
    updateYearAndSeasonDisplay(year, season);

    initGrid();
    render();

    showTutorial();
    document.getElementById("skipToNextWeekBtn").addEventListener("click", skipToNextWeek);
    document.getElementById("closeTutorialBtn").addEventListener("click", hideTutorial);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", function (e) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }
    });


    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
}

// Automatically fetch JSON once the page is loaded
window.onload = function() {
    fetch('https://kvnchpl.github.io/trellis/trellis.json')
        .then(response => {
        if (!response.ok) {
            throw new Error("Failed to load trellis.json: " + response.status);
        }
        return response.json();
    })
        .then(data => {
        gameData = data;   // Store the JSON data
        initGame();        // Initialize the game after data is set
    })
        .catch(error => {
        console.error("Error fetching trellis.json:", error);
    });
};

/* INIT GRID */

function initGrid() {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            grid[row][col] = {
                type: TILE_TYPE.EMPTY, // Default type
                isTilled: false,
                plant: null,
                weedLevel: 0,
                moisture: BASE_MOISTURE_START,
                moistureDecayRate: BASE_MOISTURE_DECAY,
                soilNutrients: { N: 50, P: 50, K: 50 }
            };
        }
    }

    // Set highlighted tile to player's starting position
    highlightedTile = { x: player.x, y: player.y };
    displayTileStats(player.x, player.y);
}

/* RENDER */

function drawGrid(context) {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = grid[row][col];

            // Default tile color
            let tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-default").trim();

            // Determine color based on type
            if (tile.type === TILE_TYPE.PATH) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-path").trim();
            } else if (tile.type === TILE_TYPE.PLOT) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plot").trim();
            }

            // Modify color based on soil moisture
            if (tile.moisture > 70) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-high").trim();
            } else if (tile.moisture < 30) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-moisture-low").trim();
            }

            // Tilled tile color
            if (tile.isTilled) {
                tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-tilled").trim();
            }

            // Plant growth stage colors
            if (tile.plant) {
                if (tile.plant.isMature) {
                    tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-mature").trim();
                } else {
                    tileColor = getComputedStyle(document.documentElement).getPropertyValue("--tile-plant-young").trim();
                }
            }

            context.fillStyle = tileColor;
            context.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Highlight tile with a red border if it's the highlighted tile
            if (row === highlightedTile.y && col === highlightedTile.x) {
                context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tile-highlight").trim();
                context.lineWidth = 3;
                context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas-border").trim();
                context.lineWidth = 1;
                context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }

            // Add a bright border for the player position
            if (row === player.y && col === player.x) {
                context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tile-player").trim();
                context.lineWidth = 3;
                context.strokeRect(col * TILE_SIZE + 1, row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            }
        }
    }
}

function render() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the grid
    drawGrid(ctx);
}

/* TIME & WEEK LOGIC */

function advanceTime(minutes) {
    currentTime += minutes;
    if (currentTime >= DAY_END) {
        skipToNextWeek();
    } else {
        updateTimeDisplay();
        render();
    }
}

function skipToNextWeek() {
    // Increment the week and reset time
    currentWeek++;
    currentTime = DAY_START;

    // Recalculate the year and season
    const { year, season } = getSeasonAndYear(currentWeek);

    // Weekly updates for all tiles
    updateAllTiles();
    recalculateBiodiversity();

    // Update UI elements
    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
    updateYearAndSeasonDisplay(year, season);

    // Update tile stats
    updateTileStats();

    // Render the grid
    render();
}

function updateAllTiles() {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = grid[row][col];
            updateTileMoisture(tile);
            updateTilePlant(tile, row, col);
        }
    }
}

function updateTileMoisture(tile) {
    tile.moisture = Math.max(tile.moisture - tile.moistureDecayRate, 0);
}

function updateTilePlant(tile, row, col) {
    if (!tile.plant) return;

    const plantType = tile.plant.type;
    const plantData = gameData.plants[plantType];

    // Extract soil properties
    const { N, P, K } = tile.soilNutrients;
    const sufficientNutrients = N >= 30 && P >= 20 && K >= 20;
    const sufficientMoisture = tile.moisture >= 40;

    // Grow plant if conditions are sufficient
    if (sufficientNutrients && sufficientMoisture) {
        tile.plant.age += 1;
    } else {
        console.log(`Plant at (${row}, ${col}) is growing slowly due to poor conditions.`);
    }

    // Deplete nutrients if the plant is growing
    if (sufficientNutrients) {
        tile.soilNutrients.N = Math.max(N - 10, 0);
        tile.soilNutrients.P = Math.max(P - 5, 0);
        tile.soilNutrients.K = Math.max(K - 5, 0);
    }

    // Check if the plant is mature
    if (tile.plant.age >= plantData.growthTime) {
        tile.plant.isMature = true;
    }
}

function recalculateBiodiversity() {
    biodiversityScore = calculateBiodiversity();
}

function calculateBiodiversity() {
    const typesFound = new Set();
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = grid[row][col];
            if (tile.plant) {
                typesFound.add(tile.plant.type);
            }
        }
    }
    return typesFound.size;
}

function updateTimeDisplay() {
    const timeDisplay = document.getElementById("timeDisplay");

    // Ensure currentTime is valid
    if (isNaN(currentTime) || currentTime < 0) {
        console.error("Invalid currentTime:", currentTime);
        timeDisplay.textContent = "Error";
        return;
    }

    // Convert currentTime (minutes since 7:00 AM) to HH:MM format
    let totalMinutes = currentTime;
    let hours = 7 + Math.floor(totalMinutes / 60);
    let minutes = totalMinutes % 60;
    let ampm = hours >= 12 ? "PM" : "AM";

    // Convert to 12-hour format
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    // Format minutes as two digits (e.g., "07")
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

    // Update the time display
    timeDisplay.textContent = `${hours}:${formattedMinutes} ${ampm}`;
}

function updateWeekDisplay() {
    document.getElementById("weekDisplay").textContent = currentWeek;
}

function updateYearAndSeasonDisplay(year, season) {
    document.getElementById("yearDisplay").textContent = year;
    document.getElementById("seasonDisplay").textContent = season;
}

function updateBiodiversityDisplay() {
    document.getElementById("biodiversityScore").textContent = biodiversityScore;
}

function calculateBiodiversity() {
    // Simple approach: count unique plant types in the grid
    const typesFound = new Set();
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (grid[row][col].plant) {
                typesFound.add(grid[row][col].plant.type);
            }
        }
    }
    return typesFound.size;
}

/* PLAYER MOVEMENT & CONTROLS */

function handleKeyDown(e) {
    let newX = player.x;
    let newY = player.y;

    switch (e.key) {
            // Player movement (Arrow keys)
        case "ArrowUp":
            newY = player.y - 1;
            break;
        case "ArrowDown":
            newY = player.y + 1;
            break;
        case "ArrowLeft":
            newX = player.x - 1;
            break;
        case "ArrowRight":
            newX = player.x + 1;
            break;

            // Highlight adjacent tiles (WASD keys)
        case "w":
        case "W":
            highlightTile(player.x, player.y - 1); // Highlight above
            return;
        case "s":
        case "S":
            highlightTile(player.x, player.y + 1); // Highlight below
            return;
        case "a":
        case "A":
            highlightTile(player.x - 1, player.y); // Highlight left
            return;
        case "d":
        case "D":
            highlightTile(player.x + 1, player.y); // Highlight right
            return;
        case "q":
        case "Q":
            highlightTile(player.x, player.y); // Highlight player tile
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
    if (newX !== player.x || newY !== player.y) {
        // Prevent movement if the target tile is out of bounds or a plot
        if (
            newX >= 0 &&
            newX < GRID_WIDTH &&
            newY >= 0 &&
            newY < GRID_HEIGHT &&
            grid[newY][newX].type !== TILE_TYPE.PLOT
        ) {
            player.x = newX;
            player.y = newY;

            // Reset highlighted tile to the player's current position
            highlightTile(player.x, player.y);

            render();
        } else {
            console.log("Cannot move onto this tile!");
        }
    }
}

/* CURSOR LOGIC */

document.getElementById("gameCanvas").addEventListener("click", (e) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

    highlightTile(x, y); // Directly call highlightTile with the clicked coordinates
});
function highlightTile(x, y) {
    if (x === null || y === null) {
        highlightedTile.x = null;
        highlightedTile.y = null;
        clearTileStats();
    } else if (
        x >= 0 &&
        x < GRID_WIDTH &&
        y >= 0 &&
        y < GRID_HEIGHT &&
        (Math.abs(player.x - x) + Math.abs(player.y - y) <= 1 || (player.x === x && player.y === y))
    ) {
        // Allow highlighting if the tile is adjacent or the player's tile
        highlightedTile.x = x;
        highlightedTile.y = y;
        displayTileStats(x, y);
    } else {
        console.log("Tile is not adjacent to the player.");
    }

    render(); // Update the visual grid to reflect the highlight
}

function updateTileStats() {
    // Determine which tile to update stats for
    if (highlightedTile.x !== null && highlightedTile.y !== null) {
        displayTileStats(highlightedTile.x, highlightedTile.y);
    } else {
        displayTileStats(player.x, player.y);
    }
}

function displayTileStats(x, y) {
    const tile = grid[y][x];
    const statsContainer = document.getElementById("tileStats");

    statsContainer.innerHTML = `
<strong>Tile (${x}, ${y})</strong><br>
Type: ${tile.type}<br>
Tilled: ${tile.isTilled ? "Yes" : "No"}<br>
Moisture: ${tile.moisture}<br>
Nutrients: N=${tile.soilNutrients.N}, P=${tile.soilNutrients.P}, K=${tile.soilNutrients.K}<br>
Plant: ${tile.plant ? tile.plant.type : "None"}
`;
}

function clearTileStats() {
    const statsContainer = document.getElementById("tileStats");
    statsContainer.innerHTML = `
<strong>Tile Stats</strong><br>
No tile highlighted.
`;
}

/* ACTIONS */

// TILL
function tillSoil() {
    const tile = getTargetTile();

    if (tile.type === TILE_TYPE.EMPTY) {
        tile.type = TILE_TYPE.PLOT;
        tile.isTilled = true;

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

    if (inventory.fertilizer > 0) {
        tile.soilNutrients.N = Math.min(tile.soilNutrients.N + 20, 100);
        tile.soilNutrients.P = Math.min(tile.soilNutrients.P + 10, 100);
        tile.soilNutrients.K = Math.min(tile.soilNutrients.K + 10, 100);
        inventory.fertilizer--;

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
    if (!tile.isTilled) {
        console.log("Soil is not tilled. Cannot plant yet.");
        return;
    }
    if (tile.plant !== null) {
        console.log("There's already a plant here!");
        return;
    }
    if (inventory.seeds[seedType] && inventory.seeds[seedType] > 0) {
        // Use 1 seed
        inventory.seeds[seedType]--;
        // Create a new plant object
        tile.plant = {
            type: seedType,
            age: 0,
            isMature: false
        };
        console.log(`Planted ${seedType} at (${player.x}, ${player.y})`);
        advanceTime(TIME_COST.PLANT);
        updateTileStats();
    } else {
        console.log(`No ${seedType} seeds left.`);
    }
}

// WATER
window.addEventListener("keydown", (e) => {
    if (e.key === "o" || e.key === "O") {
        waterTile();
    }
});
function waterTile() {
    const tile = getTargetTile();

    tile.moisture = Math.min(tile.moisture + 20, 100);

    console.log("Watered tile at:", tile);
    advanceTime(TIME_COST.WATER);
    updateTileStats();
}

// MULCH
function mulchTile() {
    const tile = getTargetTile();

    if (inventory.mulch > 0) {
        tile.moistureDecayRate = Math.max(tile.moistureDecayRate - 1, 0);
        inventory.mulch--;

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

    if (tile.weedLevel > 0) {
        tile.weedLevel = 0;

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

    if (tile.plant && tile.plant.isMature) {
        const type = tile.plant.type;
        inventory.produce[type] = (inventory.produce[type] || 0) + PRODUCE_YIELD[type];

        console.log(`Harvested ${type} at:`, tile);

        tile.plant = null; // Remove the plant after harvesting
        tile.isTilled = false; // Optionally revert to untilled
        advanceTime(TIME_COST.HARVEST);
        updateTileStats();
    } else {
        console.log("No mature plant to harvest here.");
    }
}

// CLEAR
function clearPlot() {
    const tile = getTargetTile();

    if (tile.type === TILE_TYPE.PLOT) {
        tile.type = TILE_TYPE.EMPTY;
        tile.isTilled = false;
        tile.plant = null;

        console.log("Plot cleared at:", tile);
        advanceTime(TIME_COST.CLEAR);
        updateTileStats();
    } else {
        console.log("This tile is not a plot.");
    }
}

// Utility function to get the tile the player is standing on
function getPlayerTile() {
    return grid[player.y][player.x];
}

function getTargetTile() {
    if (highlightedTile.x !== null && highlightedTile.y !== null) {
        return grid[highlightedTile.y][highlightedTile.x]; // Highlighted tile
    }
    return grid[player.y][player.x]; // Player's tile
}

/* TUTORIAL OVERLAY */

function showTutorial() {
    document.getElementById("tutorialOverlay").style.display = "flex";
}
function hideTutorial() {
    document.getElementById("tutorialOverlay").style.display = "none";
}