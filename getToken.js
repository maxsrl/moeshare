const axios = require('axios');
const readlineSync = require('readline-sync');

require('dotenv').config();
const BASE_URL = process.env.BASE_URL;

if (process.env.ALLOW_METRICS === 'true') {
  const Sentry = require("@sentry/node");
  const { CaptureConsole } = require('@sentry/integrations');
  Sentry.init({
    dsn: "https://e7956175a50159561a2fcb0999ac56ce@o937824.ingest.sentry.io/4505795835658240",
    tracesSampleRate: 0.4,
    integrations: [
      new CaptureConsole({
        levels: ['error']
      })
    ],
  });
}

async function login() {
  try {
    const username = readlineSync.question('\nBenutzername: ');
    const password = readlineSync.question('Passwort: ', {
      hideEchoBack: true
    });

    const response = await axios.post(`${BASE_URL}/login`, {
      username: username,
      password: password
    });

    const { token, role } = response.data;
    console.log(`\nWillkommen zurück, ${username} (Rolle: ${role})\nAuthentifizierung erfolgreich!\nDein Token lautet: ${token}\n`);
  } catch (error) {
    console.error('\nFehler bei der Authentifizierung!\nIst der Server gestartet?');
  }
}

login();