// If your extension doesn't need a background script, just leave this file empty

import { handleContentMessage } from './handleContentMessage';
import { log, setLogPrefix } from '../helper/log';

setLogPrefix('[BACKGROUND]');

chrome.runtime.onMessage.addListener(handleContentMessage);

chrome.action.onClicked.addListener((tab) => {
    if (tab.url?.startsWith('https://www.dndbeyond.com/')) {
        log('Action button clicked', tab);
    }
});


export function keepServiceRunning() {
    setTimeout(keepServiceRunning, 20000);
}
keepServiceRunning();
