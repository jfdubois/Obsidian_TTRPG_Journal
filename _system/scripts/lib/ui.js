/**
 * UI utilities for Obsidian scripts
 * Prompts, notifications, and user interaction
 */

import { DELAYS } from './constants.js';
import { stripWikiLinks } from './core.js';

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
        const name = stripWikiLinks(i.name) || 'Unknown';
        const hp = i.type === "monster" ? ` [${i.currentHp}/${i.maxHp} HP]` : '';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}${hp}`;
    });

    const values = initiatives.map(i => i.label || stripWikiLinks(i.name) || 'Unknown');

    return { displayChoices, values };
}

export async function promptForTarget(quickAddApi, initiatives, placeholder = "Select target...") {
    const { displayChoices, values } = buildTargetChoices(initiatives);
    const selectedLabel = await selectFromList(quickAddApi, displayChoices, values, placeholder);
    if (!selectedLabel) return null;

    return initiatives.find(i =>
        i.label === selectedLabel ||
        stripWikiLinks(i.name) === selectedLabel
    );
}

export function buildSourceChoices(initiatives) {
    const displayChoices = initiatives.map(i => {
        const name = stripWikiLinks(i.name) || 'Unknown';
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

/**
 * Refresh Dataview views
 * Eliminates 3 duplications
 */
export function refreshDataview(app, delayMs = DELAYS.DATAVIEW_REFRESH) {
    setTimeout(() => {
        app.workspace.trigger('dataview:refresh-views');
    }, delayMs);
}

/**
 * Show confirmation dialog
 * Eliminates 2 duplications
 */
export async function confirm(quickAddApi, question, yesLabel = "Yes", noLabel = "No") {
    const options = [
        { label: yesLabel, value: true },
        { label: noLabel, value: false }
    ];
    const result = await selectFromList(
        quickAddApi,
        options.map(o => o.label),
        options,
        question
    );
    return result?.value ?? false;
}

/**
 * Simplified option selection
 * Eliminates 5+ duplications of option mapping pattern
 */
export async function selectOption(quickAddApi, options, placeholder = "Select...") {
    const labels = options.map(o => o.label);
    const selected = await quickAddApi.suggester(labels, options, false, placeholder);
    return selected?.value;
}

/**
 * Prompt for combat source (attacker/healer)
 * Eliminates 2 duplications
 */
export async function promptForSource(quickAddApi, initiatives, action = "acting") {
    const { displayChoices, values } = buildSourceChoices(initiatives);
    const source = await selectFromList(quickAddApi, displayChoices, values, `Who is ${action}?`);
    if (!source) {
        throw new Error("Source selection cancelled");
    }
    return source;
}

/**
 * Prompt for number with validation
 * Enhanced version that validates positive numbers
 */
export async function promptForPositiveNumber(quickAddApi, message, defaultValue = 1) {
    const amount = await quickAddApi.inputPrompt(message, null, defaultValue?.toString());
    if (!amount) return null;

    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed < 1) {
        throw new Error("Invalid amount - must be a positive number");
    }
    return parsed;
}
