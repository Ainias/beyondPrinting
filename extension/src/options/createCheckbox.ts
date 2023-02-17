export function createCheckbox(labelText: string, enabled: boolean, onChange: (enabled: boolean) => any) {
    const container = document.createElement("div");
    container.style.display="flex";
    container.style.alignItems="center";

    const label = document.createElement("span");
    label.style.padding = "0.2rem";
    label.style.flex="1";
    label.innerText = labelText;
    container.appendChild(label);

    const toggleContainer = document.createElement("div");
    toggleContainer.style.cursor = "pointer";
    toggleContainer.style.borderRadius = "10px";
    toggleContainer.style.position = "relative";
    toggleContainer.style.width = "30px";
    toggleContainer.style.height = "14px";
    toggleContainer.style.display="inline-block";
    toggleContainer.style.float="right";
    container.appendChild(toggleContainer);

    const toggle = document.createElement("div");
    toggle.style.borderRadius = "50%";
    toggle.style.width = "20px";
    toggle.style.height = "20px";
    toggle.style.position="absolute";
    toggle.style.top="-3px";
    toggle.style.boxShadow = "0 1px 1px rgb(0 0 0 / 30%)";
    toggleContainer.appendChild(toggle);

    const changeEnabledStyle = (isEnabled: boolean) => {
        if (isEnabled){
            toggleContainer.style.backgroundColor = "#ebadad";
            toggle.style.backgroundColor="#c53131";
            toggle.style.right="-2px";
            toggle.style.left="initial";
        } else {
            toggleContainer.style.backgroundColor = "#bbb";
            toggle.style.backgroundColor="#eee";
            toggle.style.left="-2px";
            toggle.style.right="initial";
        }
    };

    changeEnabledStyle(enabled);
    container.addEventListener("click", () => {
        enabled = !enabled;
        changeEnabledStyle(enabled);
        onChange(enabled);
    });

    return container;
}
