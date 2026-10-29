import {createState, getTile, isWithinMap, revealGarden, advanceTime, completeDay} from './state.js';
import {evaluateCondition, attemptActionOnTile, resetPlantState} from './actions.js';

export function createSimulation(rules, {seed = 0, savedState = null} = {}) {
    const state = savedState ? structuredClone(savedState) : createState(rules, seed);
    revealGarden(state, rules);
    const selectedTile = () => getTile(state, state.selector.x, state.selector.y, rules);
    const closingTime = () => state.time.hour >= rules.dayEndHour;
    const changed = () => ({status: 'changed', dayComplete: closingTime()});
    function dispatch(command) {
        if (command.type === 'completeDay') { completeDay(state, rules); return changed(); }
        if (closingTime()) return {status: 'dayComplete'};
        if (command.type === 'move' || command.type === 'select') {
            const {dx, dy} = command;
            if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) > 1 || (command.type === 'move' && dx === 0 && dy === 0)) return {status: 'ignored'};
            const x = state.player.x + dx, y = state.player.y + dy;
            if (!isWithinMap(x, y, rules)) return {status: 'ignored'};
            const tile = getTile(state, x, y, rules);
            if (command.type === 'select') {
                if (state.selector.x === x && state.selector.y === y) return {status: 'ignored'};
                state.selector = {x,y};
                return changed();
            }
            if (tile.tile === 'rock' || tile.plantType) return {status: 'ignored'};
            state.player = {x,y}; state.selector = {x,y}; state.dailyStats.steps++;
            advanceTime(state, rules.movementTimeIncrement, rules);
            revealGarden(state, rules);
            return changed();
        }
        const action = command.type === 'plant' ? 'plant' : command.action;
        if (command.type !== 'plant' && command.type !== 'action') return {status: 'ignored'};
        const definition = rules.actions[action];
        if (!definition) return {status: 'ignored'};
        const tile = selectedTile();
        if (!evaluateCondition(tile, definition.condition)) return {status: 'blocked', action};
        if (command.type === 'plant') {
            if (!Object.hasOwn(rules.species, command.speciesId)) return {status: 'ignored'};
            resetPlantState(tile);
            tile.plantType = command.speciesId;
            tile.growthStage = rules.species[command.speciesId].growthStages[0];
            state.dailyStats.planted++;
        } else {
            if (action === 'plant') return {status: 'choosePlant'};
            attemptActionOnTile(tile, action, rules, null, state.dailyStats);
        }
        advanceTime(state, definition.timeIncrement, rules);
        return {...changed(), action};
    }
    return {state, dispatch};
}
