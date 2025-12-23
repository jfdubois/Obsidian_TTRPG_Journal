/**
 * QuickAdd wrapper for Add Monsters action
 */
module.exports = async (params) => {
    try {
        const jsEngine = params.app.plugins.plugins['js-engine'];
        if (!jsEngine) {
            new Notice('JS-Engine plugin not found');
            return;
        }

        await jsEngine.api.executeFileSimple('_system/scripts/actions/encounter/addMonsters.js', {
            app: params.app,
            quickAddApi: params.quickAddApi
        });
    } catch (error) {
        console.error('Error executing addMonsters:', error);
        new Notice(`Error: ${error.message}`);
    }
};
