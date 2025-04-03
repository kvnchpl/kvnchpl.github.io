// Retrieve configuration and sprite folder URLs from meta tags
const configUrl = document.querySelector('meta[name="game-data"]')?.content || console.error('Error: Configuration URL not found.');
const spriteFolder = document.querySelector('meta[name="sprites"]')?.content || console.error('Error: Sprite folder URL not found.');

// Game class: Initializes the grid, gardener, and binds controls.
class Game {
  constructor(config) {
    this.config = config;
    this.eventManager = new EventManager(); // Create an event manager.
    this.grid = new Grid(config.grid, config.plots, this.eventManager);
    this.gardener = new Gardener(config.gardener, this.grid, this.eventManager);
    this.init();
  }

  init() {
    // Create the game container.
    this.gameContainer = document.createElement('div');
    this.gameContainer.id = 'trellis-game';
    document.body.appendChild(this.gameContainer);

    // Create grid cells.
    this.grid.createGrid(this.gameContainer);

    // Load state if one exists.
    this.loadState();

    // Render the gardener (using loaded state or starting defaults).
    this.gardener.render();

    // Bind keyboard controls.
    this.bindControls();

    // Trigger an event once the game is initialized.
    this.eventManager.trigger('gameInitialized', { game: this });
  }

  bindControls() {
    document.addEventListener('keydown', (e) => {
      let moved = false;
      if (e.key === 'ArrowUp') {
        moved = this.gardener.move(0, -1);
      } else if (e.key === 'ArrowDown') {
        moved = this.gardener.move(0, 1);
      } else if (e.key === 'ArrowLeft') {
        moved = this.gardener.move(-1, 0);
      } else if (e.key === 'ArrowRight') {
        moved = this.gardener.move(1, 0);
      }
      if (moved) {
        // Trigger an event for gardener movement.
        this.eventManager.trigger('gardenerMoved', { x: this.gardener.x, y: this.gardener.y });
        this.saveState();
      }

      // Map action keys.
      const actionKeys = {
        'T': 'till',
        'F': 'fertilize',
        'P': 'plant',
        'W': 'water',
        'M': 'mulch',
        'R': 'weed',
        'H': 'harvest',
        'C': 'clear'
      };
      const keyUpper = e.key.toUpperCase();
      if (actionKeys[keyUpper]) {
        this.grid.applyAction(this.gardener.x, this.gardener.y, actionKeys[keyUpper]);
        // Trigger an event for action applied.
        this.eventManager.trigger('actionApplied', {
          x: this.gardener.x,
          y: this.gardener.y,
          action: actionKeys[keyUpper]
        });
        // Save state after an action.
        this.saveState();
      }
    });
  }

  // Save the game state to localStorage.
  saveState() {
    const gameState = {
      gridStates: this.grid.getStates(), // grid returns a 2D array of each cell's states
      gardener: { x: this.gardener.x, y: this.gardener.y }
    };
    localStorage.setItem('trellis-save', JSON.stringify(gameState));
    console.log("Game state saved.");
    // Trigger an event for state saved.
    this.eventManager.trigger('stateSaved', gameState);
  }

  // Load the game state from localStorage if it exists.
  loadState() {
    const savedState = localStorage.getItem('trellis-save');
    if (savedState) {
      const gameState = JSON.parse(savedState);
      // Restore gardener position.
      this.gardener.x = gameState.gardener.x;
      this.gardener.y = gameState.gardener.y;
      // Restore grid states.
      this.grid.setStates(gameState.gridStates);
      console.log("Game state loaded.");
      // Trigger an event for state loaded.
      this.eventManager.trigger('stateLoaded', gameState);
    }
  }
}

// Grid class: Creates the grid, manages multiple states per cell, and applies actions.
class Grid {
    constructor(gridConfig, plotDefinitions) {
      this.columns = gridConfig.columns;
      this.rows = gridConfig.rows;
      this.cellSize = gridConfig.cellSize;
      this.plots = plotDefinitions;
      this.cells = [];
      // Define the layering order for rendering.
      this.statePriority = [
        "empty",
        "tilled",
        "fertilized",
        "mulched",
        "planted",
        "harvestable",
        "harvested",
        "weedy"
      ];
    }
  
    createGrid(container) {
      container.style.setProperty('--grid-columns', this.columns);
      container.style.setProperty('--grid-rows', this.rows);
      container.style.setProperty('--cell-size', `${this.cellSize}px`);
  
      for (let y = 0; y < this.rows; y++) {
        this.cells[y] = [];
        for (let x = 0; x < this.columns; x++) {
          let cell = document.createElement('div');
          cell.classList.add('cell');
          cell.dataset.x = x;
          cell.dataset.y = y;
          // Initialize each cell with the default state "empty"
          cell.dataset.states = JSON.stringify(["empty"]);
          container.appendChild(cell);
          // Render initial layers.
          this.updateCellState(x, y);
          this.cells[y][x] = cell;
        }
      }
    }
  
    // Returns a 2D array of each cell's states.
    getStates() {
      return this.cells.map(row => row.map(cell => JSON.parse(cell.dataset.states)));
    }
  
