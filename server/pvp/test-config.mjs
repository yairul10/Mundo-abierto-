// Cambiar TEST_SERVER_ENABLED a false en el Worker cierra las pruebas sin actualizar la APK.
export const testServerEnabled=env=>env.TEST_SERVER_ENABLED!=='false';
export const realmName=realm=>realm==='test'?'shared-cemetery-test-v1':'shared-cemetery-v1';
