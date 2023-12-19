const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Vibrant = require('node-vibrant');
const { removeMetadata, base64StringToArrayBuffer } = require('@qoocollections/content-metadata-remover');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { DateTime } = require('luxon');
const now = DateTime.now().setZone('Europe/Berlin');
const currentHour = now.hour;
const os = require('os');
const clc = require('cli-color');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const hls = require('hls-server');
const nocache = require('nocache');
const cookieParser = require('cookie-parser');
const sanitize = require('sanitize');

require('dotenv').config();
const { BASE_URL, PORT, JWT_TOKEN, SITE_TITLE, SITE_FAVICON, OG_TITLE, OG_DESCRIPTION, THEME_COLOR, FONT_COLOR, AUTHOR_URL, AUTHOR_NAME, PROVIDER_NAME, PROVIDER_URL, DOMINANT_COLOR_STATIC, BOX_SHADOW_COLOR, COPYRIGHT_TEXT, DISCORD_WEBHOOK_NAME, DISCORD_WEBHOOK_URL, DISCORD_WEBHOOK_SUCCESS_COLOR, DISCORD_WEBHOOK_ERROR_COLOR, REDIRECT_URL } = process.env
const AUDIO_FORMATS = process.env.AUDIO_FORMATS.split(',');
const VIDEO_FORMATS = process.env.VIDEO_FORMATS.split(',');
const IMAGE_FORMATS = process.env.IMAGE_FORMATS.split(',');
const USE_DOMINANT_COLOR = process.env.USE_DOMINANT_COLOR === 'true';
const REMOVE_METADATA = process.env.REMOVE_METADATA === 'true';
const USE_PREVIEW = process.env.USE_PREVIEW === 'true';
const USE_HLS = process.env.USE_HLS === 'true';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sanitize.middleware);

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

const localVersionPath = path.join(__dirname, 'package.json');
const localVersion = require(localVersionPath);

async function checkLatestVersion() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/maxsrl/moeshare/main/package.json');
        const remotePackageJson = response.data;
        const latestVersion = remotePackageJson.version;

        if (latestVersion !== localVersion.version) {
            console.log(clc.bold.magenta(`\n--------------------------------------------------------------------------------`));
            console.log(clc.magenta(`\n[UPDATE] | » Eine neue Version (${latestVersion}) von MoeShare ist verfügbar!`));
            console.log(clc.magenta(`             Die derzeitige Version lautet: ${localVersion.version}`));
            console.log(clc.bold.magenta(`             Prüfe auf neue Variable in der docker-compose.yml bzw. example.env!`));
            console.log(clc.bold.magenta(`\n--------------------------------------------------------------------------------`));
        } else {
            console.log(clc.magenta('[UPDATE] | » MoeShare ist auf dem neusten Stand!'));
        }
    } catch (error) {
      console.log(clc.red('[ERROR] | » Fehler beim Abrufen von package.json von GitHub:', error.message));
    }
}

checkLatestVersion();

app.get('/', (req, res) => {
  res.status(302).location(REDIRECT_URL).json({});
});

function parseColor(hexColor) {
  return parseInt(hexColor, 16);
}

const db = new sqlite3.Database('./db/datenbank.sqlite', (sqliteError) => {
  if (sqliteError) {
    console.error(clc.red('[ERROR] | » Fehler bei der Verbindung zur SQLite-Datenbank:', sqliteError));
  } else {
    console.log(clc.green('[INFO] | » Die Verbindung zur SQLite-Datenbank wurde erfolgreich hergestellt.'));

    const createTableQuery = `CREATE TABLE IF NOT EXISTS file_data (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      filename TEXT NOT NULL,
      creation_date TEXT NOT NULL,
      size_mb REAL NOT NULL,
      size_bytes INTEGER NOT NULL,
      dominant_color TEXT NOT NULL,
      resolution_width INTEGER NOT NULL,
      resolution_height INTEGER NOT NULL
    )`;

    db.run(createTableQuery, (error) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Erstellen der Tabelle "file_data":', error.message));
      } else {
        console.log(clc.yellow('[INFO] | » Tabelle "file_data" erfolgreich erstellt oder bereits vorhanden.'));
      }
    });
  }
});

let greeting;

if (currentHour >= 5 && currentHour < 12) {
    greeting = "Guten Morgen";
} else if (currentHour >= 12 && currentHour < 18) {
    greeting = "Guten Tag";
} else if (currentHour >= 18 && currentHour < 22) {
    greeting = "Guten Abend";
} else {
    greeting = "Gute Nacht";
}

function getFolderSizeAndFileCount(folderPath) {
  let folderSizeBytes = 0;
  let fileCount = 0;

  const calculateSize = (itemPath) => {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) {
      folderSizeBytes += stats.size;
      fileCount++;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach((item) => {
        calculateSize(path.join(itemPath, item));
      });
    }
  };

  calculateSize(folderPath);

  return { folderSizeBytes, fileCount };
}

const folderPath = './uploads';
const { folderSizeBytes, fileCount } = getFolderSizeAndFileCount(folderPath);
const folderSizeKb = folderSizeBytes / 1024;
const folderSizeMb = folderSizeKb / 1024;

const formatMemory = (bytes) => {
  const megabytes = bytes / (1024 * 1024);
  return megabytes.toFixed(2);
};

const freeMemory = os.freemem();
const totalMemory = os.totalmem();
const formattedFreeMemory = formatMemory(freeMemory);
const formattedTotalMemory = formatMemory(totalMemory);

