module.exports = {
  audioFormats: [`.mp3`, `.wav`, `.ogg`, `.aac`, `.flac`], // Unterstützte Audioformate
  videoFormats: [`.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`], // Unterstützte Videoformate
  imageFormats: [`.jpg`, `.jpeg`, `.png`, `.bmp`, `.svg`, `.webp`, `.tiff`], // Unterstützte Bildformate
  
  baseUrl: `http://localhost:3000`, // Basis-URL der Anwendung
  port: 3000, // Port der Anwendung
  jwttoken: '', // Zufälliger Token
  sitetitle: `EXAMPLE`, // Meta-Tag title
  sitefavicon: '/assets/favicon.png', // Path zur .png-Datei oder zu einer .png-URL
  ogtitle: `EXAMPLE`, // Meta-Tag og:title
  ogdescription: `EXAMPLE`, // Meta-Tag og:description
  themecolor: '&dominantColor', // Meta-Tag theme-color - wenn &dominantColor als themecolor genommen wird, ist das Embed in der Dominanten Farbe der Datei

  databaseHost: ``, // MariaDB - Hostname
  databasePort: 3306, // MariaDB - Port
  databaseUser: ``, // MariaDB - Datenbank Nutzer
  databasePassword: ``, // MariaDB - Datenbank Passwort
  databaseDatabase: ``, // MariaDB - Datenbank

  author_url: `https://example.com`, // OEmbed
  author_name: `EXAMPLE`, // OEmbed
  provider_name: `EXAMPLE.COM`, // OEmbed
  provider_url: `https://example.com`, // OEmbed

  boxshadowcolor: `#ffffff`, // Wird Angewand, wenn die Datei kein Bild ist.
  copyright: `&copy; ${new Date().getFullYear()} MAX.SRL - All Rights Reserved - <a rel="noreferrer" href="https://max.srl/impressum-datenschutz.html" target="_blank">Impressum & Datenschutz</a> | <a rel="noreferrer" href="https://github.com/MaximilianGT500/uploader" target="_blank">Source Code</a>`, // Copyright Text
  
  discordWebhookName: 'Datei-Uploader',
  discordWebhookUrl: 'https://discord.com/api/webhooks/XXXX/XXXX', // Für Discord-Webhook loggin
  discordWebhookSuccessColor: 0x03fc28, // Embed-Farbe (0xHEXCOLORCODEOHNE-#)
  discordWebhookErrorColor: 0xfc0303, // Embed-Farbe (0xHEXCOLORCODEOHNE-#)
  redirectUrl: 'https://example.com' // Wohin soll man Weitergeleitet werden, wenn man / aufruft?
};