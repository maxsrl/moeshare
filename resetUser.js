const bcrypt = require('bcrypt');
const readlineSync = require('readline-sync');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const clc = require('cli-color');

require('dotenv').config();
const { JWT_TOKEN } = process.env;
const db = new sqlite3.Database('./db/datenbank.sqlite');

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

try {
  db.serialize(() => {
    const generateToken = (id, username, role) => {
      const payload = {
        id,
        username,
        role
      };
      const token = jwt.sign(payload, JWT_TOKEN);
      return token;
    };

    console.log(clc.whiteBright('\nBitte geben Sie die folgenden Informationen ein, um einen neuen Benutzer zu erstellen oder das Token eines bestehenden Benutzers zu aktualisieren.\nNutze beim Passwort keine Sonderzeichen!\n'));

    const username = readlineSync.question('Benutzername: ');

    const existingUserQuery = 'SELECT * FROM users WHERE username = ?';
    const existingUserValues = [username];

    db.get(existingUserQuery, existingUserValues, (error, existingUser) => {
      if (error) {
        console.error(clc.red('\n[ERROR] | » Fehler beim Überprüfen des Benutzernamens:', error.message));
        return;
      }

      if (!existingUser) {
        console.log(clc.red('\nBenutzer nicht gefunden.\n'));
        return;
      }

      const newPassword = readlineSync.question('Neues Passwort (leer lassen, um das Passwort nicht zu ändern): ', { hideEchoBack: true });
      const isAdmin = readlineSync.question('Ist der Benutzer ein Administrator? (Ja/Nein): ');

      const hashedPassword = newPassword ? bcrypt.hashSync(newPassword, 10) : existingUser.password;
      const role = isAdmin.toLowerCase() === 'ja' ? 'admin' : 'mitglied';
      const newToken = generateToken(existingUser.id, existingUser.username, role);

      const updateTokenQuery = 'UPDATE users SET password = ?, token = ?, role = ? WHERE id = ?';
      const updateTokenValues = [hashedPassword, newToken, role, existingUser.id];

      db.run(updateTokenQuery, updateTokenValues, (error) => {
        if (error) {
          console.error(clc.red('\n[ERROR] | » Fehler beim Aktualisieren des Benutzers:', error.message));
          return;
        }

        console.log(clc.whiteBright(`\nBenutzer aktualisiert!\nDas neue Login-Token lautet: ${newToken}\n`));
      });
    });
  });
} catch (error) {
  console.error(clc.red('[ERROR] | » Fehler:', error.message));
}