console.log(clc.whiteBright(`\n`))
console.log(clc.bold.whiteBright(`-----------------------------------------------------------------------------------------------------`))
console.log(clc.bold.whiteBright(`${greeting}, Nutzer.`))
console.log(clc.bold.whiteBright(`Vielen Dank, dass du MoeShare (${localVersion.version}) nutzt!\n`))
console.log(clc.bold.whiteBright(`Hier kannst du die aktuellen Einstellungen sehen:`))
console.log(clc.whiteBright(`  - Diese Farbe wird anstelle der Dominanten Farbe genutzt: ${DOMINANT_COLOR_STATIC}`))
console.log(clc.whiteBright(`  - Wird Angewand, wenn die Datei kein Bild ist: ${BOX_SHADOW_COLOR}`))
console.log(clc.whiteBright(`  - Schriftfarbe: ${FONT_COLOR}\n`))
console.log(clc.whiteBright(`  - Erlaubte Audio-Formate:${AUDIO_FORMATS}`))
console.log(clc.whiteBright(`  - Erlaubte Video-Formate: ${VIDEO_FORMATS}`))
console.log(clc.whiteBright(`  - Erlaubte Bilder-Formate: ${IMAGE_FORMATS}\n`))
console.log(clc.whiteBright(`  - Soll die Dominante Farbe des Bildes genutzt werden? ${USE_DOMINANT_COLOR ? "✅" : "❌"}`))
console.log(clc.whiteBright(`  - Sollen die Metadaten der Datei gelöscht werden? ${REMOVE_METADATA ? "✅" : "❌"}`))
console.log(clc.whiteBright(`  - Soll ein Preview erstellt und genutzt werden? ${USE_PREVIEW  ? "✅" : "❌"}`))
console.log(clc.whiteBright(`  - Sollen Logs an die Discord-Webhook gesendet werden? ${process.env.LOGS  ? "✅" : "❌"}`))
console.log(clc.whiteBright(`  - Dürfen Fehler an Sentry für die Fehlerbehebung gesendet werden? ${process.env.ALLOW_METRICS  ? "✅" : "❌"}\n`))
console.log(clc.whiteBright(`  - Soll HLS für das Videostreaming verwendet werden? ${process.env.USE_HLS  ? "✅" : "❌"}\n`))
console.log(clc.bold.whiteBright(`Systemeigenschaften:`))
console.log(clc.whiteBright(`  - Hostname: ${os.hostname()}`))
console.log(clc.whiteBright(`  - Kernel-Typ: ${os.type()}`))
console.log(clc.whiteBright(`  - Kernel-Version: ${os.release()}\n`))
console.log(clc.whiteBright(`  - CPU-Architektur: ${os.arch()}`))
console.log(clc.whiteBright(`  - Anzahl der CPU-Kerne: ${os.cpus().length}\n`))
console.log(clc.whiteBright(`  - Arbeitsspeicher: ${formattedFreeMemory} MB / ${formattedTotalMemory} MB\n`))
console.log(clc.bold.whiteBright(`Uploadereigenschaften:`))
console.log(clc.whiteBright(`  - Domain: ${BASE_URL}`))
console.log(clc.whiteBright(`  - Speicherplatz verwendet: ${folderSizeKb.toFixed(2)} KB (${folderSizeMb.toFixed(2)} MB)`))
console.log(clc.whiteBright(`  - Insgesamte Dateien: ${fileCount}\n`))
console.log(clc.bold.whiteBright(`Wenn du Hilfe oder Probleme hast, melde sie unter https://github.com/maxsrl/moeshare/issues.`))
console.log(clc.bold.whiteBright(`-----------------------------------------------------------------------------------------------------\n\n`))

const createDirectoriesForAllUsers = async () => {
  try {
    const users = await getAllUsers();
    users.forEach(users => {
      const uploadPath = path.join(__dirname, 'uploads', users);
      fs.mkdirSync(uploadPath, { recursive: true });
    
      const userPreviewPath = path.join(uploadPath, 'preview');
      fs.mkdirSync(userPreviewPath, { recursive: true });

      const m3u8Path = path.join(uploadPath, 'm3u8');
      fs.mkdirSync(m3u8Path, { recursive: true });

      const prefix = 'conversionStarted-';
      fs.readdir(m3u8Path, (err, files) => {
        if (err) {
          console.error(clc.red('[INFO > Cleanup] | » Fehler beim Löschen der Unbeendete Aufgabe:', err));
          return;
        }
      
        for (const file of files) {
          if (file.startsWith(prefix)) {
            const baseName = file.slice(prefix.length);
            const matchingFiles = files.filter((f) => f.startsWith(baseName));
            
            matchingFiles.forEach((matchingFile) => {
              const filePath = path.join(m3u8Path, matchingFile);
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                  console.error(clc.red('[INFO > Cleanup] | » Fehler beim Löschen der Unbeendete Aufgabe:', filePathStarted, unlinkErr));
                } else {
                  console.log(clc.green('[INFO > Cleanup] | » Unbeendete Aufgabe wird gelöscht:', filePathStarted));
                }
              });
            });
            const filePathStarted = path.join(`${m3u8Path}/conversionStarted-${baseName}`);
            fs.unlink(filePathStarted, (unlinkErr) => {
              if (unlinkErr) {
                console.error(clc.red('[INFO > Cleanup] | » Fehler beim Löschen der Unbeendete Aufgabe:', filePathStarted, unlinkErr));

              } else {
                console.log(clc.green('[INFO > Cleanup] | » Unbeendete Aufgabe wird gelöscht:', filePathStarted));
              }
            });
          }
        }
      });
    });

    console.log(clc.yellow('[INFO] | » Alle Benutzerordner wurden erstellt oder bereits vorhanden.'));
    const webhookData = {
      embeds: [
        {
          title: 'System',
          description: 'Alle Benutzerordner wurden erfolgreich erstellt.',
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Erstellen der Benutzerordner:' + error.message));
    const webhookData = {
      embeds: [
        {
          title: 'System',
          description: 'Fehler beim Erstellen der Benutzerordner\n' + error.message,
          color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  }
};

const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT username FROM users';
    db.all(query, [], (error, rows) => {
      if (error) {
        reject(error);
      } else {
        const usernames = rows.map(row => row.username);
        resolve(usernames);
      }
    });
  });
};

createDirectoriesForAllUsers();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const username = req.user.username;
    const uploadPath = path.join(__dirname, 'uploads', username);
    fs.mkdirSync(uploadPath, { recursive: true });

    const userPreviewPath = path.join(__dirname, 'uploads', username, 'preview');
    fs.mkdirSync(userPreviewPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).single('file');

const getUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    const values = [username];

    db.get(query, values, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
};

const getUserByToken = (token) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM users WHERE token = ?';
    const values = [token];

    db.get(query, values, (error, row) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Abrufen des Benutzers aus der Datenbank:', error.message));
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
};

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Authentifizierungstoken fehlt!' });
  }

  try {
    const decoded = jwt.verify(token, JWT_TOKEN);
    req.user = decoded;

    const user = await getUserByUsername(decoded.username);
    if (!user || user.token !== token) {
      return res.status(401).json({ error: 'Ungültiges Token!' });
    }

    next();
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler bei der Authentifizierung:', error.message));
    res.status(401).json({ error: 'Ungültiges Token!' });
  }
};

const isAdmin = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentifizierung fehlgeschlagen' });
  }

  try {
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Ungültiges Token' });
    }

    if (user.role !== 'admin') {
      return res.redirect('/login');
    }

    next();
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler bei der Authentifizierung:', error.message));
    return res.status(500).json({ error: 'Serverfehler bei der Authentifizierung' });
  }
};

const TokenUsername = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Authentifizierung fehlgeschlagen' });
  }

  try {
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Ungültiges Token' });
    }

    const username = user.username;
    req.TokenUsername = username;

    next();
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler bei der Authentifizierung:', error.message));
    return res.status(500).json({ error: 'Serverfehler bei der Authentifizierung' });
  }
};

const checkToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  db.get('SELECT * FROM users WHERE token = ?', [token], (err, row) => {
    if (err || !row) {
      return res.redirect('/login');
    }
    req.username = row.username;
    next();
  });
};

