let secondPrefix = '';

export function log(...messages: any) {
    console.log(`[BEYOND-PRINTING]${secondPrefix}`, ...messages);
}
export function setLogPrefix(prefix: string) {
    secondPrefix = prefix;
}
