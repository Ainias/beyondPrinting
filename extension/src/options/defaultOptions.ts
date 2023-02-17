import {Printer} from "../Printer/Printer";
import {OPTIONS_KEY} from "./showOptionsDialog";
import {log} from "../helper/log";

let options: Printer["config"] = {
    minPageDelay: 0,
    maxPageDelay: 0,
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
};

try {
    const optionsString = localStorage.getItem(OPTIONS_KEY);
    if (optionsString) {
        // To keep default for new values
        options = {...options, ...JSON.parse(optionsString)};
    } else {
        log("No saved options present, useDefaultOptions");
    }
} catch (e) {
    log("Could not load options", e);
}


export const printOptions = options;
