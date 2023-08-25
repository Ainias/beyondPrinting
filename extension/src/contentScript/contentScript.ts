import {Printer} from "../Printer/Printer";
import {createButton} from "../helper/createButton";
import {showOptionsDialog} from "../options/showOptionsDialog";
import {printOptions} from "../options/defaultOptions";
import {ProgressListener} from "../ProgressListener/ProgressListener";

const [printButton, printButtonText] = createButton("Print");
const [settingsButton] = createButton("Settings");

let enabled = true;
printButton.addEventListener('click', async () => {
    if (!enabled) {
        return;
    }
    enabled = false;

    try {
        printButton.setAttribute("disabled", "disabled");
        printButtonText.innerText = "Waiting for pages...";
        await new Printer(window.location.href, printOptions, new ProgressListener()).print();
        window.location.reload();
    } catch (e: any) {
        alert(e.message ?? e);
    }
        printButtonText.innerText = "Print";
    printButton.removeAttribute("disabled");
    enabled = true;
});


settingsButton.addEventListener("click", () => showOptionsDialog(printOptions));

const tocElement = document
    .querySelector('.article-main .compendium-toc-full .compendium-toc-full-header');
const singlePageHeader = document.querySelector(".page-header .page-header__extras");


if (tocElement){
    tocElement.prepend(printButton);
    tocElement.prepend(settingsButton);
} else if (singlePageHeader && !window.location.href.startsWith("https://www.dndbeyond.com/sources#") && window.location.href !== "https://www.dndbeyond.com/sources"){
    singlePageHeader.append(printButton);
    singlePageHeader.append(settingsButton);
}


export const moduleExport = '42';
