const axios = require('axios');
const readlineSync = require('readline-sync');
const config = require('./config');

const { baseUrl } = config;

async function login() {
  try {
    const username = readlineSync.question('\nBenutzername: ');
    const password = readlineSync.question('Passwort: ', {
      hideEchoBack: true
    });

    const response = await axios.post(`${baseUrl}/login`, {
      username: username,
      password: password
    });

    const { token, role } = response.data;
    console.log(`\nWillkommen zurück, ${username} (Rolle: ${role})\nAuthentifizierung erfolgreich!\nDein Token:`, token + '\n');
  } catch (error) {
    console.error('\nFehler bei der Authentifizierung!\nIst der Server gestartet?');
  }
}

login();