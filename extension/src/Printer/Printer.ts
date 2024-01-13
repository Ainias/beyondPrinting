import {log} from "../helper/log";
import {ArrayHelper, PromiseWithHandlers} from "@ainias42/js-helper";
import {ProgressListenerInterface, ProgressType} from "../ProgressListener/ProgressListenerInterface";
import {createButton} from "../helper/createButton";

const extensionName = "BeyondPrinting";

export class Printer {

    private static readonly SELECTORS = {
        TOC: '.compendium-toc-full-text',
    };

    private readonly config = {
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
        downloadHtml: true,

        includePlayerVersionMaps: true,
        useBigMapImages: true,

        headingOnNewPage: true,

        waitForUserConfirmationAfterPrint: false,
        version: 1,

    };

    private readonly url: string;

    private baseDoc?: Document;
    private mainLinkElements: Record<string, HTMLAnchorElement> = {};
    private linkElementsWithFragments: Record<string, HTMLAnchorElement[]> = {};

    private subPages: string[] = [];

    private headerParts: string[] = [];

    private preTableOfContentParts: string[] = [];
    private bodyParts: string[] = [];

    private singlePage: boolean | undefined = undefined;


    private progressListener: ProgressListenerInterface;

    constructor(url: string, config: Partial<Printer["config"]>, progressListener: ProgressListenerInterface) {
        this.url = url;
        this.config = {...this.config, ...config};
        this.progressListener = progressListener;
    }

    public isSinglePage() {
        if (this.singlePage === undefined && this.baseDoc) {
            this.singlePage = !this.baseDoc.querySelector(Printer.SELECTORS.TOC);
        }
        return this.singlePage;
    }

    private async loadBaseDocument() {
        if (!this.baseDoc) {
            this.baseDoc = await Printer.fetch(this.url);
        }
    }

    public static async fetch(url: string) {
        return fetch(url, {mode: "no-cors"}).then(r => r.text()).then(html => new DOMParser().parseFromString(html, "text/html"));
    }

    private async extractBaseSiteLinks() {
        if (!this.baseDoc) {
            return;
        }

        const tocs = this.baseDoc.querySelectorAll<HTMLDivElement>(Printer.SELECTORS.TOC);
        const firstToc = tocs[0];

        log("Tocs", tocs);
        if (!firstToc) {
            return;
        }

        firstToc.id = "toc";

        tocs.forEach(toc => {
            const linkElements = toc.querySelectorAll("a");
            linkElements.forEach((a) => {
                const [href, fragment] = a.href.split("#");

                if (!this.subPages.includes(href)) {
                    this.subPages.push(href);
                    this.mainLinkElements[href] = a;
                    this.linkElementsWithFragments[href] = [];
                }

                if (fragment) {
                    this.linkElementsWithFragments[href].push(a);
                }
            });
        });
    }

    extractTitle(excludeForDnDHint = false) {
        let title = (this.baseDoc?.querySelector<HTMLHeadingElement>(".page-title")?.innerText ?? "").trim();
        if (title && this.config.includeForDndInTitle && !excludeForDnDHint) {
            title += " for Dungeons and Dragons Fifth Edition";
        }
        return title;
    }

    private async addTitlePageIntroduction() {
        if (!this.baseDoc) {
            return;
        }

        let titlePageParts: string[] = [];

        if (this.config.includeTitle) {
            titlePageParts.push(`<div class="title">${this.extractTitle()}</div>`);
        }

        const username = this.baseDoc.querySelector<HTMLSpanElement>(".user-interactions-profile-nickname")?.innerText;
        if (this.config.includeUsername && username) {
            titlePageParts.push(`<div class="username">Printed by ${username}</div>`);
        }

        if (titlePageParts.length > 0) {
            titlePageParts = [`<div class="title-container">${titlePageParts.join()}</div>`];
        }

        if (this.config.includePrintedWithHint) {
            titlePageParts.push(`<div class="printed-with-hint">Printed with the ${extensionName}-Chrome-Extension</div>`);
        }
        if (titlePageParts.length) {
            this.preTableOfContentParts.push(`<div class="print-section title-page">${titlePageParts.join("\n")}</div>`);
        }
    }

