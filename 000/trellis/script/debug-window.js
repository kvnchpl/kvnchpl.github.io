import {debugHelp} from './debug.js';

export function createDebugWindow({execute, exportGarden, blocked, onClose}) {
    const dialog=document.getElementById('debug-window'), input=document.getElementById('debug-command'), output=document.getElementById('debug-output');
    let returnFocus=null;
    const lines=[];
    function log(text) {
        lines.push(text); if(lines.length>20) lines.shift();
        output.textContent=lines.join('\n\n'); output.scrollTop=output.scrollHeight;
    }
    function open() {
        if(blocked() || dialog.open) return;
        returnFocus=document.activeElement;
        if(!lines.length) log(debugHelp);
        dialog.showModal(); input.focus();
    }
    function run(line) {log(`> ${line}\n${execute(line)}`);input.value='';input.focus();}
    document.getElementById('debug-toggle').onclick=open;
    document.getElementById('debug-close').onclick=()=>dialog.close();
    document.getElementById('debug-undo').onclick=()=>run('undo');
    document.getElementById('debug-export').onclick=exportGarden;
    document.getElementById('debug-form').onsubmit=event=>{
        event.preventDefault(); const line=input.value.trim(); if(!line) return;
        if(line.toLowerCase()==='export') {exportGarden();log('Exported the in-memory garden.');input.value='';}
        else run(line);
    };
    dialog.addEventListener('keydown',event=>{
        if(event.key!=='Tab') return;
        const targets=[...dialog.querySelectorAll('button,input,[tabindex="0"]')].filter(node=>!node.disabled && node.getClientRects().length);
        const index=targets.indexOf(document.activeElement);
        event.preventDefault();
        targets[(index+(event.shiftKey?-1:1)+targets.length)%targets.length]?.focus();
    });
    dialog.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true});onClose();});
    window.addEventListener('keydown',event=>{
        if(event.key==='`' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest?.('input,textarea,select,[contenteditable="true"]')) {
            event.preventDefault();if(dialog.open) dialog.close();else open();
        }
    });
    return {isOpen:()=>dialog.open};
}
