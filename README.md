<div align="center">
  <h1><a href="https://github.com/maxsrl/moeshare" target="_blank"><img height="300" alt="LOGO" src="https://moeshare.de/logo.png"></a></h1>
</div>

![GitHub Lizenz]
![GitHub Letze Änderung]
![Docker Pulls]
![GitHub Issues]
![GitHub Sterne]

⚠️ Dies ist noch eine frühe und aktive Entwicklung. Es kann zu Fehlern kommen.

🛑 Wenn du MoeShare bereits Installiert hast, mache eine [Migration], da er nun SQLite nutzt. Dies macht mehr Sinn für solch ein Projekt.


[Migration]: https://github.com/maxsrl/moeshare/blob/main/MIGRATION.md
[GitHub Lizenz]: https://img.shields.io/github/license/maxsrl/moeshare?color=278c42&style=for-the-badge
[GitHub Letze Änderung]: https://img.shields.io/github/last-commit/maxsrl/moeshare?color=278c42&label=Letze%20Änderung&style=for-the-badge
[Docker Pulls]: https://img.shields.io/docker/pulls/maxsrl/moeshare?color=278c42&label=Docker%20Pulls&style=for-the-badge
[GitHub Issues]: https://img.shields.io/github/issues/maxsrl/moeshare?color=278c42&label=Issues&style=for-the-badge
[GitHub Sterne]: https://img.shields.io/github/stars/maxsrl/moeshare?color=278c42&label=Sterne&style=for-the-badge


Dies ist ein einfacher ShareX-Uploader, der auf Node.js und SQLite basiert. MoeShare ermöglicht das Hochladen und generiert verschiedene Links für den Zugriff auf die hochgeladenen Dateien.

## Developer

Du bist ein Developer und siehst hier Fehler oder hast Verbesserungsvorschläge? Zögere nicht ein Issue zu öffnen bzw. eine Pull Request.

