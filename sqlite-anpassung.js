const sqlite3 = require('sqlite3').verbose();

const dbPath = './datenbank.sqlite';
const db = new sqlite3.Database(dbPath);

function renameTables() {
  db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Fehler beim Abrufen der Tabellennamen:', err.message);
        return;
      }

      tables.forEach(table => {
        const oldName = table.name;
        const newName = oldName.replace(/^public\./, '');

        if (newName !== oldName) {
          const renameQuery = `ALTER TABLE "${oldName}" RENAME TO "${newName}"`;

          db.run(renameQuery, err => {
            if (err) {
              console.error(`Fehler beim Umbenennen der Tabelle ${oldName}:`, err.message);
            } else {
              console.log(`Tabelle ${oldName} erfolgreich in ${newName} umbenannt`);
            }
          });
        }
      });
    });
  });
}

renameTables();
console.log('Die Datenbank ist nun bereit!')