if (process.env.USE_DASHBOARD === 'true') {
  const comparePasswords = (password, hash) => {
    return bcrypt.compareSync(password, hash);
  };

  const checkAuthentication = (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
      return res.redirect("/dashboard");
    }
    next();
  };

  app.get("/login", checkAuthentication, (req, res) => {
    res.render("login", {
      SITE_FAVICON,
      OG_DESCRIPTION,
      OG_TITLE,
      SITE_TITLE,
      localVersion,
    });
  });

  app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
  });

  app.post("/login", (req, res) => {
    const token = req.bodyString('token'); // Sanitize the token as a string
  
    // Set the sanitized token in the "token" cookie
    res.cookie("token", token);
  
    db.get("SELECT * FROM users WHERE token = ?", [token], (err, row) => {
      if (err || !row) {
        return res.status(401).json({ message: "Ungültiger Token" });
      }
  
      res.redirect("/dashboard");
    });
  });

  app.get("/dashboard", checkToken, (req, res) => {
    const username = req.username;
    const directoryPath = `uploads/${username}/`;
    const getUsersCountQuery = "SELECT COUNT(*) as userCount FROM users";

    db.get(getUsersCountQuery, [], (err, row) => {
      if (err) {
        console.error(clc.red("[ERROR] | » Fehler bei der Abfrage der Nutzeranzahl:", err));
        return res.status(500).json({ error: "Interner Serverfehler" });
      }

      const numberOfUsers = row.userCount;

      fs.readdir(directoryPath, (err, files) => {
        if (err) {
          console.error(clc.red("\n[ERROR] | » Fehler beim Lesen des Verzeichnisses:", err));
          return res.status(500).json({ error: "Interner Serverfehler" });
        }

        const fileNames = files.filter((file) =>
          fs.statSync(`${directoryPath}/${file}`).isFile()
        );

        const numberOfFiles = fileNames.length;
        let totalSpaceUsed = 0;

        fileNames.forEach((file) => {
          const stats = fs.statSync(`${directoryPath}/${file}`);
          totalSpaceUsed += stats.size;
        });

        totalSpaceUsed = (totalSpaceUsed / (1024 * 1024)).toFixed(2);

        res.render("dashboard", {
          username,
          files: fileNames,
          greeting,
          numberOfFiles,
          totalSpaceUsed,
          numberOfUsers,
          BASE_URL,
          SITE_FAVICON,
          OG_DESCRIPTION,
          OG_TITLE,
          SITE_TITLE,
          localVersion,
        });
      });
    });
  });

  app.get("/api/data", checkToken, (req, res) => {
    const username = req.username;
    const directoryPath = `uploads/${username}/`;
    const page = req.query.page || 1;
    const itemsPerPage = 20;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;

    function listFileNames() {
      const filesAndDirs = fs.readdirSync(directoryPath);
      const fileNames = [];

      for (const item of filesAndDirs) {
        const itemPath = path.join(directoryPath, item);

        if (fs.statSync(itemPath).isFile()) {
          fileNames.push(item);
        }
      }

      return fileNames.slice(startIndex, endIndex);
    }

    function countFilesWithoutFolders(directoryPath) {
      const filesAndDirs = fs.readdirSync(directoryPath);
      let fileCount = 0;

      for (const item of filesAndDirs) {
        const itemPath = path.join(directoryPath, item);

        if (fs.statSync(itemPath).isFile()) {
          fileCount++;
        }
      }

      return fileCount;
    }

    const fileNames = listFileNames();
    const totalItems = countFilesWithoutFolders(directoryPath);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNextPage = page < totalPages;

    res.json({
      totalItems: totalItems,
      itemsPerPage: itemsPerPage,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: hasNextPage,
      data: fileNames,
    });
  });

  app.get("/admin", checkToken, isAdmin, (req, res) => {
    const username = req.username;
    const searchUserTerm = req.query.searchUser;
    const searchFileTerm = req.query.searchFile;

    let queryUser = "SELECT * FROM users";
    let queryFile = "SELECT * FROM file_data";

    if (searchUserTerm) {
      queryUser += ` WHERE username LIKE '%${searchUserTerm}%'`;
    }

    if (searchFileTerm) {
      queryFile += ` WHERE filename LIKE '%${searchFileTerm}%'`;
    }

    function getFolderSizeAndFileCount(folderPath) {
      let folderSizeBytes = 0;
      let numberOfFiles = 0;

      const calculateSize = (itemPath) => {
        const stats = fs.statSync(itemPath);
        if (stats.isFile()) {
          folderSizeBytes += stats.size;
          numberOfFiles++;
        } else if (stats.isDirectory()) {
          const items = fs.readdirSync(itemPath);
          items.forEach((item) => {
            calculateSize(path.join(itemPath, item));
          });
        }
      };

      calculateSize(folderPath);

      return { folderSizeBytes, numberOfFiles };
    }

    const folderPath = "./uploads";
    const { folderSizeBytes, numberOfFiles } =
      getFolderSizeAndFileCount(folderPath);
    const folderSizeKb = folderSizeBytes / 1024;
    const folderSizeMb = folderSizeKb / 1024;

    const uploadDirectory = path.join(__dirname, "uploads");
    fs.readdir(uploadDirectory, (err, files) => {
      if (err) {
        return res.status(500).send(err);
      }

      const getUsersCountQuery = "SELECT COUNT(*) as userCount FROM users";

      db.get(getUsersCountQuery, [], (err, row) => {
        if (err) {
          console.error(clc.red("\n[ERROR] | » Fehler bei der Abfrage der Nutzeranzahl:", err));
          return res.status(500).json({ error: "Interner Serverfehler" });
        }

        const numberOfUsers = row.userCount;

        db.all(queryUser, (err, userRows) => {
          if (err) {
            return res.status(500).send(err);
          }

          db.all(queryFile, (err, fileRows) => {
            if (err) {
              return res.status(500).send(err);
            }

            res.render("admin", {
              username,
              users: userRows,
              file_data: fileRows,
              greeting,
              numberOfFiles,
              folderSizeMb,
              numberOfUsers,
              SITE_FAVICON,
              OG_DESCRIPTION,
              OG_TITLE,
              SITE_TITLE,
              localVersion,
            });
          });
        });
      });
    });
  });
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const notFoundPage = `<!DOCTYPE HTML>
<html lang="de-DE">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 » ${SITE_TITLE} </title>
        <meta property="og:title" content="${OG_TITLE}">
        <meta property="og:description" content="${OG_DESCRIPTION}">
        <meta name="og:locale" content="de_DE" />
        <link rel="icon" href="${SITE_FAVICON}" type="image/png" />
        <style>
            body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0e0e0e;
            margin: 0;
            font-family: Arial, sans-serif;
            animation: bgAnimation 5s infinite alternate;
            }
            .button-container {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            }
            .button {
            width: 220px;
            height: 50px;
            font-size: 15px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            border: none;
            outline: none;
            color: #fff;
            background: #111;
            cursor: pointer;
            position: relative;
            z-index: 0;
            border-radius: 10px;
            }
            .button:before {
            content: '';
            background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
            position: absolute;
            top: -2px;
            left:-2px;
            background-size: 400%;
            z-index: -1;
            filter: blur(5px);
            width: calc(100% + 4px);
            height: calc(100% + 4px);
            animation: glowing 20s linear infinite;
            opacity: 0;
            transition: opacity .3s ease-in-out;
            border-radius: 10px;
            }
            .button:active {
            color: #000
            }
            .button:active:after {
            background: transparent;
            }
            .button:hover:before {
            opacity: 1;
            }
            .button:after {
            z-index: -1;
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: #111;
            left: 0;
            top: 0;
            border-radius: 10px;
            }
            @keyframes glowing {
            0% { background-position: 0 0; }
            50% { background-position: 400% 0; }
            100% { background-position: 0 0; }
            }
            .text {
            font-size: 2rem;
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: transparent;
            text-align: center;
            -webkit-background-clip: text;
            background-clip: text;
            background-image: linear-gradient(to right, #3B82F6, #A855F7, #F43F5E);
            }
            .copyright {
            position: absolute;
            bottom: 10px;
            font-size: 15px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: ${FONT_COLOR};
            text-align: center;
            }
            .version {
              position: absolute;
              top: 10px;
              left: 10px;
              font-size: 15px;
              font-family: Arial, sans-serif;
              font-weight: bold;
              color: ${FONT_COLOR};
              }
            a {
            color: ${FONT_COLOR};
            }
        </style>
    </head>
    <body>
        <h1 class="text">Diese Datei existiert nicht!</h1>
        <br>
        <div class="button-container">
            <button class="button" type="button" onclick="javascript:history.back()">Zurück</button>
        </div>
        <div class="copyright">
          ${COPYRIGHT_TEXT}
        </div>
        <div class="version">
          V. ${localVersion.version}</br>
      </div>
    </body>
</html>`;

