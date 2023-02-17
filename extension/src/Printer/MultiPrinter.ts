import {Printer} from "./Printer";
import {ArrayHelper} from "js-helper";
import {log} from "../helper/log";

export class MultiPrinter {

    private config: Printer["config"];
    private printers: Printer[] = [];

    private readonly LINK_TO_VIEW_ALL = "/sources"

    private onProgress?: (text: string) => void;

    constructor(config: Printer["config"], onProgress?: MultiPrinter["onProgress"]) {
        this.config = config;
        this.onProgress = onProgress;
    }

    async printAll() {
        const sourcebooks = await Printer.fetch(this.LINK_TO_VIEW_ALL);

        const links: string[] = [];
        sourcebooks.querySelectorAll<HTMLLinkElement>("a.sources-listing--item").forEach(sourcebook => {
            links.push(sourcebook.href);
        });

        this.printers = [];
        await ArrayHelper.asyncForEach(links, async (link, i) => {
            this.onProgress?.(`Testing book ${i} from ${links.length}...`);

            const printer = new Printer(link, this.config, () => {
                console.log("Got progress");
            }, () => {
                console.log("done");
            });
            if (await printer.hasAccessToBook()) {
                this.printers.push(printer);
            }
        });

        log("LOG-d printers", this.printers.length, links.length);
        // TODO notify about current process

        await ArrayHelper.asyncForEach(this.printers, async (printer, i) => {
            this.onProgress?.(`Printing book ${i} from ${ this.printers.length}`);
            await printer.print();
        });
    }
}
