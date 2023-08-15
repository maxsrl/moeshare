# Uploader
⚠️ Dies ist noch eine frühe und aktive Entwicklung. Es kann zu Fehlern kommen.


Dies ist ein einfacher ShareX-Uploader, der auf Node.js und MariaDB basiert. Der Uploader ermöglicht das Hochladen und generiert verschiedene Links für den Zugriff auf die hochgeladenen Dateien.

## Developer
Du bist ein Developer und siehst hier Fehler oder hast Verbesserungsvorschläge? Zögere nicht ein Issue zu öffnen bzw. eine Pull Request.

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

Derzeit wird nur die Lokale Installationsmethoden unterstützt. In Zukunft wird aber auch Docker unterstützt.

### Lokal

<details>
<summary><em>Erweitern für die Lokale Installation</em></summary>
<br>

1. Node.JS v18.X.X installation

   Debian:
   ```bash
   cd ~ && apt install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt install nodejs
   ```
   Ubuntu:
   ```bash
   cd ~ && apt install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt install nodejs
   ```
3. Klone dieses Repo mit `git clone https://github.com/MaximilianGT500/Uploader.git && cd Uploader/`.
4. Passe nun die `config.js` an.
5. Führe `npm i` aus, um die benötigten Abhängigkeiten zu installieren.
6. Führe `npm run register` aus, um den ersten Nutzer zu erstellen.
7. Führe `npm start` aus, um den Uploader zu starten.

</details>

### Lokal mit PM2 Clustering

<details>
<summary><em>Erweitern für die Lokale Installation mit PM2</em></summary>
<br>

1. Node.JS v18.X.X installation

   Debian:
   ```bash
   cd ~ && apt install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt install nodejs
   ```
   Ubuntu:
   ```bash
   cd ~ && apt install curl && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh && sudo bash nodesource_setup.sh && sudo apt install nodejs
   ```
3. Klone dieses Repo mit `git clone https://github.com/MaximilianGT500/Uploader.git && cd Uploader/`.
4. Passe nun die `config.js` an.
5. Führe `npm i` aus, um die benötigten Abhängigkeiten zu installieren.
6. Führe `npm i pm2 -g` aus, um PM2 zu installieren.
7. Führe `npm run register` aus, um den ersten Nutzer zu erstellen.
8. Führe `pm2 start index.js -i max --name Uploader` aus, um den Uploader zu starten und ihn zu Clustern mit allen Verfügbaren Threads.

</details>

## HTTPS
Für HTTPS-Unterstützung musst Du einen Reverse-Proxy konfigurieren. Ich empfehle [Caddy], aber jeder Reverse-Proxy funktioniert gut (wie Apache oder Nginx). Eine Beispielkonfiguration für Caddy findest du hier:

```
uploader.example.com {
    reverse_proxy localhost:3000
}
```

[Caddy]: https://caddyserver.com/

## ShareX konfigurieren
Die Datei `config.sxcu` kann auch geändert und importiert werden, für ein schnelleren Start.

1. Füge einen neuen benutzerdefinierten Uploader in ShareX hinzu, indem Du auf `Destinations > Custom uploader settings...` gehst.
2. Klicke auf `New` und gebe dem Uploader einen Namen Deiner Wahl.
3. Setze **Zieltyp** auf "Bild", "Text" und "Datei".
   - Method: `POST`
   - Request URL: `https://example/upload`
   - Body: `Formulardaten (multipart/form-data)`
   - File form name: `file` (wörtlich "file" in das Feld eingeben)
   - Headers:
      - Name: `Autorisierung`
	    - Wert: `Dein Token`
   - URL: `{json:view}`
   - Thumbnail URL: `{json:preview}`
   - Deletion URL: `{json:delete}`

## Entwicker-API

Der Uploader hat eine API (v1.0.0) für Frontend-Entwickler zur einfachen Integration. Im Moment ist die API ziemlich begrenzt, aber ich werde sie in Zukunft erweitern, mit dem Feedback der Frontend-Entwickler.
Alle Endpunkte, die eine Autorisierung erfordern, werden einen `Authorization`-Header benötigen, dessen Wert das Login-Token des Benutzers ist. Admin-Benutzer können auf alle Endpunkte zugreifen, während Nicht-Admin-Benutzer nur auf die für sie relevanten Endpunkte zugreifen können.

