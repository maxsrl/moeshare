const mysql = require('mysql');
const bcrypt = require('bcrypt');
const readlineSync = require('readline-sync');
const config = require('./config');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const { databaseHost, databasePort, databaseUser, databasePassword, databaseDatabase, jwttoken } = config;

const uploadsFolderPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsFolderPath)) {
  fs.mkdirSync(uploadsFolderPath);
  console.log('Uploads-Ordner wurde erstellt.');
}

const connection = mysql.createConnection({
  host: databaseHost,
  port: databasePort,
  user: databaseUser,
  password: databasePassword,
  database: databaseDatabase
});

connection.connect();

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    role ENUM('mitglied', 'admin') NOT NULL DEFAULT 'mitglied'
  )
`;

connection.query(createTableQuery, function (error, results, fields) {
  if (error) throw error;
});

const generateToken = (id, username, role) => {
  const payload = {
    id,
    username,
    role
  };
  const token = jwt.sign(payload, jwttoken);
  return token;
};

const run = async () => {
  console.log('\nBitte geben Sie die folgenden Informationen ein, um einen neuen Benutzer zu erstellen.\nNutze beim Passwort keine Sonderzeichen!\n');

  const username = readlineSync.question('Benutzername: ');
  const password = readlineSync.question('Passwort: ', { hideEchoBack: true });
  const isAdmin = readlineSync.question('Ist der Benutzer ein Administrator? (Ja/Nein): ');

  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUserQuery, [username], async function (error, results, fields) {
    if (error) throw error;

    if (results.length > 0) {
      console.log('\nDieser Benutzername ist bereits vergeben.\nBitte versuche es mit einem anderen Benutzernamen.\n');
      connection.end();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = isAdmin.toLowerCase() === 'ja' ? 'admin' : 'mitglied';
    const token = generateToken(1, username, role);
    const insertUserQuery = 'INSERT INTO users (username, password, token, role) VALUES (?, ?, ?, ?)';
    connection.query(insertUserQuery, [username, hashedPassword, token, role], function (error, results, fields) {
      if (error) throw error;

      const userFolderPath = path.join(__dirname, 'uploads', username);
      fs.mkdirSync(userFolderPath);

      console.log('\nBenutzer erstellt!\nDein Login-Token lautet: ' + token + '\n');
      connection.end();
    });
  });
};

run();