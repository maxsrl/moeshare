const bcrypt = require('bcrypt');
const readlineSync = require('readline-sync');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

require('dotenv').config();
const { JWT_TOKEN, DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_DATABASE } = process.env;

const uploadsFolderPath = path.join(__dirname, 'uploads');

(async () => {
  try {
    if (!await fs.stat(uploadsFolderPath).catch(() => null)) {
      await fs.mkdir(uploadsFolderPath);
      console.log('Uploads-Ordner wurde erstellt.');
    }

    const pgClient = new Client({
      user: DATABASE_USER,
      host: DATABASE_HOST,
      database: DATABASE_DATABASE,
      password: DATABASE_PASSWORD,
      port: DATABASE_PORT
    });

    await pgClient.connect();

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL DEFAULT 'mitglied'
      )
    `;

    await pgClient.query(createTableQuery);

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
    const password = readlineSync.question('Passwort: ', { hideEchoBack: true });
    const isAdmin = readlineSync.question('Ist der Benutzer ein Administrator? (Ja/Nein): ');

    const existingUserQuery = 'SELECT * FROM users WHERE username = $1';
    const existingUserValues = [username];
    const { rows: existingUsers } = await pgClient.query(existingUserQuery, existingUserValues);

    if (existingUsers.length > 0) {
      console.log('\nDieser Benutzername ist bereits vergeben.\nBitte versuche es mit einem anderen Benutzernamen.\n');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = isAdmin.toLowerCase() === 'ja' ? 'admin' : 'mitglied';
      const token = generateToken(1, username, role);

      const insertUserQuery = 'INSERT INTO users (username, password, token, role) VALUES ($1, $2, $3, $4)';
      const insertUserValues = [username, hashedPassword, token, role];
      await pgClient.query(insertUserQuery, insertUserValues);

      const userFolderPath = path.join(__dirname, 'uploads', username);
      await fs.mkdir(userFolderPath);

      console.log('\nBenutzer erstellt!\nDein Login-Token lautet: ' + token + '\n');
    }

    await pgClient.end();
  } catch (error) {
    console.error('Fehler:', error);
  }
})();