app.post('/upload', authenticate, upload, TokenUsername, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen!' });
  }

  const filename = req.file.filename;
  const userUploadsPath = path.join(__dirname, 'uploads', req.TokenUsername);
  const filePath = path.join(userUploadsPath, filename);
  const previewPath = path.join(userUploadsPath, 'preview', filename);
  const m3u8Path = path.join(userUploadsPath, 'm3u8', filename.split('.')[0]);
  const m3u8PathWithoutFilename = path.join(userUploadsPath, 'm3u8');

  if (USE_PREVIEW && IMAGE_FORMATS.some(format => filename.endsWith(format))) {
    await sharp(filePath)
      .webp({ quality: 50 })
      .toFile(previewPath);
  }

  if (REMOVE_METADATA) {
    await removeMetadataFromImage(filePath);
  } else {
    console.log(clc.yellow('[INFO] | » Metadatenentfernung deaktiviert.'));
  }

  res.json({
    success: true,
    file: `${process.env.BASE_URL}/uploads/${req.TokenUsername}/${filename}`,
    view: `${process.env.BASE_URL}/view/${filename}`,
    preview: (USE_PREVIEW && IMAGE_FORMATS.some(format => filename.endsWith(format)))
      ? `${process.env.BASE_URL}/uploads/${req.TokenUsername}/preview/${filename}`
      : `${process.env.BASE_URL}/uploads/${req.TokenUsername}/${filename}`,
    delete: `${process.env.BASE_URL}/delete/${filename}`,
  });

  const COLOR_COUNT = 256;
  const QUALITY = 3;

  const extractDominantColor = (filePath) => {
    return new Promise((resolve, reject) => {
      const imageMimeType = getMimeType(filePath);
      if (!isImageMimeType(imageMimeType)) {
        resolve('#ffffff');
        return;
      }

      Vibrant.from(filePath)
        .maxColorCount(COLOR_COUNT)
        .quality(QUALITY)
        .getPalette()
        .then(palette => {
          const dominantColor = palette.Vibrant.hex;
          resolve(dominantColor);
        })
        .catch(error => {
          console.error(clc.red('[ERROR] | » Fehler beim Extrahieren der Farbe:', error.message));
          reject(error);
        });
    });
  };

  function isImageMimeType(mimeType) {
    return mimeType.startsWith('image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/bmp', 'image/tiff');
  }

  const getMimeType = (filePath) => {
    const mime = require('mime-types');
    const mimeType = mime.lookup(filePath);
    return mimeType;
  };

