export async function run(context) {
    const { app } = context;

    const { showMonsterModal } = await import('../ui/monsterModal.js');

    window.showMonsterModal = showMonsterModal;

    console.log('Monster modal registered globally');
}
