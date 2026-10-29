import {completeDay, getTile, isWithinMap, revealGarden} from './state.js';
import {resetPlantState} from './actions.js';

export const debugHelp = 'inspect · water 0–100 · fertility 0–100 · plant <species> [stage] · tile <type> · weeds on/off · mulch on/off · time <season> <week> <HH:MM> · goto <x> <y> · advance 1–52 · reveal · undo · export · help';

// Explicit debug vocabulary, with an atomic commit after all arguments pass.
// No browser APIs, evaluated code, arbitrary property writes, or save bypass.
export function applyDebugCommand(state, rules, line) {
    const [name, ...args] = line.trim().split(/\s+/);
    const command = name?.toLowerCase();
    const require = (valid, message) => { if (!valid) throw new Error(message); };
    const count = n => require(args.length === n, 'Unexpected arguments. Type help for commands.');
    const number = (value,min,max) => {
        require(/^\d+$/.test(value ?? ''),`Use a whole number from ${min} to ${max}.`);
        const n=Number(value); require(Number.isSafeInteger(n) && n>=min && n<=max,`Use a whole number from ${min} to ${max}.`); return n;
    };
    if (command === 'help') {count(0); return {changed:false,message:debugHelp};}
    if (command === 'inspect') {
        count(0);
        return {changed:false,message:JSON.stringify({seed:state.seed,ecologyState:state.ecologyState,player:state.player,selector:state.selector,time:state.time,tile:state.map[`${state.selector.x},${state.selector.y}`]},null,2)};
    }
    const next=structuredClone(state), key=`${next.selector.x},${next.selector.y}`, tile=next.map[key];
    if (command === 'water' || command === 'fertility') {
        count(1); tile[command==='water'?'moisture':'fertility']=number(args[0],0,100);
    } else if (command === 'plant') {
        require(args.length===1 || args.length===2,'Use plant <species> [stage].');
        const species=rules.species[args[0]];
        require(Object.hasOwn(rules.species,args[0]),'Unknown species. Available: '+Object.keys(rules.species).join(', '));
        const stage=args[1] ?? species.growthStages[0];
        require(species.growthStages.includes(stage),'Stages: '+species.growthStages.join(', '));
        resetPlantState(tile); tile.tile='tilled'; tile.tileVariant=null;
        Object.assign(tile,{plantType:args[0],growthStage:stage,readyToHarvest:Boolean(species.harvestable && stage===species.growthStages.at(-1))});
    } else if (command === 'tile') {
        count(1); require(rules.tileTypes.includes(args[0]),'Tiles: '+rules.tileTypes.join(', '));
        resetPlantState(tile); Object.assign(tile,{tile:args[0],tileVariant:null,weeds:false,mulch:false});
    } else if (command === 'weeds' || command === 'mulch') {
        count(1); require(['on','off'].includes(args[0]),'Use on or off.'); tile[command]=args[0]==='on';
    } else if (command === 'time') {
        count(3); const seasonIndex=rules.seasons.findIndex(season=>season.toLowerCase()===args[0].toLowerCase());
        require(seasonIndex>=0,'Seasons: '+rules.seasons.join(', '));
        const week=number(args[1],1,rules.weeksPerSeason), clock=/^(\d{1,2}):(\d{2})$/.exec(args[2]);
        require(clock,'Use HH:MM.'); const hour=number(clock[1],rules.dayStartHour,rules.dayEndHour), minute=number(clock[2],0,59);
        require(hour<rules.dayEndHour || minute===0,'Closing time must have zero minutes.');
        next.time={seasonIndex,week,hour,minute};
    } else if (command === 'goto') {
        count(2); const x=number(args[0],0,rules.mapWidth-1),y=number(args[1],0,rules.mapHeight-1);
        require(isWithinMap(x,y,rules),'Outside garden bounds.');
        next.player={x,y}; next.selector={x,y}; revealGarden(next,rules);
    } else if (command === 'advance') {
        count(1); const weeks=number(args[0],1,52); for(let n=0;n<weeks;n++) completeDay(next,rules);
    } else if (command === 'reveal') {
        count(0); for(let y=0;y<rules.mapHeight;y++) for(let x=0;x<rules.mapWidth;x++) {
            getTile(next,x,y,rules); next.revealed[`${x},${y}`]=true;
        }
    } else throw new Error('Unknown command. Type help.');
    if (JSON.stringify(next)===JSON.stringify(state)) return {changed:false,message:'Already set; garden unchanged.'};
    Object.assign(state,next);
    return {changed:true,message:`Applied: ${line.trim()}`};
}
