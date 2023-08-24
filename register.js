const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const readlineSync = require('readline-sync');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();
const { JWT_TOKEN, DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_DATABASE } = process.env

const uploadsFolderPath = path.join(__dirname, 'uploads');

(async () => {
  try {
    if (!await fs.stat(uploadsFolderPath).catch(() => null)) {
      await fs.mkdir(uploadsFolderPath);
      console.log('Uploads-Ordner wurde erstellt.');
    }

    const connection = await mysql.createConnection({
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      user: DATABASE_USER,
      password: DATABASE_PASSWORD,
      database: DATABASE_DATABASE
    });

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        role ENUM('mitglied', 'admin') NOT NULL DEFAULT 'mitglied'
      )
    `;

    await connection.execute(createTableQuery);

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

    const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length > 0) {
      console.log('\nDieser Benutzername ist bereits vergeben.\nBitte versuche es mit einem anderen Benutzernamen.\n');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = isAdmin.toLowerCase() === 'ja' ? 'admin' : 'mitglied';
      const token = generateToken(1, username, role);

      await connection.execute('INSERT INTO users (username, password, token, role) VALUES (?, ?, ?, ?)', [username, hashedPassword, token, role]);

      const userFolderPath = path.join(__dirname, 'uploads', username);
      await fs.mkdir(userFolderPath);

      console.log('\nBenutzer erstellt!\nDein Login-Token lautet: ' + token + '\n');
    }

    connection.end();
  } catch (error) {
    console.error('Fehler:', error);
  }
})();