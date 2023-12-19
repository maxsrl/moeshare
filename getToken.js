const readlineSync = require('readline-sync');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const clc = require('cli-color');

require('dotenv').config();
const { JWT_TOKEN } = process.env;
const DATABASE_FILE = './db/datenbank.sqlite';

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

const getTokenByUsername = (enteredUsername, enteredPassword, callback) => {
  const db = new sqlite3.Database(DATABASE_FILE);

  const query = 'SELECT * FROM users WHERE username = ?';
  const values = [enteredUsername];

  db.get(query, values, async (error, user) => {
    if (error) {
      console.error(clc.red('\n[ERROR] | » Fehler beim Überprüfen des Benutzernamens:', error.message));
      callback(null);
      return;
    }

    if (user) {
      const passwordMatch = await bcrypt.compare(enteredPassword, user.password);

      if (passwordMatch) {
        const { id, username, role, token } = user;
        const decodedToken = jwt.verify(token, JWT_TOKEN);

        if (decodedToken.username === enteredUsername) {
          callback(token);
        } else {
          console.error(clc.red('\nUngültiger Token für den angegebenen Benutzer!'));
          callback(null);
        }
      } else {
        console.error(clc.red('\nFalsches Passwort!'));
        callback(null);
      }
    } else {
      console.error(clc.red('\nBenutzer nicht gefunden!'));
      callback(null);
    }

    db.close();
  });
};

async function login() {
  try {
    const enteredUsername = readlineSync.question('\nBenutzername: ');
    const enteredPassword = readlineSync.question('Passwort: ', { hideEchoBack: true });

    getTokenByUsername(enteredUsername, enteredPassword, (token) => {
      if (token) {
        console.log(clc.whiteBright(`\nAuthentifizierung erfolgreich!\nDein Token lautet: ${token}\n`));
      } else {
        console.error(clc.red('Fehler bei der Authentifizierung!\n'));
      }
    });
  } catch (error) {
    console.error(clc.red('\nEin Fehler ist aufgetreten!'));
  }
}

login();