    private async extractIntroduction() {
        if (!this.baseDoc || !this.config.includeIntroduction) {
            return;
        }
        const link = this.baseDoc.querySelector<HTMLAnchorElement>('a[href$="/introduction"]')?.href;
        log("Introduction", link);
        if (!link) {
            return;
        }

        const toc = this.baseDoc.querySelector<HTMLDivElement>(Printer.SELECTORS.TOC);
        const linkContainer = this.baseDoc.createElement("h3");
        const linkElement = this.baseDoc.createElement("a");
        linkElement.href = link;
        linkElement.title = "Introduction";
        linkElement.innerText = "Introduction";
        linkContainer.appendChild(linkElement);

        log(linkContainer, toc);
        toc?.prepend(linkContainer);
    }

    private async extractCover() {
        if (!this.baseDoc || !this.config.includeCover) {
            return;
        }
        const link = this.baseDoc.querySelector<HTMLAnchorElement>(".view-cover-art a")?.href ?? this.baseDoc.querySelector<HTMLAnchorElement>("a.view-cover-art")?.href ?? this.baseDoc.querySelector<HTMLAnchorElement>("#CoverImage a")?.href;
        log("Cover-Art lint", link);
        if (link) {
            this.preTableOfContentParts.push(`<div class="print-section cover-img">
                    <img src="${link}" alt="cover" />
                </div>`);
        }
    }

    private async doPage(subPage: string, addToBodyParts = true) {
        const pageName = subPage.split('/').pop();

        log('Fetching page ', pageName);
        const pageDocument = await Printer.fetch(subPage);

        if (!pageDocument.querySelector('.p-article-content')) {
            if (this.config.failOnError) {
                throw new Error(`Could not find page "${pageName}". \nMake sure you have access to the book!`);
            } else {
                return "";
            }
        }

        const headerElements: string[] = [];

        const links = pageDocument.querySelectorAll('.primary-content link') ?? [];
        links.forEach(link => {
            if (link.getAttribute('rel') === 'stylesheet') {
                headerElements.push(link.outerHTML);
            }
        });

        const styles = pageDocument.querySelectorAll('.primary-content style') ?? [];
        styles.forEach(style => {
            headerElements.push(style.outerHTML);
        });

        const titleElement = pageDocument.querySelector(".p-article-content h1");
        let id = titleElement?.id;
        if (id) {
            id = `${extensionName}-${id}`;
            if (titleElement) {
                titleElement.id = id;
            }

            // Update main Link to chapter
            if (this.mainLinkElements[subPage]) {
                this.mainLinkElements[subPage].href = `#${id}`;
                if (this.config.includeBacklinks && !this.isSinglePage()) {
                    const backlink = document.createElement("a");
                    backlink.innerHTML = "&uarr;";
                    backlink.href = "#toc";
                    backlink.classList.add("backlink");
                    titleElement?.appendChild(backlink);
                }
            }

            // Update links to subchapters
            pageDocument.querySelectorAll<HTMLHeadingElement>(".primary-content h2.heading-anchor").forEach(heading => {
                if (heading.id) {
                    heading.id = `${id}-${heading.id}`;
                    if (this.config.includeBacklinks && !this.isSinglePage()) {
                        const backlink = document.createElement("a");
                        backlink.innerHTML = "&uarr;";
                        backlink.href = "#toc";
                        backlink.classList.add("backlink");
                        heading.appendChild(backlink);
                    }
                }
            });

            (this.linkElementsWithFragments[subPage] ?? []).forEach(linkElement => {
                const [, fragment] = linkElement.href.split("#");
                linkElement.href = `#${id}-${fragment}`;
            });
        }

        pageDocument.querySelectorAll<HTMLLinkElement>("figure > a + figcaption > a[data-title='View Player Version']").forEach(linkElem => {
            if (this.config.useBigMapImages) {
                const dmFigureElement = linkElem.parentElement?.parentElement as HTMLElement | undefined;
                const dmImgElem = dmFigureElement?.querySelector("img") as HTMLImageElement | undefined;
                const dmLinkElem = dmFigureElement?.querySelector("a") as HTMLLinkElement | undefined;
                if (dmImgElem && dmLinkElem && dmLinkElem.href) {
                    dmImgElem.src = dmLinkElem.href;
                    dmImgElem.style.width = "100%";
                }
            }

            if (this.config.includePlayerVersionMaps) {
                linkElem.classList.remove("ddb-lightbox-outer");
                linkElem.classList.add("compendium-image-center");
                const imgElement = pageDocument.createElement("img");
                imgElement.src = linkElem.href;
                linkElem.innerText = "";
                linkElem.appendChild(imgElement);

                const textNode = linkElem.parentElement?.firstChild;
                if (textNode) {
                    textNode.nodeValue += "(DM-Version above, Player-Version below) ";
                }
            }
        });

        pageDocument.querySelectorAll<HTMLLinkElement>(".compendium-image-view-player a").forEach(linkElem => {
            const dmFigureElement = linkElem.parentElement?.previousElementSibling as HTMLElement | undefined;
            if (this.config.useBigMapImages) {
                const dmImgElem = dmFigureElement?.querySelector("img") as HTMLImageElement | undefined;
                const dmLinkElem = dmFigureElement?.querySelector("a") as HTMLLinkElement | undefined;
                if (dmImgElem && dmLinkElem) {
                    dmImgElem.src = dmLinkElem.href;
                    dmImgElem.style.width = "100%";
                }
            }
            if (this.config.includePlayerVersionMaps) {
                linkElem.classList.remove("ddb-lightbox-outer");
                linkElem.classList.add("compendium-image-center");
                const imgElement = pageDocument.createElement("img");
                imgElement.src = linkElem.href;
                linkElem.innerText = "";
                linkElem.appendChild(imgElement);

                const textNode = dmFigureElement?.querySelector("h4")?.lastChild;
                if (textNode) {
                    textNode.nodeValue += " (DM-Version above, Player-Version below) ";
                }
            }
        });


        const siteHtml = `<div class="print-section">${pageDocument.querySelector('.p-article-content')?.innerHTML}</div>`;
        this.headerParts.push(headerElements.join("\n"));
        if (addToBodyParts) {
            this.bodyParts.push(siteHtml);
        }
        return siteHtml;
    }

