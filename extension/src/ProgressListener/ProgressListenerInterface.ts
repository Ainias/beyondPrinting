
export enum ProgressType {
    IMAGE,
    SUBPAGE,
    CHECK_ACCESS
}

export interface ProgressListenerInterface {
    updateProgress(type: ProgressType, done: number, from: number): void;
    addErrorMessage(text: string): void;
    clear(): void;
    onDone(text: string): void;
    addElement(element: HTMLElement): void;
    setHtmlElement(element: HTMLElement): void;
}
