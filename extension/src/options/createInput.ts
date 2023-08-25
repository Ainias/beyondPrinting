export function createInput(labelText: string, value: string, onChange: (newValue: string) => any) {
    const container = document.createElement("div");
    container.style.display="flex";
    container.style.alignItems="center";

    const label = document.createElement("span");
    label.style.padding = "0.2rem";
    label.style.paddingRight = "0.5rem";
    label.style.flex="1";
    label.innerText = labelText;
    container.appendChild(label);

    const input = document.createElement("input");
    input.value = value;
    input.style.textAlign="right";
    container.appendChild(input);

    container.addEventListener("change", () => {
        onChange(input.value);
    });

    return container;
}
