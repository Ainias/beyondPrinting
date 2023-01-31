import {Printer} from "../Printer/Printer";

const button = document.createElement('a');
button.classList.add('button-alt');
button.classList.add('button-alt-default');
button.style.cursor = 'pointer';
button.style.float="right";

const buttonText = document.createElement('span');
buttonText.classList.add('label');
buttonText.innerText = 'Print';
button.appendChild(buttonText);

let enabled = true;
button.addEventListener('click', async () => {
   if (!enabled){
      return;
   }
   enabled = false;
   button.setAttribute("disabled", "disabled");
   buttonText.innerText = "Waiting for pages...";
   await new Printer(window.location.href, {}, (done, from) => {
      buttonText.innerText = `Waiting for pages...(${done}/${from})`;
   }).print();
   buttonText.innerText = "Print";
   button.removeAttribute("disabled");
   enabled = true;
});

document
    .querySelector('.article-main .compendium-toc-full .compendium-toc-full-header')
    ?.prepend(button);

export const moduleExport = '42';
