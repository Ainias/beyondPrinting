import {log} from "../helper/log";
import {ArrayHelper} from "js-helper";

const extensionName = "BeyondPrinting";

export class Printer {

    private config = {
        minPageDelay: 0,
        maxPageDelay: 0,
        strippedTables: true,
        includeCover: false, // Not working, always disables
        includeIntroduction: true,
        includeBacklinks: true,

        includeTitle: true,
        includeForDndInTitle: true,
        includeUsername: true,
        includePrintedWithHint: true,
    } as const

    private readonly url: string;

    private baseDoc?: Document;
    private mainLinkElements: Record<string, HTMLAnchorElement> = {}
    private linkElementsWithFragments: Record<string, HTMLAnchorElement[]> = {};

    private subPages: string[] = [];

    private headerParts: string[] = [];

    private preTableOfContentParts: string[] = [];
    private bodyParts: string[] = [];

    private onProgress?: (done: number, from: number) => void;

    constructor(url: string, config: Partial<Printer["config"]> = {}, onProgress?: Printer["onProgress"]) {
        this.url = url;
        this.config = {...this.config, ...config};
        this.onProgress = onProgress;
    }

    private static async fetch(url: string) {
        return fetch(url).then(r => r.text()).then(html => new DOMParser().parseFromString(html, "text/html"));
    }

    private async extractBaseSiteLinks() {
        if (!this.baseDoc) {
            return;
        }

        const toc = this.baseDoc.querySelector<HTMLDivElement>('.compendium-toc-full-text');
        if (!toc) {
            return;
        }

        toc.id = "toc";
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
    }

    private extractTitle(excludeForDnDHint = false) {
        let title = this.baseDoc?.querySelector<HTMLHeadingElement>(".page-title")?.innerText ?? "";
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

        const toc = this.baseDoc.querySelector<HTMLDivElement>('.compendium-toc-full-text');
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
        const link = this.baseDoc.querySelector<HTMLAnchorElement>(".view-cover-art a")?.href;
        log("Cover-Art lint", link);
        if (link) {
            this.preTableOfContentParts.push(`<div class="print-section cover-img left">
                    <img src="${link}" alt="cover" />
                </div>`);
        }
    }

    private async doPage(subPage: string, addToBodyParts = true) {
        const pageName = subPage.split('/').pop();

        log('Fetching page ', pageName);
        const pageDocument = await Printer.fetch(subPage);

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
                if (this.config.includeBacklinks) {
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
                    if (this.config.includeBacklinks) {
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
                            .print {
                                display: none;
                            }
                            .print-hidden {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100%;
                                font-size: 2rem;
                            }
                            @media print {
                                .title-page {
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
                                
                                .cover-img {
                                    width: 100vw;
                                    height: 100vh;
                                    overflow: hidden;
                                }
                                .cover-img img {
                                    width: 100%;
                                    height: 100%;
                                }
                                a.backlink {
                                    float: right;
                                    border: solid 1px #dddddd;
                                    padding: 0 1rem;
                                    color: #bbbbbb !important;
                                    border-radius: 8px;;
                                } 
                            
                                .print-hidden {
                                    display: none;
                                }
                                .print {
                                    display: initial;
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
                                    padding: 5px 20px;
                                }
                                th {
                                    border: 1px solid #e0dcdc;
                                    padding: 12px 20px;
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
                                
                                figcaption {
                                    text-align: center;
                                } 
                                img {
                                    max-width: 100%;
                                }       
                                h1, h2.compendium-hr {
                                    break-before: always;
                                    page-break-before: always;
                                } 
                                .print-section {
                                    break-after: always; 
                                    page-break-after: always; 
                                } 
                                h2.heading-anchor, caption {
                                    break-before: avoid; 
                                    page-break-before: avoid
                                }
                                h1, h2, h3 {
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
                                ${this.config.includeCover ? `@page :first {
                                    margin: 0;
                                    size: 420mm 297mm;
                                }` : ""}
                            }
                        </style>
                        ${body}
                    </div>`;
    }

    private createHtmlParts() {
        return [this.headerParts.join("\n"), `${this.preTableOfContentParts.join("\n")}
                        <div class="print-section"> ${this.baseDoc?.querySelector('.compendium-toc-full-text')?.outerHTML}</div>
                        ${this.bodyParts.join("\n")}`] as [string, string];
    }

    async calculateHtmlParts() {
        this.baseDoc = await Printer.fetch(this.url);

        await this.addTitlePageIntroduction();
        await this.extractCover();
        await this.extractIntroduction();

        await this.extractBaseSiteLinks();

        await ArrayHelper.asyncForEach(this.subPages, async (subPage, index) => {
            console.log(subPage);
            await this.doUrl(subPage);
            await new Promise(r => setTimeout(r, this.config.minPageDelay + Math.random() * (this.config.maxPageDelay - this.config.minPageDelay)));
            this.onProgress?.(index + 1, this.subPages.length);
        });
        return this.createHtmlParts();
    }

    private async printHtml(html: string) {
        document.body.innerHTML = `<span class='print-hidden'>Waiting for images...</span>`;
        document.body.className = "";
        document.title = this.extractTitle(true);

        const printHint = document.querySelector<HTMLSpanElement>(".print-hidden");

        const printContent = document.createElement("span");
        printContent.classList.add("print");
        printContent.innerHTML = html;

        const images = printContent.querySelectorAll("img") ?? [];
        let imgCounter = 0;
        const promises: Promise<void>[] = [];
        images.forEach(img => promises.push(new Promise(r => (img.onload = () => {
            imgCounter++;
            if (printHint) {
                printHint.innerText = `Waiting for images... (${imgCounter}/${images.length})`;
            }
            r();
        }))));
        document.body.appendChild(printContent);

        // Wait for pictures to load;
        await Promise.all(promises);
        if (printHint) {
            printHint.innerText = `All images loaded! If printing does not start automatically, print manually (STRG+P). Reload after printing.`;
        }
        window.print();
    }

    async print() {
        this.baseDoc = await Printer.fetch(this.url);
        const buttons = this.baseDoc.querySelectorAll(".essentials-button");

        let html = "";
        if (buttons.length > 0 && buttons[0].classList.contains("essentials-button--active")) {
            const htmlPromises: Promise<[string, string]>[] = [];
            const progresses: Record<number, [number, number]> = {};
            buttons.forEach((button, index) => {
                if (index === 0) {
                    return;
                }

                htmlPromises.push(new Promise<[string, string]>(r => {
                    new Printer(button.querySelector<HTMLAnchorElement>("a")?.href ?? "", {...this.config}, (done, from) => {
                        progresses[index] = [done, from];
                        const [realDone, realFrom] = Object.values(progresses).reduce(([doneOld, fromOld], [doneNew, fromNew]) => ([doneOld + doneNew, fromOld + fromNew]), [0, 0]);
                        this.onProgress?.(realDone, realFrom);
                    })
                        .calculateHtmlParts().then(parts => r(parts));
                }));
            });
            const parts = await Promise.all(htmlPromises);
            const [head, body] = parts.reduce(([oldHead, oldBody], [newHead, newBody]) => {
                return [oldHead + newHead, oldBody + newBody];
            }, ["", ""] as [string, string]);
            html = this.getBookHtml(head, body);

        } else {
            const [head, body] = await this.calculateHtmlParts();
            html = this.getBookHtml(head, body);
        }
        await this.printHtml(html);
    }
}
