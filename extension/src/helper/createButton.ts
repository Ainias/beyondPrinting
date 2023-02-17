export function createButton(text: string){
    const button = document.createElement('a');
    button.classList.add('button-alt');
    button.classList.add('button-alt-default');
    button.style.cursor = 'pointer';
    button.style.float="right";

    const buttonText = document.createElement('span');
    buttonText.classList.add('label');
    buttonText.innerText = text;
    button.appendChild(buttonText);

    return [button, buttonText];
}
