import {readWorkReturn, saveCollectionPosition} from './collection-state.js';

const returnLinks = document.querySelectorAll('.work-return');
const position = readWorkReturn(location.href);
for (const returnLink of position ? returnLinks : []) {
    returnLink.href = position.url;
    const remember = () => saveCollectionPosition(position.url, position.scrollTop);
    returnLink.addEventListener('click', remember);
    returnLink.addEventListener('auxclick', remember);
    returnLink.addEventListener('contextmenu', remember);
}
