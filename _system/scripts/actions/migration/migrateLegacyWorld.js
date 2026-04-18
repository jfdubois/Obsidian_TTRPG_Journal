import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { PATHS } from '../../lib/constants.js';
import { detectLegacyWorld } from './lib/detectLegacyWorld.js';
import { planMigration } from './lib/planMigration.js';
import { applyMigration } from './lib/applyMigration.js';
import { writeMigrationReport } from './lib/reportMigration.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const sourceWorldName = await promptForLegacyWorld(app, quickAddApi);
        if (!sourceWorldName) return;

        const detection = await detectLegacyWorld(app, sourceWorldName);
        const targetWorld = await ui.promptForText(quickAddApi, "Target world name:", sourceWorldName);
        if (!targetWorld) return;

        const targetCampaign = await ui.promptForText(quickAddApi, "Target campaign name:", sourceWorldName);
        if (!targetCampaign) return;

        const role = await promptForRole(quickAddApi, detection.worldFrontmatter.role || "player");
        if (!role) return;

        const timelineNotes = await ui.promptForText(quickAddApi, "Timeline notes (optional):", "");
        const mode = await promptForMode(quickAddApi);
        if (!mode) return;

        const dryRun = mode === "dry-run";
        const plan = planMigration(app, detection, {
            targetWorld,
            targetCampaign,
            role,
            timelineNotes,
            dryRun
        });

        const result = dryRun
            ? {
                recreatedNotes: plan.recreatedNotes,
                transformedNotes: plan.actions.filter(action => action.kind.startsWith("transform")).map(action => action.targetPaths[0]),
                copiedResources: plan.actions.filter(action => action.kind === "copy").flatMap(action => action.targetPaths),
                warnings: plan.warnings,
                validationFailures: plan.validationFailures
            }
            : await applyMigration(app, detection, plan);

        const reportPath = await writeMigrationReport(app, plan, result);
        await core.openFile(app, reportPath, true);

        if (dryRun) {
            ui.notifySuccess(`Dry-run migration report created: ${reportPath}`);
        } else {
            ui.notifySuccess(`Migration completed. Report created: ${reportPath}`);
        }
    } catch (error) {
        core.handleActionError("migrateLegacyWorld", error);
    }
}

async function promptForLegacyWorld(app, quickAddApi) {
    const importsRoot = app.vault.getAbstractFileByPath(PATHS.LEGACY_IMPORTS_FOLDER);
    const options = (importsRoot?.children || [])
        .filter(child => child?.children)
        .map(child => ({ label: child.name, value: child.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

    if (options.length === 0) {
        throw new Error(`No legacy worlds found in ${PATHS.LEGACY_IMPORTS_FOLDER}`);
    }

    return ui.selectOption(quickAddApi, options, "Select legacy world:");
}

async function promptForRole(quickAddApi, defaultRole) {
    const options = [
        { label: defaultRole === "player" ? "Player (default)" : "Player", value: "player" },
        { label: defaultRole === "dm" ? "Dungeon Master (default)" : "Dungeon Master", value: "dm" }
    ];
    return ui.selectOption(quickAddApi, options, "Select role:");
}

async function promptForMode(quickAddApi) {
    const options = [
        { label: "Dry Run", value: "dry-run" },
        { label: "Apply Migration", value: "apply" }
    ];
    return ui.selectOption(quickAddApi, options, "Select migration mode:");
}
