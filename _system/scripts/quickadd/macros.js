/**
 * QuickAdd macro wrappers
 * Thin layer that calls JS-Engine to execute action scripts
 */

async function executeAction(params, actionPath) {
    try {
        const jsEngine = params.app.plugins.plugins['js-engine'];
        if (!jsEngine) {
            new Notice('JS-Engine plugin not found');
            return;
        }

        await jsEngine.api.executeFileSimple(actionPath, {
            app: params.app,
            quickAddApi: params.quickAddApi
        });
    } catch (error) {
        console.error(`Error executing ${actionPath}:`, error);
        new Notice(`Error: ${error.message}`);
    }
}

// World actions
module.exports.createWorld = async (params) => {
    await executeAction(params, '_system/scripts/actions/world/createWorld.js');
};

// Encounter actions
module.exports.createEncounter = async (params) => {
    await executeAction(params, '_system/scripts/actions/encounter/createEncounter.js');
};

module.exports.addMonsters = async (params) => {
    await executeAction(params, '_system/scripts/actions/encounter/addMonsters.js');
};

// Combat actions
module.exports.enableCombat = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/enableCombat.js');
};

module.exports.playersInitiatives = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/playersInitiatives.js');
};

module.exports.nextTurn = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/nextTurn.js');
};

module.exports.applyDamage = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/applyDamage.js');
};

module.exports.applyHealing = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/applyHealing.js');
};

module.exports.endCombat = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/endCombat.js');
};
