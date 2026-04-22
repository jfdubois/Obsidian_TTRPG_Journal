async function importFreshModule(app, vaultPath) {
    return import(app.vault.adapter.getResourcePath(vaultPath));
}

module.exports = async (params) => {
    try {
        const jsEngine = params.app.plugins.plugins['js-engine'];
        if (!jsEngine) {
            new Notice('JS-Engine plugin not found');
            return;
        }

        const module = await importFreshModule(params.app, '_system/scripts/actions/encounter/createEncounter.js');
        await module.run({
            app: params.app,
            quickAddApi: params.quickAddApi
        });
    } catch (error) {
        console.error('Error executing createEncounter:', error);
        new Notice(`Error: ${error.message}`);
    }
};