let dominantColor;
if (USE_DOMINANT_COLOR === true) {
  dominantColor = await extractDominantColor(filePath);
} else {
  dominantColor = DOMINANT_COLOR_STATIC;
}

  const fileStats = fs.statSync(filePath);
  const creationDate = fileStats.birthtime.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Berlin'
  });

  const isImage = IMAGE_FORMATS.some(format => filename.endsWith(format)) || filename.endsWith('.gif');
  const isVideo = VIDEO_FORMATS.some(format => filename.endsWith(format));

  let resolution;
  
  if (isImage) {
    try {
      resolution = await getImageResolution(filePath);
    } catch (error) {
      console.error(clc.red('[ERROR] | » Fehler beim Ermitteln der Bildauflösung:', error.message));
      resolution = { width: 0, height: 0 };
    }
  } else if (isVideo) {
    try {
      resolution = await getVideoResolution(filePath);
    } catch (error) {
      console.error(clc.red('[ERROR] | » Fehler beim Ermitteln der Videoauflösung:', error.message));
      resolution = { width: 0, height: 0 };
    }
  } else {
    resolution = { width: 0, height: 0 };
  }
  
  if (isVideo && USE_HLS) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    fs.writeFileSync(`${m3u8PathWithoutFilename}/conversionStarted-${filename.split('.')[0]}`, '');

    const ffmpegProcess = ffmpeg(filePath, { timeout: 432000 })
      .addOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(m3u8Path + '.m3u8')
      .on('end', () => {
        console.log(clc.green('[INFO] | » Video wurde erfolgreich umgewandelt.'));
        fs.unlink(`${m3u8PathWithoutFilename}/conversionStarted-${filename.split('.')[0]}`, (err) => {
          if (err) {
            console.error(clc.red('[ERROR] | » Fehler beim Löschen der conversionStarted-Datei:', err));        
          } else {}
        });
        fs.writeFileSync(`${m3u8PathWithoutFilename}/conversionComplete-${filename.split('.')[0]}`, '');
      })
      .on('error', (err, stdout, stderr) => {
        console.error(clc.red('[ERROR] | » FFmpeg Fehler:', err));        
        console.error(clc.red('[ERROR] | » FFmpeg STDERR:', stderr));
      });
    
    ffmpegProcess.run();
  }

  function getVideoResolution(filePath) {
    return new Promise((resolve, reject) => {
      ffprobe(filePath, { path: ffprobeStatic.path }, (error, info) => {
        if (error) {
          reject(error);
        } else {
          const videoStream = info.streams.find(stream => stream.codec_type === 'video');
          if (!videoStream) {
            reject(new Error(clc.red('[ERROR] | » Kein Video-Stream gefunden!')));
          } else {
            const { width, height } = videoStream;
            resolve({ width, height });
          }
        }
      });
    });
  }

  async function getImageResolution(filePath) {
    const metadata = await sharp(filePath).metadata();
    return { width: metadata.width, height: metadata.height };
  }

  const sizeInBytes = fileStats.size;
  const sizeInMB = parseFloat((sizeInBytes / (1024 * 1024)).toFixed(3));

  const saveFileDataToDatabase = async (username, filename, creationDate, sizeInMB, sizeInBytes, dominantColor, resolution) => {
    const query = 'INSERT INTO file_data (username, filename, creation_date, size_mb, size_bytes, dominant_color, resolution_width, resolution_height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [username, filename, creationDate, sizeInMB, sizeInBytes, dominantColor, resolution.width, resolution.height];
  
    db.run(query, values, async (error) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Speichern der Dateidaten in die Datenbank:', error.message));
  
        const webhookData = {
          embeds: [
            {
              title: 'Neue Datei hochgeladen',
              description: 'Fehler beim Speichern der Dateidaten in die Datenbank\n' + error.message,
              color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
            }
          ],
          username: DISCORD_WEBHOOK_NAME,
        };
  
        if (process.env.LOGS !== 'false') {
          try {
            await axios.post(DISCORD_WEBHOOK_URL, webhookData);
          } catch (error) {
            console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
          }
        }
      } else {
        console.log(clc.green('[INFO] | » Dateidaten erfolgreich in die Datenbank gespeichert.'));
  
        const webhookData = {
          embeds: [
            {
              title: 'Neue Datei hochgeladen',
              description: 'Dateidaten erfolgreich in die Datenbank gespeichert.',
              color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
            }
          ],
          username: DISCORD_WEBHOOK_NAME,
        };
  
        if (process.env.LOGS !== 'false') {
          try {
            await axios.post(DISCORD_WEBHOOK_URL, webhookData);
          } catch (error) {
            console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
          }
        }
      }
    });
  };
  
  saveFileDataToDatabase(req.user.username, filename, creationDate, sizeInMB, sizeInBytes, dominantColor, resolution);
  const webhookData = {
    embeds: [
      {
        title: 'Neue Datei hochgeladen',
        description: `Dateiname: **${filename}**\nURL: **${BASE_URL}/view/${filename}**\nBenutzername: **${req.user.username}**\nGröße: **${sizeInMB} MB**\nAuflösung: **${resolution.width}x${resolution.height}**\nHauptfarbe: **${dominantColor}**`,
        color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
      }
    ],
    username: DISCORD_WEBHOOK_NAME,
  };

  if (process.env.LOGS !== 'false') {
    try {
      await axios.post(DISCORD_WEBHOOK_URL, webhookData);
    } catch (error) {
      console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
    }
  }
});

