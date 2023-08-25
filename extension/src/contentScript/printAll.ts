import {createButton} from "../helper/createButton";
import { showOptionsDialog} from "../options/showOptionsDialog";
import {printOptions} from "../options/defaultOptions";
import {MultiPrinter} from "../Printer/MultiPrinter";

const [printButton] = createButton("Print All");
const [settingsButton] = createButton("Settings");

let enabled = true;
printButton.addEventListener('click', async () => {
    if (!enabled) {
        return;
    }
    enabled = false;

    await new MultiPrinter(printOptions).printAll();
    printButton.removeAttribute("disabled");
    enabled = true;
});

settingsButton.addEventListener("click", () => showOptionsDialog(printOptions));

document
    .querySelector('.page-header__primary .page-heading')
    ?.prepend(printButton);

document
    .querySelector('.page-header__primary .page-heading')
    ?.prepend(settingsButton);

export const moduleExport = '42';