    private doImage(imgUrl: string) {
        const imgName = imgUrl.split('/').pop();

        // TODO Img-Links from Table of content
        const imageTitle = this.mainLinkElements[imgUrl]?.textContent;
        log('Including image ', imgName, imageTitle);
        this.bodyParts.push(`<div class="print-section">
                ${imageTitle ? `<h1>${imageTitle}</h1>` : ''}
                <img src="${imgUrl}" alt="${imageTitle}" class="ddb-lightbox-inner" />
            </div>`);
    }

    private doUrl(url: string) {
        const lastPart = url.split('/').pop() ?? "";
        if (lastPart.indexOf('.') !== -1) {
            return this.doImage(url);
        }
        return this.doPage(url);
    }

    private getBookHtml(head: string, body: string) {
        return `<div>
                        ${head}
                        <style>
                        body {
                            overflow: hidden;
                            background: url(https://www.dndbeyond.com/attachments/0/84/background_texture.png) #f9f9f9 !important;
                        }
                            .print-hidden {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100%;
                                font-size: 2rem;
                            }
                           
                           .flexible-double-column > *{
                                flex-basis: 0;
                                flex-grow: 1;
                           }
                           .flexible-double-column__column-width-35pct, .flexible-double-column__column-width-45pct {
                                flex-basis: initial !important;
                                flex-grow: initial !important;
                           }
                           
                            .title-page,  .cover-img  {
                                    text-align: center;
                                    height: 100vh;
                                    width: 100vw;                       
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;     
                                }
                                .title-container {
                                    flex: 1;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                }
                                .title {
                                    font-size: 3rem;
                                    font-weight: bold;
                                    margin-bottom: 2rem;
                                }
                                .username {
                                    font-size: 1rem;
                               
                                }
                                .printed-with-hint {
                                    font-size: 0.7rem;
                                }
                                a.backlink {
                                    float: right;
                                    border: solid 1px #dddddd;
                                    padding: 0 1rem;
                                    color: #bbbbbb !important;
                                    border-radius: 8px;;
                                } 
                                table {
                                    width: 100%;                                    
                                    text-align: center;
                                    margin: 20px 0;
                                    border-collapse: collapse;
                                } 
                                thead {
                                    border-bottom: 3px solid #d0cac5;;
                                }
                                thead tr:nth-child(odd) {
                                    background-color: white;
                                }
                                tr:nth-child(odd) {
                                    background-color: ${this.config.strippedTables ? "#FAF8F7" : "white"}
                                }
                                td {
                                    border: 1px solid #e0dcdc;
                                    padding: 5px 5px;
                                }
                                th {
                                    border: 1px solid #e0dcdc;
                                    padding: 12px 10px;
                                }
                                
                                h1 {
                                    border-bottom: 3px solid #47D18C;
                                    margin-bottom: 0.5em;
                                }
                                h2, h3 {
                                    border-bottom: 1px solid #47D18C;
                                    margin-bottom: 0.5em;
                                }
                                .compendium-toc-full-text h3, .compendium-toc-full-text ul {
                                    break-after: avoid !important;
                                    break-before: initial !important;
                                }
                                h4 {
                                    font-size: 18px;
                                }
                                figcaption {
                                    text-align: center;
                                } 
                                img {
                                    max-width: 100%;
                                }       
                                h1, h2.compendium-hr {
                                ${this.config.headingOnNewPage ? `
                                    break-before: always;
                                    page-break-before: always;
                                ` : `
                                    break-before: initial;
                                    page-break-before: initial;
                                `}
                                } 
                                .print-section {
                                    break-after: always; 
                                    page-break-after: always; 
                                } 
                                caption {
                                    break-before: avoid; 
                                    page-break-before: avoid
                                }
                                h1, h2, h3, h4 {
                                    break-after: avoid;
                                    page-break-after: avoid;
                                } 
                                aside, blockquote, table, ul, ol, figure, img {
                                    break-inside: avoid; 
                                    page-break-inside: avoid;
                                } 
                                blockquote.adventure-read-aloud-text {
                                    background-color: white;
                                }
                                .compendium-image-left {
                                    float: left; display: block;
                                } 
                                .compendium-image-right {
                                    float: right; display: block;
                                } 
                                .monster-image-left {
                                    float: left; display: block;
                                } 
                                .monster-image-right {
                                    float: right; display: block;
                                } 
                                img.compendium-center-banner-img {
                                    width: 100%;
                                }
                                @page {
                                    size: 210mm 297mm
                                    margin: 30px
                                }
                            
                            @media print {
                                .print-hidden {
                                    display: none !important;
                                }
                                .print {
                                    display: initial;
                                }
                            }
                        </style>
                        ${body}
                    </div>`;
    }