const removeMetadataFromImage = async (filePath) => {
  const read = async (size, offset) => {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'r', (error, fd) => {
        if (error) {
          reject(error);
        } else {
          const buffer = Buffer.alloc(size);
          fs.read(fd, buffer, 0, size, offset, (error, bytesRead, buffer) => {
            if (error) {
              reject(error);
            } else {
              resolve(base64StringToArrayBuffer(buffer.toString('base64')));
            }
            fs.close(fd, () => { });
          });
        }
      });
    });
  };

  const write = async (writeValue, entryOffset, encoding) => {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'r+', (error, fd) => {
        if (error) {
          reject(error);
        } else {
          const buffer = Buffer.from(writeValue, encoding);
          fs.write(fd, buffer, 0, buffer.length, entryOffset, (error, bytesWritten, buffer) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
            fs.close(fd, () => { });
          });
        }
      });
    });
  };

  try {
    await removeMetadata(filePath, read, write);
    console.log(clc.green('[INFO] | » Metadaten erfolgreich entfernt.'));
    const webhookData = {
      embeds: [
        {
          title: 'Neue Datei hochgeladen',
          description: 'Metadaten erfolgreich entfernt.',
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Entfernen der Metadaten:', error.message));
    const webhookData = {
      embeds: [
        {
          title: 'Neue Datei hochgeladen',
          description: 'Fehler beim Entfernen der Metadaten!\nFehler:' + error.message,
          color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  }
};

const getFileDataFromDatabase = async (username, filename) => {
  return new Promise(async (resolve, reject) => {
    const query = 'SELECT * FROM file_data WHERE username = ? AND filename = ?';
    const values = [username, filename];

    db.all(query, values, async (error, rows) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Dateidaten aus der Datenbank:', error.message));

        const webhookData = {
          embeds: [
            {
              title: 'Dateidaten abgerufen',
              description: 'Fehler beim Abrufen der Dateidaten aus der Datenbank\n' + error.message,
              color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
            }
          ],
          username: DISCORD_WEBHOOK_NAME,
        };

        if (process.env.LOGS !== 'false') {
          try {
            await axios.post(DISCORD_WEBHOOK_URL, webhookData);
          } catch (error) {
            console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
          }
        }
        reject(error);
      } else {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
};

const getFileByFilename = async (filename) => {
  return new Promise(async (resolve, reject) => {
    const query = 'SELECT * FROM file_data WHERE filename = ?';
    const values = [filename];

    db.all(query, values, async (error, rows) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Dateidaten aus der Datenbank:', error.message));
        reject(error);
      } else {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
};

app.use(nocache());
app.get('/view/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
    const file = await getFileByFilename(filename);

    if (!file) {
      return res.status(404).send(notFoundPage);
    }
    const username = file.username;

    const filePath = path.join(__dirname, 'uploads', username, filename);
    fs.access(filePath, fs.constants.F_OK, (error) => {
      if (error) {
        return res.status(404).send(notFoundPage);
      }
      let filename = req.params.filename;
      let filePath = path.join(__dirname, 'uploads', username, filename);
      let previewPath = path.join(__dirname, 'uploads', username, 'preview', filename);
      let isConversionStartedFile = path.join(__dirname, 'uploads', username, 'm3u8', 'conversionStarted-' + filename.split('.')[0]);
      let isConversionCompleteFile = path.join(__dirname, 'uploads', username, 'm3u8', 'conversionComplete-' + filename.split('.')[0]);
      let isConversionStarted = false;
      let isConversionComplete = false;

      fs.access(filePath, fs.constants.F_OK, (error) => {
        if (error) {
          return res.status(404).send(notFoundPage);
        }

        fs.access(isConversionStartedFile, fs.constants.F_OK, (err) => {
          if (err) {
            isConversionStarted = false;
          } else {
            isConversionStarted = true;
          }
        });

        fs.access(isConversionCompleteFile, fs.constants.F_OK, (err) => {
          if (err) {
            isConversionComplete = false;
          } else {
            isConversionComplete = true;
          }
        });

        getFileDataFromDatabase(username, filename)
          .then(fileData => {
            if (!fileData) {
              return res.status(404).send({ error: 'Keine Dateiinformationen in der Datenbank gefunden!' });
            }

            const sizeInMB = fileData.size_mb
            const creationDate = fileData.creation_date.toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'Europe/Berlin'
            });

            const resolution = `${fileData.resolution_width}x${fileData.resolution_height}`;
            const resolutionHTML = fileData.resolution_width !== 0 && fileData.resolution_height !== 0 ? `Auflösung: ${resolution}` : '';

            const isImage = IMAGE_FORMATS.some(format => filename.endsWith(format)) || filename.endsWith('.gif');
            const isImageWithGif = IMAGE_FORMATS.some(format => filename.endsWith(format));
            const isAudio = AUDIO_FORMATS.some(format => filename.endsWith(format));
            const isVideo = VIDEO_FORMATS.some(format => filename.endsWith(format));
            
            let videoHLSText = '';

            if (USE_HLS && isConversionStarted) {
              videoHLSText = `
       <div class="hls-text">
           Das Video wird derzeit noch Konvertiert.
           </br>Fallback auf .mp4 wird genutzt.
       </div>
       </br>`;
            } else if (isConversionComplete) {
              videoHLSText = ``
            } else {
              videoHLSText = ``
            }

            let video = '';

            if (isConversionComplete && USE_HLS) {
              video = `
             <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
              <video id="video" controls></video>
              <script>
                  var video = document.getElementById('video');
                  var videoSrc = '/uploads/${username}/m3u8/${filename.split('.')[0]}.m3u8';
                  if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = videoSrc;
                  } else if (Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(videoSrc);
                    hls.attachMedia(video);
                  }
                </script>`;
           } else {
              video = `<video controls>
              <source src="/uploads/${username}/${filename}" width=${fileData.resolution_width} height=${fileData.resolution_height}>
              </video>`;
            }

            let metaTag = '';

            if (isImage) {
              metaTag = `<meta property="og:image" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:type" content="image.other"/>
        <meta property="og:image" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:image:secure_url" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:image:type" content="image.other" />
        <meta property="og:image:alt" content="BILD" />
        <meta property="og:image:width" content="${fileData.resolution_width}" />
        <meta property="og:image:height" content="${fileData.resolution_height}" />
        <meta name="twitter:card" content="summary_large_image">`;
            } else if (isVideo) {
              metaTag = `<meta property="og:video" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:video:secure_url" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:type" content="video.other"/>
        <meta property="og:video:width" content="${fileData.resolution_width}" />
        <meta property="og:video:height" content="${fileData.resolution_height}" />`;
            } else if (isAudio) {
              metaTag = `<meta property="og:audio" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:audio:secure_url" content="${BASE_URL}/uploads/${username}/${filename}" />
        <meta property="og:audio:type" content="audio.other" />`;
            }

            let themeColor = '#ffffff';

            if (THEME_COLOR.includes('&dominantColor')) {
              const dominantColor = fileData ? fileData.dominant_color : null;
              themeColor = dominantColor;
            } 
            else if (THEME_COLOR.includes('&random')) {
              function getRandomHexCode() {
                const characters = "0123456789ABCDEF";
                let hexCode = "#";
              
                for (let i = 0; i < 6; i++) {
                  const randomIndex = Math.floor(Math.random() * characters.length);
                  hexCode += characters.charAt(randomIndex);
                }
              
                return hexCode;
              }
              
              const randomHexCode = getRandomHexCode();
              themeColor = randomHexCode;
            } else {
              themeColor = THEME_COLOR;
            }

            if (isImageWithGif) {
              getFileDataFromDatabase(username, filename)
                .then(fileData => {
                  const dominantColor = fileData ? fileData.dominant_color : null;
                  const cssCode = `box-shadow: 0px 60px 100px 0px ${dominantColor}, 0px 45px 26px 0px rgba(0,0,0,0.14);`;
                  sendHtmlResponse(cssCode);
                })
                .catch(async error => {
                  console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Dateidaten aus der Datenbank:', error.message));
                  const webhookData = {
                    embeds: [
                      {
                        title: 'Neue Datei hochgeladen',
                        description: 'Fehler beim Abrufen der Dateidaten aus der Datenbank\n' + error.message,
                        color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
                      }
                    ],
                    username: DISCORD_WEBHOOK_NAME,
                  };

                  if (process.env.LOGS !== 'false') {
                    try {
                      await axios.post(DISCORD_WEBHOOK_URL, webhookData);
                    } catch (error) {
                      console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
                    }
                  }

                  const cssCode = `box-shadow: 0px 60px 100px 0px #${BOX_SHADOW_COLOR}, 0px 45px 26px 0px rgba(0,0,0,0.14);`;
                  sendHtmlResponse(cssCode);
                });
            } else {
              const cssCode = `box-shadow: 0px 60px 100px 0px #${BOX_SHADOW_COLOR}, 0px 45px 26px 0px rgba(0,0,0,0.14);`;
              sendHtmlResponse(cssCode);
            }

            function sendHtmlResponse(cssCode) {
              const htmlResponse = `<!DOCTYPE HTML>
<html lang="de-DE">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${SITE_TITLE}</title>
        ${metaTag}
        <meta property="og:title" content="${OG_TITLE}">
        <meta property="og:description" content="${OG_DESCRIPTION}">
        <meta name="theme-color" content="${themeColor}">
        <meta name="og:locale" content="de_DE" />
        <link rel="icon" href="${SITE_FAVICON}" type="image/png" />
        <link href="${BASE_URL}/oembed/${filename}" title="oEmbed" rel="alternate" type="application/json+oembed" />
        <style>
            body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0e0e0e;
            margin: 0;
            font-family: Arial, sans-serif;
            animation: bgAnimation 5s infinite alternate;
            }
            .file-container {
            position: relative;
            max-width: 50%;
            width: auto;
            animation: rainbow 10s linear infinite;
            border-radius: 10px;
            ${cssCode}
            }
            img,
            video {
            width: 100%;
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 10px;
            max-height: 50vh;
            }
            .button-container {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            }
            .button {
            width: 220px;
            height: 50px;
            font-size: 15px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            border: none;
            outline: none;
            color: #fff;
            background: #343540;
            cursor: pointer;
            position: relative;
            z-index: 0;
            border-radius: 10px;
            }
            .button:before {
            content: '';
            background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
            position: absolute;
            top: -2px;
            left:-2px;
            background-size: 400%;
            z-index: -1;
            filter: blur(5px);
            width: calc(100% + 4px);
            height: calc(100% + 4px);
            animation: glowing 20s linear infinite;
            opacity: 0;
            transition: opacity .3s ease-in-out;
            border-radius: 10px;
            }
            .button:active {
            color: #000
            }
            .button:active:after {
            background: transparent;
            }
            .button:hover:before {
            opacity: 1;
            }
            .button:after {
            z-index: -1;
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: #111;
            left: 0;
            top: 0;
            border-radius: 10px;
            }
            @keyframes glowing {
            0% { background-position: 0 0; }
            50% { background-position: 400% 0; }
            100% { background-position: 0 0; }
            }
            .filename {
            font-size: 2rem;
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: transparent;
            text-align: center;
            -webkit-background-clip: text;
            background-clip: text;
            background-image: linear-gradient(to right, #3B82F6, #A855F7, #F43F5E);
            }
            .stats {
            font-size: 20px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: ${FONT_COLOR};
            text-align: center;
            margin-top: 65px;
            }
            .version {
              position: absolute;
              top: 10px;
              left: 10px;
              font-size: 15px;
              font-family: Arial, sans-serif;
              font-weight: bold;
              color: ${FONT_COLOR};
            }
            .hls-text {
              top: 30px
              position: absolute;
              font-size: 15px;
              font-family: Arial, sans-serif;
              font-weight: bold;
              color: ${FONT_COLOR};
              text-align: center;

            }
            .copyright {
            position: absolute;
            bottom: 10px;
            font-size: 15px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: ${FONT_COLOR};
            text-align: center;
            }
            a {
            color: ${FONT_COLOR};
            }
            img:hover {
              cursor: pointer;
            }
        </style>
    </head>
    <body>
        <h1 class="filename">${filename}</h1>${videoHLSText}
        <div class="file-container">
            ${
            isAudio
            ? `
            <audio controls>
                <source src="/uploads/${username}/${filename}">
            </audio>
            `
            : isVideo
            ? `${video}`
            : filename.endsWith('.gif')
            ? `<img onclick="window.open('/uploads/${username}/${filename}','_self')" src="/uploads/${username}/${filename}" alt="GIF" />`
            : isImage
            ? USE_PREVIEW
            ? `<img onclick="window.open('/uploads/${username}/${filename}','_self')" src="/uploads/${username}/preview/${filename}" width=${fileData.resolution_width} height=${fileData.resolution_height} alt="Bild Preview" />`
            : `<img onclick="window.open('/uploads/${username}/${filename}','_self')" src="/uploads/${username}/${filename}" width=${fileData.resolution_width} height=${fileData.resolution_height} alt="Bild" />`
            : fs.existsSync(previewPath)
            ? `<img onclick="window.open('/uploads/${username}/${filename}','_self')" src="/uploads/${username}/preview/${filename}" width=${fileData.resolution_width} height=${fileData.resolution_height} alt="Preview" />`
            : `<img onclick="window.open('/uploads/${username}/${filename}','_self')" src="${BASE_URL}/assets/file.png" alt="Datei" />`
            }
        </div>
        <div class="button-container">
            <button class="button" type="button" onclick="window.open('/download/${filename}')">Herunterladen</button>
            <button class="button" type="button" onclick="window.location.href = '/uploads/${username}/${filename}';">Direct Link</button>
        </div>
        <div class="stats">
            Hochgeladen von: ${username}<br>
            Hochgeladen am: ${creationDate}<br>
            Größe der Datei: ${sizeInMB} MB<br>
            ${resolutionHTML}
        </div>
        <div class="copyright">
            ${COPYRIGHT_TEXT}
        </div>
        <div class="version">
            v.${localVersion.version}</br>
        </div>
    </body>
</html>`;
              res.send(htmlResponse);
            }
          });
      });
    });
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Datei:', error.message));
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.get('/oembed/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
    const file = await getFileByFilename(filename);

    if (!file) {
      return res.status(404).send(notFoundPage);
    }
    const username = file.username;
    const fileData = await getFileDataFromDatabase(username, filename);

    const filePath = path.join(__dirname, 'uploads', username, filename);
    fs.access(filePath, fs.constants.F_OK, (error) => {
      if (error) {
        return res.status(404).send(notFoundPage);
      }

      const isImage = IMAGE_FORMATS.some(format => filename.endsWith(format));
      const isAudio = AUDIO_FORMATS.some(format => filename.endsWith(format));
      const isVideo = VIDEO_FORMATS.some(format => filename.endsWith(format));

      let type = 'file';
      if (isImage) {
        type = 'image';
      } else if (isVideo) {
        type = 'video';
      } else if (isAudio) {
        type = 'audio';
      }

      let oembedResponse = {
        type,
        version: '1.0',
        title: filename,
        author_url: AUTHOR_URL,
        author_name: AUTHOR_NAME,
        url: `${BASE_URL}/view/${filename}`,
        width: fileData.resolution_width,
        height: fileData.resolution_height,
        provider_name: PROVIDER_NAME,
        provider_url: PROVIDER_URL,
        html: `<iframe src="${BASE_URL}/uploads/${username}/${filename}" width="${fileData.resolution_width}" height="${fileData.resolution_height}" frameborder="0"></iframe>`
      };

      res.json(oembedResponse);
    });
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Datei:', error.message));
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.get('/download/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
    const file = await getFileByFilename(filename);

    if (!file) {
      return res.status(404).send(notFoundPage);
    }

    const username = file.username;
    const filePath = path.join(__dirname, 'uploads', username, filename);

    fs.access(filePath, fs.constants.F_OK, (error) => {
      if (error) {
        return res.status(404).send(notFoundPage);
      }

      res.download(filePath);
    });
  } catch (error) {
    console.err(clc.red('[ERROR] | » Fehler beim Abrufen der Datei:', error.message));
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.delete('/user/:username', checkToken, isAdmin, async (req, res) => {
  const username = req.params.username;

  try {
    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    const checkUserValues = [username];

    const userCheckResult = await db.all(checkUserQuery, checkUserValues);

    if (userCheckResult.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    const deleteQuery = 'DELETE FROM users WHERE username = ?';
    const deleteValues = [username];

    await db.run(deleteQuery, deleteValues);

    console.log(clc.green('[INFO] | » Nutzer erfolgreich aus der Datenbank gelöscht.'));

    const userFolderPath = path.join(__dirname, 'uploads', username);
    if (fs.existsSync(userFolderPath)) {
      fs.rmSync(userFolderPath, { recursive: true });
      console.log(clc.green('[INFO] | » Nutzerordner erfolgreich gelöscht.'));
    }

    const deleteFilesQuery = 'DELETE FROM file_data WHERE username = ?';
    await db.run(deleteFilesQuery, deleteValues);

    console.log(clc.green('[INFO] | » Dateieinträge erfolgreich aus der Datenbank gelöscht.'));

    const webhookData = {
      embeds: [
        {
          title: 'Ein Nutzer wurde gelöscht',
          description: `Nutzername: **${username}`,
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }

    res.json({ success: true, message: 'Nutzer erfolgreich gelöscht' });

  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Löschen des Nutzers:', error.message));

    const webhookData = {
      embeds: [
        {
          title: 'Ein Nutzer löschen',
          description: '\n' + error.message,
          color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }

    res.status(500).json({ error: 'Fehler beim Löschen des Nutzers' });
  }
});

app.delete('/user', authenticate, TokenUsername, async (req, res) => {
  const username = req.TokenUsername;

  try {
    const deleteQuery = 'DELETE FROM users WHERE username = ?';
    const deleteValues = [username];

    await db.run(deleteQuery, deleteValues);

    console.log(clc.green('[INFO] | » Nutzer erfolgreich aus der Datenbank gelöscht.'));

    const userFolderPath = path.join(__dirname, 'uploads', username);
    if (fs.existsSync(userFolderPath)) {
      fs.rmSync(userFolderPath, { recursive: true });
      console.log(clc.green('[INFO] | » Nutzerordner erfolgreich gelöscht.'));
    }

    const deleteFilesQuery = 'DELETE FROM file_data WHERE username = ?';
    await db.run(deleteFilesQuery, deleteValues);

    console.log(clc.green('[INFO] | » Dateieinträge erfolgreich aus der Datenbank gelöscht.'));

    const webhookData = {
      embeds: [
        {
          title: 'Ein Nutzer wurde gelöscht',
          description: `Der Nutzer ${username} wurde erfolgreich gelöscht.`,
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }

    res.json({ success: true, message: 'Nutzer erfolgreich gelöscht' });

  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Löschen des Nutzers:', error.message));

    const webhookData = {
      embeds: [
        {
          title: 'Ein Nutzer löschen',
          description: '\n' + error.message,
          color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }

    res.status(500).json({ error: 'Fehler beim Löschen des Nutzers' });
  }
});

const deleteFile = async (username, filename) => {
  let filePath = path.join(__dirname, 'uploads', username, filename);
  let previewPath = path.join(__dirname, 'uploads', username, 'preview', filename);

  if (!fs.existsSync(filePath)) {
    throw new Error('Datei nicht gefunden!');
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  if (fs.existsSync(previewPath)) {
    fs.unlinkSync(previewPath);
  }

  const deleteQuery = 'DELETE FROM file_data WHERE username = ? AND filename = ?';
  const deleteValues = [username, filename];

  return new Promise(async (resolve, reject) => {
    db.run(deleteQuery, deleteValues, async (error) => {
      if (error) {
        console.error(clc.red('[ERROR] | » Fehler beim Löschen des Eintrags aus der Datenbank:', error.message));
        const webhookData = {
          embeds: [
            {
              title: 'Eine Datei wurde gelöscht',
              description: '\n' + error.message,
              color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
            }
          ],
          username: DISCORD_WEBHOOK_NAME,
        };

        if (process.env.LOGS !== 'false') {
          try {
            await axios.post(DISCORD_WEBHOOK_URL, webhookData);
          } catch (error) {
            console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
          }
        }
        reject(error);
      } else {
        console.log(clc.green('[INFO] | » Eintrag erfolgreich aus der Datenbank gelöscht.'));
        const webhookData = {
          embeds: [
            {
              title: 'Eine Datei wurde gelöscht',
              description: 'Der Eintrag wurde erfolgreich aus der Datenbank gelöscht.',
              color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
            }
          ],
          username: DISCORD_WEBHOOK_NAME,
        };

        if (process.env.LOGS !== 'false') {
          try {
            await axios.post(DISCORD_WEBHOOK_URL, webhookData);
          } catch (error) {
            console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
          }
        }
        resolve();
      }
    });
  });
};

app.delete('/file/:username/:filename', checkToken, isAdmin, async (req, res) => {
  try {
    await deleteFile(req.params.username, req.params.filename);
    res.json({ success: true, message: 'Datei erfolgreich gelöscht' });
    const webhookData = {
      embeds: [
        {
          title: 'Eine Datei wurde gelöscht',
          description: `Nutzername: **${req.user.username}**\nDatei: **${req.params.filename}**`,
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Löschen der Datei:', error.message));
    const webhookData = {
      embeds: [
        {
          title: 'Eine Datei löschen',
          description: '\n' + error.message,
          color: parseColor(DISCORD_WEBHOOK_ERROR_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
    res.status(500).json({ error: 'Fehler beim Löschen der Datei' });
  }
});

app.delete('/file/:filename', authenticate, TokenUsername, async (req, res) => {
  try {
    await deleteFile(req.TokenUsername, req.params.filename);
    res.json({ success: true, message: 'Datei erfolgreich gelöscht' });
    const webhookData = {
      embeds: [
        {
          title: 'Eine Datei wurde gelöscht',
          description: `Nutzername: **${req.TokenUsername}**\nDatei: **${req.params.filename}**`,
          color: parseColor(DISCORD_WEBHOOK_SUCCESS_COLOR),
        }
      ],
      username: DISCORD_WEBHOOK_NAME,
    };

    if (process.env.LOGS !== 'false') {
      try {
        await axios.post(DISCORD_WEBHOOK_URL, webhookData);
      } catch (error) {
        console.error(clc.red('[DISCORD > ERROR] | » Nachricht konnte nicht gesendet werden:', error.message));
      }
    }
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Löschen der Datei:', error.message));
    res.status(500).json({ error: 'Fehler beim Löschen der Datei' });
  }
});

const getFilesInDirectory = (dirPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (error, files) => {
      if (error) {
        reject(error);
      } else {
        const filteredFiles = files.filter(file => file !== 'preview');
        resolve(filteredFiles);
      }
    });
  });
};

app.get('/files/:username', authenticate, isAdmin, async (req, res) => {
  try {
    const userDirPath = path.join(__dirname, 'uploads', req.params.username);
    const files = await getFilesInDirectory(userDirPath);
    res.json({ files });
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Dateien:', error.message));
    res.status(500).json({ error: 'Fehler beim Abrufen der Dateien' });
  }
});

app.get('/files', authenticate, TokenUsername, async (req, res) => {
  try {
    const userDirPath = path.join(__dirname, 'uploads', req.TokenUsername);
    const files = await getFilesInDirectory(userDirPath);
    res.json({ files });
  } catch (error) {
    console.error(clc.red('[ERROR] | » Fehler beim Abrufen der Dateien:', error.message));
    res.status(500).json({ error: 'Fehler beim Abrufen der Dateien' });
  }
});

const server = app.listen(PORT, () => console.log(clc.green(`[INFO] | » Server gestartet auf Port: ${PORT}`)));

if (USE_HLS) {
  new hls(server, {
    provider: {
      exists: (req, cb) => {
        const ext = req.url.split('.').pop();

        if (ext !== 'm3u8' && ext !== 'ts') {
          return cb(null, true);
        }

        fs.access(__dirname + req.url, fs.constants.F_OK, function (err) {
          if (err) {
            console.log(clc.red('[ERROR -> HLS] | » Datei existiert nicht!'));
            return cb(null, false);
          }
          cb(null, true);
        });
      },
      getManifestStream: (req, cb) => {
        const stream = fs.createReadStream(__dirname + req.url);
        cb(null, stream);
      },
      getSegmentStream: (req, cb) => {
        const stream = fs.createReadStream(__dirname + req.url);
        cb(null, stream);
      },
    },
  });
} else{}