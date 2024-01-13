import {Printer} from "./Printer";
import {ArrayHelper, PromiseWithHandlers} from "@ainias42/js-helper";
import {log} from "../helper/log";
import {MultiPrinterProgressListener} from "../ProgressListener/MultiPrinterProgressListener";
import {ProgressType} from "../ProgressListener/ProgressListenerInterface";
import {createCheckbox} from "../options/createCheckbox";
import {createButton} from "../helper/createButton";

export class MultiPrinter {

    private config: Printer["config"];

    private readonly LINK_TO_VIEW_ALL = "/sources";

    constructor(config: Printer["config"]) {
        this.config = config;
    }

    async printAll() {
        const sourcebooks = await Printer.fetch(this.LINK_TO_VIEW_ALL);

        const links: string[] = [];
        sourcebooks.querySelectorAll<HTMLLinkElement>("a.sources-listing--item").forEach(sourcebook => {
            links.push(sourcebook.href);
        });

        const progressListener = new MultiPrinterProgressListener();

        const printers: Printer[] = [];
        await ArrayHelper.asyncForEach(links, async (link, i) => {
            if (link.endsWith("sources/ua")) {
                return;
            }
            progressListener.updateProgress(ProgressType.CHECK_ACCESS, i + 1, links.length);

            const printer = new Printer(link, this.config, progressListener);
            if (await printer.hasAccessToBook()) {
                printers.push(printer);
            }
            await printer.waitBetweenRequests();
        });

        log("Printers", printers.length, links.length);

        progressListener.onDone("Please select the books you want to download");

        const printerList: Record<number, boolean> = {};
        const printerListContainer = document.createElement("div");
        printerListContainer.style.display = "flex";
        printerListContainer.style.flexDirection = "column";
        printerListContainer.style.paddingBottom = "1rem";
        printerListContainer.style.alignItems = "center";
        printerListContainer.style.justifyContent = "center";

        const printerListElement = document.createElement("div");
        printerListElement.style.display = "flex";
        printerListElement.style.flexDirection = "row";
        printerListElement.style.padding = "1rem";
        printerListContainer.appendChild(printerListElement);

        const printerListColumns = [document.createElement("div"), document.createElement("div"), document.createElement("div")];
        printerListColumns.forEach(column => {
            column.style.paddingRight = "2rem";
            printerListElement.appendChild(column);
        });

        printers.forEach((printer, i) => {
            printerList[i] = true;

            const checkbox = createCheckbox(printer.extractTitle(true), true, (checked) => {
                printerList[i] = checked;
            });

            if (printers.length > 50 && i >= printers.length / 3 * 2) {
                printerListColumns[2].appendChild(checkbox);
            } else if ((printers.length > 50 && i >= printers.length / 3) || (printers.length > 25 && i >= printers.length / 2)) {
                printerListColumns[1].appendChild(checkbox);
            } else {
                printerListColumns[0].appendChild(checkbox);
            }
        });

        const printerSelectionPromise = new PromiseWithHandlers();
        const [savePrintersButton] = createButton("Print");
        printerListContainer.appendChild(savePrintersButton);
        savePrintersButton.addEventListener("click", () => {
            printerSelectionPromise.resolve();
        });

        progressListener.addElement(printerListContainer);

        await printerSelectionPromise;
        const filteredPrinters = printers.filter((_: any, i: number) => printerList[i]);
        progressListener.clear();

        await ArrayHelper.asyncForEach(filteredPrinters, async (printer, i) => {
            try {
                progressListener.setPrinterInfo(printer.extractTitle(true), i + 1, filteredPrinters.length);
                await printer.print();
                progressListener.clear();
            } catch (e: any) {
                progressListener.addPermanentError(`Could not print book ${printer.extractTitle(true)} (${i + 1}) because of error ${e?.message ?? e}`);
            }
        });
        progressListener.onDone("Done downloading all books!");
    }
}
