/* GLOBALS */

let gameData = null;

let TILE_SIZE, GRID_WIDTH, GRID_HEIGHT;
let DAY_START, DAY_END;
let TIME_COST = {};
let GROWTH_TIME = {};
let PRODUCE_YIELD = {};

/* GAME STATE */
let currentWeek = 1;
let currentTime = 0;
let biodiversityScore = 0;

const grid = [];
const player = { x: 0, y: 0 };
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

    TILE_SIZE    = gameConfig.TILE_SIZE;
    GRID_WIDTH   = gameConfig.GRID_WIDTH;
    GRID_HEIGHT  = gameConfig.GRID_HEIGHT;
    DAY_START    = gameConfig.DAY_START;
    DAY_END      = gameConfig.DAY_END;
    TIME_COST    = timeCosts;
    GROWTH_TIME  = {};
    PRODUCE_YIELD = {};

    for (let p in plants) {
        GROWTH_TIME[p] = plants[p].GROWTH_TIME;
        PRODUCE_YIELD[p] = plants[p].PRODUCE_YIELD;
    }

    currentTime = DAY_START;

    initGrid();
    render();

    showTutorial();
    document.getElementById("skipToNextWeekBtn").addEventListener("click", skipToNextWeek);
    document.getElementById("closeTutorialBtn").addEventListener("click", hideTutorial);
    window.addEventListener("keydown", handleKeyDown);

    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
}

// Automatically fetch JSON once the page is loaded
window.onload = function() {
    fetch('https://kvnchpl.github.io/json/trellis.json')
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
                type: "PLOT",
                isTilled: false,
                plant: null,
                weedLevel: 0,
                moisture: 50, // out of 100?
                soilNutrients: { N: 50, P: 50, K: 50 }
            };
        }
    }
}

/* RENDER */

function drawGrid(context) {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = grid[row][col];

            // Base color for PLOT or PATH
            let tileColor = (tile.type === "PATH") ? "#d8d8d8" : "#77dd77";

            // If tile is tilled, make it a different shade
            if (tile.type === "PLOT" && tile.isTilled) {
                tileColor = "#c2b280"; // A brownish color
            }

            // If there's a plant, maybe we change the color slightly
            if (tile.plant) {
                // If mature, make it a brighter color to indicate readiness
                if (tile.plant.isMature) {
                    tileColor = "#98FB98"; // PaleGreen
                } else {
                    tileColor = "#7EC850"; // Medium spring green
                }
            }

            // Highlight if player's position is here
            if (row === player.y && col === player.x) {
                tileColor = "#ffdd57";
            }

            context.fillStyle = tileColor;
            context.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Optional: draw grid lines
            context.strokeStyle = "#555";
            context.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
    }
}

function skipToNextWeek() {
    // Weekly update: plant growth, recalc biodiversity, etc.
    currentWeek++;
    currentTime = DAY_START;

    // Age all plants by 1 week
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tile = grid[row][col];
            if (tile.plant) {
                tile.plant.age += 1;
                // Check if plant is mature
                if (tile.plant.age >= GROWTH_TIME[tile.plant.type]) {
                    tile.plant.isMature = true;
                }
            }
        }
    }

    // Recalculate biodiversity
    biodiversityScore = calculateBiodiversity();

    updateTimeDisplay();
    updateWeekDisplay();
    updateBiodiversityDisplay();
    render();
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
    let oldX = player.x;
    let oldY = player.y;

    switch (e.key) {
        case "ArrowUp":
        case "w":
            if (player.y > 0) player.y--;
            break;
        case "ArrowDown":
        case "s":
            if (player.y < GRID_HEIGHT - 1) player.y++;
            break;
        case "ArrowLeft":
        case "a":
            if (player.x > 0) player.x--;
            break;
        case "ArrowRight":
        case "d":
            if (player.x < GRID_WIDTH - 1) player.x++;
            break;

            // ACTION SHORTCUTS
        case "t":
        case "T":
            tillSoil();
            break;
        case "p":
        case "P":
            // Default to planting tomato for demo, or show a prompt
            plantSeed("tomato");
            break;
        case "w":
        case "W":
            // w is also "move up" by default; let's define SHIFT+W or something else?
            // For simplicity, let's define a second letter for water: "o" (like H2O).
            // Or "altKey" check. We'll skip that for now to avoid collisions.
            break;
        case "e":
        case "E":
            weedTile();
            break;
        case "h":
        case "H":
            harvestPlant();
            break;
        default:
            break;
    }

    // Re-render if the position changed
    if (oldX !== player.x || oldY !== player.y) {
        render();
    }
}

/* ACTIONS */

// 1) TILL
function tillSoil() {
    const tile = getPlayerTile();
    // Only till if it's a "PLOT" and not already tilled
    if (tile.type === "PLOT" && !tile.isTilled) {
        tile.isTilled = true;
        console.log("Soil tilled at:", player.x, player.y);
        advanceTime(TIME_COST.TILL);
        render();
    } else {
        console.log("Cannot till here.");
    }
}

// 2) PLANT
// For demonstration, this plants the given seed type if we have inventory
function plantSeed(seedType) {
    const tile = getPlayerTile();
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
        render();
    } else {
        console.log(`No ${seedType} seeds left.`);
    }
}

// 3) WATER
// We'll bind this to a custom key to avoid conflicts. Let's use "o" for example.
window.addEventListener("keydown", (e) => {
    if (e.key === "o" || e.key === "O") {
        waterTile();
    }
});
function waterTile() {
    const tile = getPlayerTile();
    // Increase moisture but cap at 100
    tile.moisture = Math.min(tile.moisture + 20, 100);
    console.log("Watered tile. Moisture now:", tile.moisture);
    advanceTime(TIME_COST.WATER);
    render();
}

// 4) WEED
function weedTile() {
    const tile = getPlayerTile();
    if (tile.weedLevel > 0) {
        tile.weedLevel = 0;
        console.log("Weeds removed at:", player.x, player.y);
        advanceTime(TIME_COST.WEED);
        render();
    } else {
        console.log("No weeds here.");
    }
}

// 5) HARVEST
function harvestPlant() {
    const tile = getPlayerTile();
    if (tile.plant && tile.plant.isMature) {
        // Add produce to inventory
        const type = tile.plant.type;
        inventory.produce[type] = (inventory.produce[type] || 0) + PRODUCE_YIELD[type];

        console.log(
            `Harvested ${type} at (${player.x}, ${player.y}). Gained ${PRODUCE_YIELD[type]} produce.`
        );

        // Remove the plant from the tile
        tile.plant = null;
        tile.isTilled = false; // optional: revert to untilled or keep tilled?

        advanceTime(TIME_COST.HARVEST);
        render();
    } else {
        console.log("No mature plant to harvest here.");
    }
}

// Utility function to get the tile the player is standing on
function getPlayerTile() {
    return grid[player.y][player.x];
}

/* TUTORIAL OVERLAY */

function showTutorial() {
    document.getElementById("tutorialOverlay").style.display = "flex";
}
function hideTutorial() {
    document.getElementById("tutorialOverlay").style.display = "none";
}