/**
 * UI utilities for Obsidian scripts
 * Prompts, notifications, and user interaction
 */

export function notifySuccess(message) {
    new Notice(message);
}

export function notifyWarning(message) {
    new Notice(`${message}`);
}

export function notifyError(message) {
    new Notice(`${message}`);
}

export async function selectFromList(quickAddApi, displayChoices, values, placeholder = "Select...") {
    return await quickAddApi.suggester(displayChoices, values, false, placeholder);
}

export async function promptForText(quickAddApi, message, defaultValue = "") {
    return await quickAddApi.inputPrompt(message, defaultValue);
}

export async function promptForNumber(quickAddApi, message, defaultValue = 0) {
    const input = await quickAddApi.inputPrompt(message, String(defaultValue));
    if (!input) return null;
    const num = parseInt(input);
    return isNaN(num) ? null : num;
}

export async function showForm(app, formName, options = {}) {
    const modalForm = app.plugins.plugins.modalforms?.api;
    if (!modalForm) {
        throw new Error("ModalForms plugin is not enabled");
    }
    return await modalForm.openForm(formName, options);
}

export function buildTargetChoices(initiatives) {
    const displayChoices = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const hp = i.type === "monster" ? ` [${i.currentHp}/${i.maxHp} HP]` : '';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}${hp}`;
    });

    const values = initiatives.map(i => i.label || i.name?.replace(/\[\[|\]\]/g, '') || 'Unknown');

    return { displayChoices, values };
}

export async function promptForTarget(quickAddApi, initiatives, placeholder = "Select target...") {
    const { displayChoices, values } = buildTargetChoices(initiatives);
    const selectedLabel = await selectFromList(quickAddApi, displayChoices, values, placeholder);
    if (!selectedLabel) return null;

    return initiatives.find(i =>
        i.label === selectedLabel ||
        (i.name && i.name.replace(/\[\[|\]\]/g, '') === selectedLabel)
    );
}

export function buildSourceChoices(initiatives) {
    const displayChoices = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}`;
    });

    return { displayChoices, values: displayChoices };
}

export const DAMAGE_TYPES = [
    { label: "Slashing", value: "Slashing" },
    { label: "Piercing", value: "Piercing" },
    { label: "Bludgeoning", value: "Bludgeoning" },
    { label: "Fire", value: "Fire" },
    { label: "Cold", value: "Cold" },
    { label: "Lightning", value: "Lightning" },
    { label: "Thunder", value: "Thunder" },
    { label: "Poison", value: "Poison" },
    { label: "Acid", value: "Acid" },
    { label: "Psychic", value: "Psychic" },
    { label: "Force", value: "Force" },
    { label: "Radiant", value: "Radiant" },
    { label: "Necrotic", value: "Necrotic" }
];
