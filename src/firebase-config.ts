// Configuração web do Firebase. NÃO é segredo: ela é pública por desenho.
// A segurança vem das regras do banco (database.rules.json), não de esconder estes valores.
// Enquanto apiKey começar com "COLE", o app roda em MODO LOCAL: só sincroniza abas deste navegador.
export const firebaseConfig = {
  apiKey: "AIzaSyAgX9SISzR6dTmDjH3UVgz7E1aJI7mGwoY",
  authDomain: "exibicao-universal.firebaseapp.com",
  databaseURL: "https://exibicao-universal-default-rtdb.firebaseio.com",
  projectId: "exibicao-universal",
  appId: "1:614415244615:web:4870a08d554280a0d14062",
};

export const firebaseConfigurado = !firebaseConfig.apiKey.startsWith("COLE");