Andere Dinge zu beachten:
- Alle Endpunkte geben ein JSON-Objekt zurück.
- Erfolgreiche Endpunkte *sollten* einen `200` Statuscode zurückgeben. Alle Fehler verwenden den entsprechenden `4xx` oder `5xx` Statuscode (wie `401 Unauthorized`).

### API-Endpunkte

| Endpunkt | Zweck | Admin? |
| -------- | ------- | ------ |
| **`POST /login`** | Dieser Endpunkt ermöglicht es einem Benutzer, sich anzumelden und ein Login-Token zu erhalten, das zur Authentifizierung verwendet wird. | Nein |
| **`POST /upload`** | Mit diesem Endpunkt kann ein Benutzer eine Datei hochladen. | Nein |
| **`GET /view/:filename`** | Dieser Endpunkt stellt ein WebUI für eine spezifische Datei bereit, die dem angegebenen Benutzer gehört. | Nein |
| **`GET /oembed/:filename`** | Hier erhält ein Benutzer die OEmbed-Daten für eine spezifische Datei. | Nein |
| **`GET /download/:filename`** | Durch diesen Endpunkt erhält der Benutzer einen direkten Download-Link für eine spezifische Datei. | Nein |
| **`DELETE /file-delete/:username/:filename`** | Mit diesem Endpunkt werden alle Daten einer angegebenen Datei gelöscht, einschließlich des Previews, der Datei selbst und des Datenbankeintrags. Der Zugriff ist auf den angegebenen Benutzer beschränkt. | Ja |
| **`DELETE /file-delete/:filename`** | Dieser Endpunkt löscht alle Daten einer angegebenen Datei, einschließlich des Previews, der Datei selbst und des Datenbankeintrags. Der Zugriff erfolgt über das Login-Token des eingeloggten Benutzers. | Nein |
| **`DELETE /user-delete/:username`** | Dieser Endpunkt löscht alle Daten eines Nutzers, einschließlich des Nutzers selbst, des Ordners des Nutzers und des Datenbankeintrags. Der Zugriff erfolgt über das Login-Token des eingeloggten Benutzers. | Ja |
| **`DELETE /user-delete`** | Mit diesem Endpunkt werden alle Daten des angemeldeten Nutzers gelöscht, einschließlich des Nutzers selbst, des Ordners des Nutzers und des Datenbankeintrags. Der Zugriff ist auf den angegebenen Benutzer beschränkt. | Nein |
| **`GET /files/:username`** | Hier erhält der Benutzer eine Liste aller Dateien eines bestimmten Nutzers. | Ja |
| **`GET /files`** | Durch diesen Endpunkt erhält der Benutzer eine Liste aller Dateien, die dem eingeloggten Benutzer gehören. | Nein |

## NPM-Scripts

**Alle** dieser Skripte sollten mit `npm run <script-name>` ausgeführt werden. (außer `start`)

| Script | Beschreibung |
| ------ | ----------- |
| **`start`** | Startet den Uploader. Dies ist das Standardskript und wird mit **`npm start`** ausgeführt.. |
| `token` | Mit diesen Script bekommst du den Token von den angegebenen Nutzername und Passwort |
| `register` | Mit diesen Script kannst du einen Nutzer registrieren |

[`FORCE_COLOR`]: https://nodejs.org/dist/latest-v16.x/docs/api/cli.html#cli_force_color_1_2_3

## Flameshot-Benutzer (Linux)
Verwende [dieses Skript].

[dieses Skript]: https://github.com/MaximilianGT500/Uploader/blob/master/config_flameshot.sh

## Support
Solltest Du hilfe benötigen, öffne ein [Issue] oder Kontaktiere mich über meiner [Website].

[Issue]: https://github.com/MaximilianGT500/Uploader/issues/new
[Website]: https://maxi.lol/kontakt/

## Credits
- Einiges von der README.md wurde von [ass] übernommen

[ass]: https://github.com/tycrek/ass

## Lizenz
Dieses Projekt ist unter der **MIT**-Lizenz lizenziert.
