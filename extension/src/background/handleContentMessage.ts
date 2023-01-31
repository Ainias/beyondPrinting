import { ContentMessage } from '../helper/Action';
import MessageSender = chrome.runtime.MessageSender;
import { log } from '../helper/log';

export function handleContentMessage(
    message: ContentMessage,
    sender: MessageSender,
    _: (response?: any) => void
) {
    log('Got message', message, sender);
    return false;
}