## GTMetrix Performence Test
Du möchtest wissen, wie die Performence der Anwendung ist? [Klicke hier](https://gtmetrix.com/reports/media.maxi.lol/EoXUeoI7/).

## Funktionen

- Hochladen von Bildern, Gifs, Videos, Audio und Dateien
- Token-basierte Authentifizierung
- Herunterladen und Löschen von Dateien
- GPS-Daten werden automatisch entfernt
- Vollständig anpassbare Discord-Einbettungen
- Integrierter Webviewer mit Bilder, Video- und Audioplayer
- Einbetten von Bildern, Gifs und Videos direkt in Discord
- Informations- und Fehler-Protokoll mit anpassbaren Discord-Webhook
- macOS/Linux-Unterstützung mit alternativen Clients wie [Flameshot] & [MagicCap]
- Liste aller Dateien
- ...

[Flameshot]: https://flameshot.org/
[MagicCap]: https://magiccap.me/

## Installation

Derzeit wird die Installation mit NodeJS oder Docker unterstützt.

### Lokal

<details>
<summary><em>Erweitern für die Lokale Installation</em></summary>
<br>

1. Node.JS v20.X.X installation

   Debian:

   ```bash
   cd ~ && apt --assume-yes install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt --assume-yes install nodejs
   ```

   Ubuntu:

   ```bash
   cd ~ && apt --assume-yes install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt --assume-yes install nodejs
   ```

3. Klone dieses Repo mit `git clone https://github.com/maxsrl/moeshare.git && cd moeshare/`.
4. Passe nun die `example.env` an.
5. Nenne nun die `example.env` zu `.env` um.
6. Führe `npm i` aus, um die benötigten Abhängigkeiten zu installieren.
7. Führe `npm run register` aus, um den ersten Nutzer zu erstellen.
8. Führe `npm start` aus, um MoeShare zu starten.


</details>

### Lokal mit PM2 Clustering

<details>
<summary><em>Erweitern für die Lokale Installation mit PM2</em></summary>
<br>

1. Node.JS v20.X.X installation

   Debian:

   ```bash
   cd ~ && apt --assume-yes install curl && curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt --assume-yes install nodejs
   ```

   Ubuntu:

   ```bash
   cd ~ && apt --assume-yes install curl && curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt --assume-yes install nodejs
   ```

3. Klone dieses Repo mit `git clone https://github.com/maxsrl/moeshare.git && cd moeshare/`.
4. Passe nun die `example.env` an.
5. Nenne nun die `example.env` zu `.env` um.
6. Führe `npm i` aus, um die benötigten Abhängigkeiten zu installieren.
7. Führe `npm i pm2 -g` aus, um PM2 zu installieren.
8. Führe `npm run register` aus, um den ersten Nutzer zu erstellen.
9. Führe `pm2 start index.js -i max --name MoeShare` aus, um MoeShare zu starten und ihn zu Clustern mit allen Verfügbaren Threads.


</details>

### Docker

<details>
<summary><em>Erweitern für die Docker/Compose Installation</em></summary>
<br>

1. Docker & Docker Compose Installieren

   Debian (Debian Bookworm 12 (stable), Debian Bullseye 11 (oldstable)):

   ```bash
    sudo apt-get update
    sudo apt-get --assume-yes install ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get --assume-yes install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

   Ubuntu (Ubuntu Lunar 23.04, Ubuntu Kinetic 22.10, Ubuntu Jammy 22.04 (LTS), Ubuntu Focal 20.04 (LTS)):

   ```bash
    sudo apt-get update
    sudo apt-get --assume-yes install ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get --assume-yes install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

2. Lade dir die [docker-compose.yml] auf dein Server herunter

3. Bearbeite die `docker-compose.yml` nach deinen Vorstellungen.
4. Führe `docker compose up -d && docker compose exec moeshare npm run register && docker compose restart` aus, um den ersten Nutzer zu erstellen und um MoeShare zu starten.



[docker-compose.yml]: https://raw.githubusercontent.com/maxsrl/moeshare/main/docker-compose.yml

Wie kann ich ein npm-Script ausführen? Nutze dafür `docker compose exec moeshare npm run BEFEHL`

Wie kann ich Updaten? Nutze dafür: `docker compose pull`

</details>

## HTTPS

Für HTTPS-Unterstützung musst Du einen Reverse-Proxy konfigurieren. Ich empfehle [Caddy], aber jeder Reverse-Proxy funktioniert gut (wie Apache oder Nginx). Eine Beispielkonfiguration für Caddy findest du hier:

```
moeshare.example.com {
    reverse_proxy localhost:3000
}
```

[Caddy]: https://caddyserver.com/

## ShareX konfigurieren

Die Datei `config.sxcu` kann auch geändert und importiert werden, für ein schnelleren Start.

1. Füge einen neuen benutzerdefinierten Uploader in ShareX hinzu, indem Du auf `Destinations > Custom uploader settings...` gehst.
2. Klicke auf `New` und gebe MoeShare einen Namen Deiner Wahl.
3. Setze **Zieltyp** auf "Bild", "Text" und "Datei".
   - Method: `POST`
   - Request URL: `https://example/upload`
   - Body: `Formulardaten (multipart/form-data)`
   - File form name: `file` (wörtlich "file" in das Feld eingeben)
   - Headers:
     - Name: `Authorization`
     - Wert: `Dein Token`
   - URL: `{json:view}`
   - Thumbnail URL: `{json:preview}`
   - Deletion URL: `{json:delete}`

## Entwicker-API

MoeShare hat eine API für Frontend-Entwickler zur einfachen Integration. Im Moment ist die API ziemlich begrenzt, aber ich werde sie in Zukunft erweitern, mit dem Feedback der Frontend-Entwickler.
Alle Endpunkte, die eine Autorisierung erfordern, werden einen `Authorization`-Header benötigen, dessen Wert das Login-Token des Benutzers ist. Admin-Benutzer können auf alle Endpunkte zugreifen, während Nicht-Admin-Benutzer nur auf die für sie relevanten Endpunkte zugreifen können.

Andere Dinge zu beachten:

- Alle Endpunkte geben ein JSON-Objekt zurück.
- Erfolgreiche Endpunkte _sollten_ einen `200` Statuscode zurückgeben. Alle Fehler verwenden den entsprechenden `4xx` oder `5xx` Statuscode (wie `401 Unauthorized`).

### API-Endpunkte

| Endpunkt                                      | Zweck                                                                                                                                                                                                                   | Admin? |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **`POST /login`**                             | Dieser Endpunkt ermöglicht es einem Benutzer, sich anzumelden und ein Login-Token zu erhalten, das zur Authentifizierung verwendet wird.                                                                                | Nein   |
| **`POST /upload`**                            | Mit diesem Endpunkt kann ein Benutzer eine Datei hochladen.                                                                                                                                                             | Nein   |
| **`GET /view/:filename`**                     | Dieser Endpunkt stellt ein WebUI für eine spezifische Datei bereit, die dem angegebenen Benutzer gehört.                                                                                                                | Nein   |
| **`GET /oembed/:filename`**                   | Hier erhält ein Benutzer die OEmbed-Daten für eine spezifische Datei.                                                                                                                                                   | Nein   |
| **`GET /download/:filename`**                 | Durch diesen Endpunkt erhält der Benutzer einen direkten Download-Link für eine spezifische Datei.                                                                                                                      | Nein   |
| **`DELETE /file/:username/:filename`** | Mit diesem Endpunkt werden alle Daten einer angegebenen Datei gelöscht, einschließlich des Previews, der Datei selbst und des Datenbankeintrags. Der Zugriff ist auf den angegebenen Benutzer beschränkt.               | Ja     |
| **`DELETE /file-delete/:filename`**           | Dieser Endpunkt löscht alle Daten einer angegebenen Datei, einschließlich des Previews, der Datei selbst und des Datenbankeintrags. Der Zugriff erfolgt über das Login-Token des eingeloggten Benutzers.                | Nein   |
| **`DELETE /user-delete/:username`**           | Dieser Endpunkt löscht alle Daten eines Nutzers, einschließlich des Nutzers selbst, des Ordners des Nutzers und des Datenbankeintrags. Der Zugriff erfolgt über das Login-Token des eingeloggten Benutzers.             | Ja     |
| **`DELETE /user-delete`**                     | Mit diesem Endpunkt werden alle Daten des angemeldeten Nutzers gelöscht, einschließlich des Nutzers selbst, des Ordners des Nutzers und des Datenbankeintrags. Der Zugriff ist auf den angegebenen Benutzer beschränkt. | Nein   |
| **`GET /files/:username`**                    | Hier erhält der Benutzer eine Liste aller Dateien eines bestimmten Nutzers.                                                                                                                                             | Ja     |
| **`GET /files`**                              | Durch diesen Endpunkt erhält der Benutzer eine Liste aller Dateien, die dem eingeloggten Benutzer gehören.                                                                                                              | Nein   |

### Environments

| Endpunkt                            | Zweck                                                                                                                                                                                              | Standart                                     | Wichtig? |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- |
| **`AUDIO_FORMATS`**                 | Definiert die erlaubten Audioformate für die Anwendung.                                                                                                                                            | `.mp3,.wav,.ogg,.aac,.flac`                  | ✅       |
| **`VIDEO_FORMATS`**                 | Definiert die erlaubten Videoformate für die Anwendung.                                                                                                                                            | `.mp4,.avi,.mkv,.mov,.wmv`                   | ✅       |
| **`IMAGE_FORMATS`**                 | Definiert die erlaubten Bildformate für die Anwendung.                                                                                                                                             | `.jpg,.jpeg,.png,.bmp,.svg,.webp,.tiff`      | ✅       |
| **`BASE_URL`**                      | Legt die URL der Anwendung fest, die beim Upload verwendet wird.                                                                                                                                   | `http://localhost:3000`                      | ✅       |
| **`PORT`**                          | Gibt den TCP-Port der Anwendung an.                                                                                                                                                                | `3000`                                       | ✅       |
| **`JWT_TOKEN`**                     | Ein zufälliger Token, idealerweise 64 Zeichen lang, der zur Signierung verwendet wird.                                                                                                             | `CHANGEME`                                   | ✅       |
| **`REMOVE_METADATA`**               | Legt fest, ob Metadaten wie Standortinformationen nach dem Upload entfernt werden sollen (kann die Leistung beeinträchtigen).                                                                      | `true`                                       | ❌       |
| **`USE_PREVIEW`**                   | Gibt an, ob ein Vorschaubild erstellt werden soll.                                                                                                                                                 | `true`                                       | ❌       |
| **`LOGS`**                          | Gibt an, ob Logs an den Discord-Webhook gesendet werden sollen.                                                                                                                                    | `false`                                      | ❌       |
| **`ALLOW_METRICS`**                 | Legt fest, ob Fehler zur Fehlerbehebung an Sentry gesendet werden dürfen (wird empfohlen, um zur Verbesserung der Anwendung beizutragen!).                                                         | `true`                                       | ❌       |
| **`SITE_TITLE`**                    | Definiert den HTML-Metatag "title".                                                                                                                                                                | `MoeShare`                                   | ❌       |
| **`SITE_FAVICON`**                  | Pfad zur .png-Datei oder URL einer .png-Datei für das Favicon.                                                                                                                                     | `https://moeshare.de/logo.png`               | ❌       |
| **`OG_TITLE`**                      | Meta-Tag og:title.                                                                                                                                                                                 | `EXAMPLE`                                    | ❌       |
| **`OG_DESCRIPTION`**                | Meta-Tag og:description.                                                                                                                                                                           | `EXAMPLE`                                    | ❌       |
| **`THEME_COLOR`**                   | Meta-Tag theme-color - Wenn &dominantColor als Theme-Farbe verwendet wird, wird das Embed in der dominanten Farbe der Datei angezeigt.                                                             | `&dominantColor`                             | ❌       |
| **`AUTHOR_URL`**                    | OEmbed-Autor-URL.                                                                                                                                                                                  | `https://example.com`                        | ❌       |
| **`AUTHOR_NAME`**                   | OEmbed-Autor-Name.                                                                                                                                                                                 | `EXAMPLE`                                    | ❌       |
| **`PROVIDER_NAME`**                 | OEmbed-Anbieter-Name.                                                                                                                                                                              | `EXAMPLE.COM`                                | ❌       |
| **`PROVIDER_URL`**                  | OEmbed-Anbieter-URL.                                                                                                                                                                               | `https://example.com`                        | ❌       |
| **`USE_DOMINANT_COLOR`**            | Gibt an, ob die dominante Farbe des Bildes für den Schatten verwendet werden soll (true), oder ob stattdessen eine feste Farbe verwendet werden soll (false, dann &dominantColorStatic ausfüllen). | `true`                                       | ❌       |
| **`DOMINANT_COLOR_STATIC`**         | Diese Farbe wird anstelle der dominanten Farbe verwendet (#HEXCOLOR).                                                                                                                              | `#ffffff`                                    | ❌       |
| **`BOX_SHADOW_COLOR`**              | Wird angewendet, wenn die Datei kein Bild ist (#HEXCOLOR).                                                                                                                                         | `#ffffff`                                    | ❌       |
| **`COPYRIGHT_TEXT`**                | Copyright-Text.                                                                                                                                                                                    | `&copy; 2023 MoeShare - All Rights Reserved` | ✅       |
| **`DISCORD_WEBHOOK_NAME`**          | Name der Discord-Webhook.                                                                                                                                                                          | `MoeShare`                                   | ❌       |
| **`DISCORD_WEBHOOK_URL`**           | URL für den Discord-Webhook-Log (nur ausfüllen, wenn LOGS = true).                                                                                                                                 | `https://discord.com/api/webhooks/XXXX/XXXX` | ❌       |
| **`DISCORD_WEBHOOK_SUCCESS_COLOR`** | Embed-Farbe für INFO-Logs (0xHEXCOLORCODEOHNE-#).                                                                                                                                                  | `0x03fc28`                                   | ❌       |
| **`DISCORD_WEBHOOK_ERROR_COLOR`**   | Embed-Farbe für ERROR-Logs (0xHEXCOLORCODEOHNE-#).                                                                                                                                                 | `0xfc0303`                                   | ❌       |
| **`REDIRECT_URL`**                  | Weiterleitungsziel, wenn / aufgerufen wird.                                                                                                                                                        | `https://example.com`                        | ❌       |


## NPM-Scripts 

**Alle** dieser Skripte sollten mit `npm run <script-name>` ausgeführt werden. (außer `start`)

| Script      | Beschreibung                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| **`start`** | Startet MoeShare. Dies ist das Standardskript und wird mit **`npm start`** ausgeführt..                      |
| `token`     | Mit diesen Script bekommst du den Token von den angegebenen Nutzername und Passwort                              |
| `reset`     | Mit diesen Script kannst du das Passwort, den Token und die Rolle eines Nutzers ändern bzw. zurücksetzen.        |
| `register`  | Mit diesen Script kannst du einen Nutzer registrieren                                                            |

[`FORCE_COLOR`]: https://nodejs.org/dist/latest-v16.x/docs/api/cli.html#cli_force_color_1_2_3

## Flameshot-Benutzer (Linux)

Verwende [dieses Skript] und installiere die Pakete jp und xclip.

[dieses Skript]: https://github.com/maxsrl/moeshare/blob/master/config_flameshot.sh

## Support

Solltest Du hilfe benötigen, öffne ein [Issue] oder Kontaktiere mich über meiner [Website].

[Issue]: https://github.com/maxsrl/moeshare/issues/new
[Website]: https://maxi.lol/kontakt/

## Credits

- Einiges von der README.md und der docker-compose.yml wurde von [ass] übernommen

[ass]: https://github.com/tycrek/ass

## Lizenz

Dieses Projekt ist unter der **MIT**-Lizenz lizenziert.
