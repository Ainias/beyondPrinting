import {Printer} from "../Printer/Printer";
import {createCheckbox} from "./createCheckbox";
import {createInput} from "./createInput";

export const OPTIONS_KEY="Beyond-Printing-Printing-Options";

export function showOptionsDialog(options: Printer["config"]){
    const saveOptions = () => localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));

    const modalContainer = document.createElement("div");
    modalContainer.style.position="fixed";
    modalContainer.style.left = "0";
    modalContainer.style.right = "0";
    modalContainer.style.bottom = "0";
    modalContainer.style.top = "0";
    modalContainer.style.backgroundColor = "rgba(0,0,0,0.3)";
    modalContainer.style.zIndex = "99999";
    modalContainer.style.display="flex";
    modalContainer.style.justifyContent="center";
    modalContainer.style.alignItems="center";

    const modal = document.createElement("div");
    modal.style.position = "relative";
    modal.style.padding="3rem";
    modal.style.paddingTop="1.5rem";
    modal.style.backgroundColor="white";
    modalContainer.appendChild(modal);

    const title = document.createElement("h3");
    title.innerText = "Print Options";
    title.style.marginBottom ="2rem";
    modal.appendChild(title);

    modal.appendChild(createCheckbox("Include Title", options.includeTitle, (enabled) => {
        options.includeTitle = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include For D&D in title", options.includeForDndInTitle, (enabled) => {
        options.includeForDndInTitle = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Username", options.includeUsername, (enabled) => {
        options.includeUsername = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Printed With Extension-Hint", options.includePrintedWithHint, (enabled) => {
        options.includePrintedWithHint = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Cover Image", options.includeCover, (enabled) => {
        options.includeCover = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Introduction (if present)", options.includeIntroduction, (enabled) => {
        options.includeIntroduction = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Backlinks", options.includeBacklinks, (enabled) => {
        options.includeBacklinks = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Use stripped tabled", options.strippedTables, (enabled) => {
        options.strippedTables = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Fail on error", options.failOnError, (enabled) => {
        options.failOnError = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Save as HTML", options.downloadHtml, (enabled) => {
        options.downloadHtml = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Start Headings on new Page", options.headingOnNewPage, (enabled) => {
        options.headingOnNewPage = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Use big Map images (may increase size)", options.useBigMapImages, (enabled) => {
        options.downloadHtml = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Include Player Map Versions", options.includePlayerVersionMaps, (enabled) => {
        options.downloadHtml = enabled;
        saveOptions();
    }));
    modal.appendChild(createCheckbox("Wait for user confirmation after print/download", options.waitForUserConfirmationAfterPrint, (enabled) => {
        options.waitForUserConfirmationAfterPrint = enabled;
        saveOptions();
    }));
    modal.appendChild(createInput("Min delay between requests (in MS)", options.minPageDelay.toString(), (newValue) => {
        options.minPageDelay = parseInt(newValue, 10);
        if (Number.isNaN(options.minPageDelay)) {
            options.minPageDelay = 0;
        }

        saveOptions();
    }));
    modal.appendChild(createInput("Max delay between requests (in MS)", options.maxPageDelay.toString(), (newValue) => {
        options.maxPageDelay = parseInt(newValue, 10);
        if (Number.isNaN(options.maxPageDelay)) {
            options.maxPageDelay = 0;
        }

        saveOptions();
    }));


    modal.addEventListener("click", (e) => {
        e.stopImmediatePropagation();
    });
    modalContainer.addEventListener("click", () => {
        modalContainer.remove();
    });
    document.body.appendChild(modalContainer);
}
