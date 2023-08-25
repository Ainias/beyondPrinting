import {ProgressListener} from "./ProgressListener";

export class MultiPrinterProgressListener extends ProgressListener {

    private printerInfoElement = document.createElement("div");
    private permanentErrorElement = document.createElement("div");

    constructor() {
        super();
        this.printHint.prepend(this.printerInfoElement);
        this.printHint.prepend(this.permanentErrorElement);

        this.permanentErrorElement.style.color = "#a60000";
        this.permanentErrorElement.style.textAlign = "center";;
        this.printerInfoElement.style.textAlign = "center";
        this.printerInfoElement.style.fontSize = "2rem";
    }

    public setPrinterInfo(title: string, current: number, total: number) {
        this.printerInfoElement.innerText = `Printing ${title}... (${current}/${total})`;
    }

    public addPermanentError(error: string) {
        this.permanentErrorElement.innerText += error;
    }

}
