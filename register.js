const bcrypt = require('bcrypt');
const readlineSync = require('readline-sync');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

require('dotenv').config();
const { JWT_TOKEN } = process.env;

const db = new sqlite3.Database('./db/datenbank.sqlite');

const uploadsFolderPath = path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(uploadsFolderPath)) {
    fs.mkdirSync(uploadsFolderPath);
    console.log('Uploads-Ordner wurde erstellt.');
  }

  db.serialize(() => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        token TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'mitglied'
      )
    `;

    db.run(createTableQuery);

    console.log('Tabelle "users" erfolgreich erstellt oder bereits vorhanden.');

    const generateToken = (id, username, role) => {
      const payload = {
        id,
        username,
        role
      };
      const token = jwt.sign(payload, JWT_TOKEN);
      return token;
    };

    console.log('\nBitte geben Sie die folgenden Informationen ein, um einen neuen Benutzer zu erstellen.\nNutze beim Passwort keine Sonderzeichen!\n');

    const username = readlineSync.question('Benutzername: ');

    const existingUserQuery = 'SELECT * FROM users WHERE username = ?';
    const existingUserValues = [username];

    db.get(existingUserQuery, existingUserValues, (err, existingUser) => {
      if (err) {
        console.error('\nFehler beim Überprüfen des Benutzernamens:', err);
        return;
      }

      if (existingUser) {
        console.log('\nDieser Benutzername ist bereits vergeben.\nBitte versuche es mit einem anderen Benutzernamen.\n');
      } else {
        const password = readlineSync.question('Passwort: ', { hideEchoBack: true });
        const isAdmin = readlineSync.question('Ist der Benutzer ein Administrator? (Ja/Nein): ');

        const hashedPassword = bcrypt.hashSync(password, 10);
        const role = isAdmin.toLowerCase() === 'ja' ? 'admin' : 'mitglied';
        const token = generateToken(1, username, role);

        const insertUserQuery = 'INSERT INTO users (username, password, token, role) VALUES (?, ?, ?, ?)';
        const insertUserValues = [username, hashedPassword, token, role];

        db.run(insertUserQuery, insertUserValues, (err) => {
          if (err) {
            console.error('\nFehler beim Einfügen des Benutzers:', err);
            return;
          }

          const userFolderPath = path.join(__dirname, 'uploads', username);
          fs.mkdirSync(userFolderPath);

          console.log('\nBenutzer erstellt!\nDein Login-Token lautet: ' + token + '\n');
        });
      }
    });
  });
} catch (error) {
  console.error('Fehler:', error);
}