// If your extension doesn't need a background script, just leave this file empty

import {handleContentMessage} from './handleContentMessage';
import {log, setLogPrefix} from '../helper/log';

setLogPrefix('[BACKGROUND]');

chrome.runtime.onMessage.addListener(handleContentMessage);

export function keepServiceRunning() {
    log("Keep service running...");
    setTimeout(keepServiceRunning, 2000);
}

keepServiceRunning();
