import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as monstersLib from '../../lib/monsters.js';
import { PATHS } from '../../lib/constants.js';

export async function run(context) {
    const { app } = context;

    try {
        const sourcesFile = core.getFileByPath(app, PATHS.SRD_SOURCES);
        const existingContent = await core.readFile(app, sourcesFile);
        const existingEntries = monstersLib.parseConfiguredSourceEntries(existingContent);
        const enabledSources = monstersLib.parseConfiguredSources(existingContent);
        const srdVersion = await monstersLib.loadSrdVersion(app);
        const catalog = await monstersLib.loadMonsterSourceCatalog(app);
        const refreshedContent = monstersLib.buildMonsterSourcesMarkdown({
            catalog,
            enabledSources,
            existingEntries,
            srdVersion
        });

        await core.writeFile(app, sourcesFile, refreshedContent);
        await core.openFile(app, PATHS.SRD_SOURCES);
        ui.refreshDataview(app);

        const summary = monstersLib.summarizeMonsterSourceRefresh(enabledSources, catalog);
        ui.notifySuccess(
            `Monster sources refreshed: ${summary.totalSources} sources, ${summary.preservedEnabledCount} enabled preserved, ${summary.newSourceCount} new`
        );
    } catch (error) {
        core.handleActionError("refreshMonsterSources", error);
    }
}