    // Set states for all cells from a 2D array.
    setStates(statesArray) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.columns; x++) {
          let cell = this.getCell(x, y);
          cell.dataset.states = JSON.stringify(statesArray[y][x]);
          this.updateCellState(x, y);
        }
      }
    }
  
    // Renders the layers for a cell based on its states.
    updateCellState(x, y) {
      let cell = this.getCell(x, y);
      if (!cell) return;
      let states = JSON.parse(cell.dataset.states);
      // Remove existing state layers.
      cell.querySelectorAll('.state-layer').forEach(layer => layer.remove());
      // Create a layer for each state in the defined priority order.
      this.statePriority.forEach(state => {
        if (states.includes(state) && this.plots[state] && this.plots[state].sprite) {
          let layer = document.createElement('div');
          layer.classList.add('state-layer');
          layer.style.backgroundImage = `url(https://kvnchpl.github.io/trellis/sprites/${this.plots[state].sprite})`;
          cell.appendChild(layer);
        }
      });
    }
  
    getCell(x, y) {
      if (x < 0 || x >= this.columns || y < 0 || y >= this.rows) return null;
      return this.cells[y][x];
    }
  
    // Existing applyAction method remains the same.
    applyAction(x, y, action) {
      let cell = this.getCell(x, y);
      if (!cell) return;
      let states = JSON.parse(cell.dataset.states);
  
      const addState = (s) => {
        if (!states.includes(s)) states.push(s);
      };
      const removeState = (s) => {
        const index = states.indexOf(s);
        if (index !== -1) states.splice(index, 1);
      };
  
      switch (action) {
        case 'till':
          if (!states.includes("tilled") &&
              (states.includes("empty") || states.includes("harvested") || states.includes("weedy"))) {
            removeState("empty");
            removeState("harvested");
            removeState("weedy");
            addState("tilled");
          } else {
            console.log("Cannot till: Plot is already tilled or not in a tillable condition.");
            return;
          }
          break;
        case 'fertilize':
          if (states.includes("tilled") && !states.includes("fertilized")) {
            addState("fertilized");
          } else {
            console.log("Cannot fertilize: Plot must be tilled and not already fertilized.");
            return;
          }
          break;
        case 'mulch':
          if ((states.includes("tilled") || states.includes("fertilized")) && !states.includes("mulched")) {
            addState("mulched");
          } else {
            console.log("Cannot mulch: Plot must be tilled or fertilized and not already mulched.");
            return;
          }
          break;
        case 'plant':
          if ((states.includes("tilled") || states.includes("fertilized") || states.includes("mulched")) && !states.includes("planted")) {
            addState("planted");
          } else {
            console.log("Cannot plant: Plot must be tilled, fertilized, or mulched, and not already planted.");
            return;
          }
          break;
        case 'water':
          if (states.includes("planted") && !states.includes("harvestable")) {
            addState("harvestable");
          } else {
            console.log("Cannot water: Plot must be planted and not already water-saturated.");
            return;
          }
          break;
        case 'harvest':
          if (states.includes("harvestable")) {
            removeState("planted");
            removeState("harvestable");
            addState("harvested");
          } else {
            console.log("Cannot harvest: Plot is not ready for harvest.");
            return;
          }
          break;
        case 'weed':
          if (states.includes("weedy")) {
            removeState("weedy");
            if (!states.includes("tilled")) addState("tilled");
          } else {
            console.log("Cannot weed: Plot is not weedy.");
            return;
          }
          break;
        case 'clear':
          if (states.includes("planted") || states.includes("harvestable")) {
            console.log("Cannot clear: Plot is actively growing; harvest first.");
            return;
          } else {
            states = ["empty"];
          }
          break;
        default:
          console.log("Unknown action:", action);
          return;
      }

      console.log(`Action '${action}' applied at (${x}, ${y}). New states: ${states.join(', ')}`);
      cell.dataset.states = JSON.stringify(states);
      this.updateCellState(x, y);
      if (window.currentGame) {
        window.currentGame.saveState();
      }
    }
  }

// Gardener class: Handles the gardener's position, movement, and rendering.
class Gardener {
  constructor(gardenerConfig, grid) {
    this.x = gardenerConfig.startX;
    this.y = gardenerConfig.startY;
    this.sprite = gardenerConfig.sprite;
    this.grid = grid;
    this.element = null;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.classList.add('gardener');
      this.element.style.backgroundImage = `url(${spriteFolder}${this.sprite})`;
      document.getElementById('trellis-game').appendChild(this.element);
    }
    let cellSize = this.grid.cellSize;
    this.element.style.width = `${cellSize}px`;
    this.element.style.height = `${cellSize}px`;
    this.element.style.left = `${this.x * cellSize}px`;
    this.element.style.top = `${this.y * cellSize}px`;
  }

  move(dx, dy) {
    let newX = this.x + dx;
    let newY = this.y + dy;
    if (newX < 0 || newX >= this.grid.columns || newY < 0 || newY >= this.grid.rows) {
      return false;
    }
    this.x = newX;
    this.y = newY;
    this.render();
    return true;
  }
}

// Load configuration from the URL specified in the meta tag and initialize the game.
fetch(jsonUrl)
  .then(response => response.json())
  .then(config => {
    window.addEventListener('DOMContentLoaded', () => {
      const game = new Game(config);
      // Make the game instance globally accessible.
      window.currentGame = game;
    });
  })
  .catch(error => {
    console.error('Error loading game configuration:', error);
  });