    private createHtmlParts() {
        const tableOfContents = Array.from(this.baseDoc?.querySelectorAll(Printer.SELECTORS.TOC) ?? []).map(toc => toc.outerHTML);
        if (tableOfContents.length > 0) {
            this.bodyParts.unshift(`<div class="print-section">${tableOfContents.join("\n")}</div>`);
        }

        return [this.headerParts.join("\n"), `${this.preTableOfContentParts.join("\n")}
                        ${this.bodyParts.join("\n")}`] as [string, string];
    }

    async waitBetweenRequests() {
        await new Promise<void>(r => setTimeout(r, this.config.minPageDelay + Math.random() * (this.config.maxPageDelay - this.config.minPageDelay)));
    }

    async calculateHtmlPartsForMultipleSites() {
        await this.loadBaseDocument();
        await this.addTitlePageIntroduction();
        await this.extractCover();
        await this.extractIntroduction();

        await this.extractBaseSiteLinks();

        await ArrayHelper.asyncForEach(this.subPages, async (subPage, index) => {
            log(subPage);
            await this.doUrl(subPage);
            await this.waitBetweenRequests();
            this.progressListener.updateProgress(ProgressType.SUBPAGE, index + 1, this.subPages.length);
        });
        return this.createHtmlParts();
    }

