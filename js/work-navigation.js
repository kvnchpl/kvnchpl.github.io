import {readWorkReturn, saveCollectionPosition} from './collection-state.js';

const returnLink = document.querySelector('.work-return');
const position = readWorkReturn(location.href);
if (returnLink && position) {
    returnLink.href = position.url;
    const remember = () => saveCollectionPosition(position.url, position.scrollTop);
    returnLink.addEventListener('click', remember);
    returnLink.addEventListener('auxclick', remember);
    returnLink.addEventListener('contextmenu', remember);
}
