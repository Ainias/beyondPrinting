import {ProgressListenerInterface, ProgressType} from "./ProgressListenerInterface";

export class ProgressListener implements ProgressListenerInterface {

    private errors: string[] = [];

    protected printHint: HTMLSpanElement;
    protected printProgress: HTMLDivElement;
    protected printErrors: HTMLDivElement;
    protected additionalElementsContainer: HTMLDivElement;
    protected htmlElement?: HTMLElement;

    constructor() {
        const {printHint, printProgress, printErrors, additionalElements} = ProgressListener.createPrintHintElements();
        this.printHint = printHint;
        this.printProgress = printProgress;
        this.printErrors = printErrors;
        this.additionalElementsContainer = additionalElements;

        document.body.className = "";
        document.body.innerText = "";
        document.body.appendChild(this.printHint);
    }

    private static createPrintHintElements() {
        const printHint = document.createElement("span");
        printHint.style.display = "flex";
        printHint.style.flexDirection = "column";
        printHint.style.height = "100vh";
        printHint.style.width = "100vw";
        printHint.style.justifyContent = "center";
        printHint.style.alignItems = "center";
        printHint.classList.add("print-hidden");

        const printProgress = document.createElement("div");
        printProgress.style.display = "flex";
        printProgress.style.flexDirection = "column";
        printProgress.style.justifyContent = "center";
        printProgress.style.fontSize = "3rem";
        printProgress.style.alignItems = "center";
        printProgress.style.textAlign="center";
        printHint.appendChild(printProgress);

        const additionalElements = document.createElement("div");
        additionalElements.style.display = "flex";
        additionalElements.style.flexDirection = "column";
        additionalElements.style.justifyContent = "center";
        additionalElements.style.alignItems = "center";
        additionalElements.style.overflow = "auto";
        printHint.appendChild(additionalElements);

        const printErrors = document.createElement("div");
        printErrors.style.display = "flex";
        printErrors.style.flexDirection = "column";
        printErrors.style.justifyContent = "center";
        printErrors.style.alignItems = "center";
        printErrors.style.fontSize = "2rem";
        printErrors.style.color = "#a60000";
        printHint.appendChild(printErrors);

        const advertisementContainer = document.createElement("a");
        advertisementContainer.style.display = "flex";
        advertisementContainer.style.flexDirection = "column";
        advertisementContainer.style.justifyContent = "center";
        advertisementContainer.style.alignItems = "center";
        advertisementContainer.style.fontSize = "1.5rem";
        advertisementContainer.style.marginTop = "4rem";
        advertisementContainer.innerText = "Are you a DM? Check out my DM-Screen extension for D&D Beyond!";
        advertisementContainer.href = "https://dmscreen.silas.link/store";
        advertisementContainer.target = "_blank";
        advertisementContainer.style.textDecoration = "underline";
        printHint.appendChild(advertisementContainer);

        return {printHint, printProgress, printErrors, additionalElements};
    }

    private showErrors() {
        this.printErrors.innerText = this.errors.join("\n");
    }

    public updateProgress(type: ProgressType, done: number, from: number) {
        switch (type) {
            case ProgressType.IMAGE:
                this.printProgress.innerText = `Waiting for images... (${done}/${from})`;
                break;
            case ProgressType.SUBPAGE:
                this.printProgress.innerText = `Waiting for pages... (${done}/${from})`;
                break;
            case ProgressType.CHECK_ACCESS:
                this.printProgress.innerText = `Checking accesses for books... (${done}/${from})`;
                break;
        }
    }

    public addErrorMessage(text: string) {
        this.errors.push(text);
        this.showErrors();
    }

    public clear() {
        this.errors = [];
        this.additionalElementsContainer.innerText = "";
        this.setHtmlElement(undefined);
        this.showErrors();
    }

    public onDone(doneMessage: string) {
        this.printProgress.innerText = doneMessage;
    }

    public addElement(element: HTMLElement) {
        this.additionalElementsContainer.appendChild(element);
    }

    public setHtmlElement(element?: HTMLElement) {
        if (this.htmlElement) {
            this.htmlElement.remove();
        }

        this.htmlElement = element;
        if (this.htmlElement) {
            document.body.appendChild(this.htmlElement);
        }
    }
}
