import {Printer} from "../Printer/Printer";
import {OPTIONS_KEY} from "./showOptionsDialog";
import {log} from "../helper/log";

let options: Printer["config"] = {
    minPageDelay: 100,
    maxPageDelay: 200,
    strippedTables: true,
    includeCover: true,
    includeIntroduction: true,
    includeBacklinks: true,

    includeTitle: true,
    includeForDndInTitle: true,
    includeUsername: true,
    includePrintedWithHint: true,

    failOnError: true,
    downloadHtml: false,
    includePlayerVersionMaps: true,
    useBigMapImages: true,

    headingOnNewPage: true,

    waitForUserConfirmationAfterPrint: false,
    version: 1,
};

try {
    const optionsString = localStorage.getItem(OPTIONS_KEY);
    if (optionsString) {
        const parsedOptions = JSON.parse(optionsString);

        if (!("version" in parsedOptions) || parsedOptions.version < 1) {
            parsedOptions.minPageDelay = options.minPageDelay;
            parsedOptions.maxPageDelay = options.maxPageDelay;
        }

        // To keep default for new values
        options = {...options, ...parsedOptions};
    } else {
        log("No saved options present, useDefaultOptions");
    }
} catch (e) {
    log("Could not load options", e);
}


export const printOptions = options;