    async calculateHtmlPartsForSingleSite() {
        await this.loadBaseDocument();
        await this.addTitlePageIntroduction();
        await this.extractCover();
        // await this.extractIntroduction();

        this.subPages = [this.url];
        await this.extractBaseSiteLinks();

        await ArrayHelper.asyncForEach(this.subPages, async (subPage, index) => {
            log(subPage);
            await this.doUrl(subPage);
            await this.waitBetweenRequests();
            this.progressListener.updateProgress(ProgressType.SUBPAGE, index + 1, this.subPages.length);
        });
        return this.createHtmlParts();
    }

    private async downloadHtml(html: string) {
        if (!this.baseDoc) {
            return;
        }

        const styleSheets = this.baseDoc.querySelectorAll<HTMLLinkElement>("head link[rel='stylesheet']");
        const stylesheetParts: string[] = [];
        await ArrayHelper.asyncForEach(Array.from(styleSheets), async styleSheet => {
            stylesheetParts.push(await fetch(styleSheet.href).then(res => res.text()));
            await this.waitBetweenRequests();
        });

        const printContent = document.createElement("span");
        printContent.innerHTML = `<style>${stylesheetParts.join("")}</style>${html}`;

        const images = printContent.querySelectorAll("img") ?? [];
        await ArrayHelper.asyncForEach(Array.from(images), async (img, index) => {
            this.progressListener.updateProgress(ProgressType.IMAGE, index + 1, images.length);
            try {
                const blob = await fetch(img.src, {mode: "no-cors"}).then(res => res.blob());
                await new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        img.src = reader.result as string;
                        resolve();
                    };
                    reader.onerror = () => {
                        reject(new Error(`Failed to load image ${img.src}`));
                    };
                    setTimeout(() => reject(new Error(`Failed to load image ${img.src} because of timeout`)), 3000);
                    reader.readAsDataURL(blob);
                });
            } catch (error: any) {
                this.progressListener.addErrorMessage(error?.message ?? error);
            }
            await this.waitBetweenRequests();
        });

        const donePromise = new PromiseWithHandlers();
        let hint = `All images loaded! Starting download...`;
        if (this.config.waitForUserConfirmationAfterPrint) {
            hint += " Click the button after download.";
            const [button] = createButton("I've printed!");
            button.addEventListener("click", () => {
                donePromise.resolve();
            });
            this.progressListener.addElement(button);
        } else {
            setTimeout(() => {
                donePromise.resolve();
            }, 10);
        }
        this.progressListener.onDone(hint);

        const fullHtml = `
        <html lang="en">
            <head>
                <title>${this.extractTitle()}</title>
                <meta charset='UTF-8'/>
            </head>
            <body>${encodeURIComponent(printContent.outerHTML)}</body>
        </html>`;

        const downloadLink = document.createElement("a");
        downloadLink.download = this.extractTitle(true).replaceAll(" ", "_");
        downloadLink.href = `data:text/html;charset=UTF-8,${fullHtml}`;
        downloadLink.click();

        await donePromise;
    }

    private async printHtml(html: string) {
        document.title = this.extractTitle(true);

        const printContent = document.createElement("span");
        printContent.classList.add("print");
        printContent.innerHTML = html;

        const images = printContent.querySelectorAll("img") ?? [];
        let imgCounter = 0;
        const promises: Promise<void>[] = [];
        images.forEach((img) => promises.push(new Promise<void>((resolve, reject) => {
            img.onload = () => {
                resolve();
            };
            img.onerror = () => {
                log("Image could not be loaded", img);
                reject(new Error(`Failed to load image ${img.src}\n`));
            };
        }).catch((error: any) => {
            this.progressListener.addErrorMessage(error?.message ?? error);
        }).finally(() => {
            imgCounter++;
            this.progressListener.updateProgress(ProgressType.IMAGE, imgCounter, images.length);
            // printProgress.innerText = `Waiting for images... (${imgCounter}/${images.length})`;
        })));
        this.progressListener.setHtmlElement(printContent);

        // Workaround for a bug in chrome (or brave) where a table prints on two pages even though there is enough space on the first page.
        printContent.querySelectorAll("table").forEach(table => {
            const {height} = table.getBoundingClientRect();
            table.style.height = `${Math.ceil(height)}px`;
        });

        // Wait for pictures to load;
        await Promise.all(promises);

        const donePromise = new PromiseWithHandlers();
        if (this.config.waitForUserConfirmationAfterPrint) {
            const [button] = createButton("I've printed!");
            button.addEventListener("click", () => {
                donePromise.resolve();
            });
            this.progressListener.addElement(button);
            this.progressListener.onDone("All images loaded! If printing does not start automatically, print manually (CTRL+P). Click the button after printing.");
        } else {
            donePromise.resolve();
        }

        window.print();
        await donePromise;
    }

    async createHtml() {
        if (!this.baseDoc) {
            return "";
        }

        const buttons = this.baseDoc.querySelectorAll(".essentials-button");

        let html: string;
        if (buttons.length > 0 && buttons[0].classList.contains("essentials-button--active")) {
            const htmlPromises: Promise<[string, string]>[] = [];
            const progresses: Record<number, [number, number]> = {};
            buttons.forEach((button, index) => {
                if (index === 0) {
                    return;
                }

                htmlPromises.push(new Promise<[string, string]>(r => {
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
                    const me = this;
                    new Printer(button.querySelector<HTMLAnchorElement>("a")?.href ?? "", {...this.config}, new class implements ProgressListenerInterface {
                        // eslint-disable-next-line class-methods-use-this
                        addErrorMessage(text: string): void {
                            me.progressListener.addErrorMessage(text);
                        }

                        // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
                        clear(): void {
                        }

                        // eslint-disable-next-line class-methods-use-this
                        updateProgress(type: ProgressType, done: number, from: number): void {
                            if (type !== ProgressType.SUBPAGE) {
                                return;
                            }
                            progresses[index] = [done, from];
                            const [realDone, realFrom] = Object.values(progresses).reduce(([doneOld, fromOld], [doneNew, fromNew]) => ([doneOld + doneNew, fromOld + fromNew]), [0, 0]);
                            me.progressListener.updateProgress(ProgressType.SUBPAGE, realDone, realFrom);
                        }

                        // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
                        onDone() {
                        }

                        // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
                        addElement() {
                        }

                        // eslint-disable-next-line @typescript-eslint/no-empty-function,class-methods-use-this
                        setHtmlElement() {
                        }
                    })
                        .calculateHtmlPartsForMultipleSites().then(parts => r(parts));
                }));
            });
            const parts = await Promise.all(htmlPromises);
            const [head, body] = parts.reduce(([oldHead, oldBody], [newHead, newBody]) => {
                return [oldHead + newHead, oldBody + newBody];
            }, ["", ""] as [string, string]);
            html = this.getBookHtml(head, body);
        } else if (this.isSinglePage()) {
            const [head, body] = await this.calculateHtmlPartsForSingleSite();
            html = this.getBookHtml(head, body);
        } else {
            const [head, body] = await this.calculateHtmlPartsForMultipleSites();
            html = this.getBookHtml(head, body);
        }
        return html;
    }

    async print() {
        await this.loadBaseDocument();
        if (!this.baseDoc) {
            return;
        }

        const html = await this.createHtml();
        if (this.config.downloadHtml) {
            await this.downloadHtml(html);
        } else {
            await this.printHtml(html);
        }
    }

    async hasAccessToBook() {
        await this.loadBaseDocument();

        if (this.isSinglePage()) {
            return !!this.baseDoc?.querySelector(".p-article-content");
        }

        const linkOfSubpage = this.baseDoc?.querySelector<HTMLLinkElement>(".compendium-toc-full-text a")?.href;

        if (linkOfSubpage) {
            const page = await Printer.fetch(linkOfSubpage);
            return page.querySelector('.p-article-content');
        }

        // TODO single page books
        return false;
    }
}
