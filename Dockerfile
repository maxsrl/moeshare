FROM node:current-slim

WORKDIR /opt/uploader/
COPY . ./

RUN mkdir -p /opt/uploader/uploads/ && \
    mkdir -p /opt/uploader/public/assets/ && \
    touch /opt/uploader/.env
	
ENV AUDIO_FORMATS=.mp3,.wav,.ogg,.aac,.flac
ENV VIDEO_FORMATS=.mp4,.avi,.mkv,.mov,.wmv
ENV IMAGE_FORMATS=.jpg,.jpeg,.png,.bmp,.svg,.webp,.tiff

ENV BASE_URL=http://localhost:3000
ENV PORT=3000
ENV JWT_TOKEN=CHANGEME

ENV SITE_TITLE=EXAMPLE
ENV SITE_FAVICON=/assets/favicon.png
ENV OG_TITLE=EXAMPLE
ENV OG_DESCRIPTION=EXAMPLE
ENV THEME_COLOR=&dominantColor

ENV DATABASE_HOST=127.0.0.1
ENV DATABASE_PORT=3306
ENV DATABASE_USER=uploader
ENV DATABASE_PASSWORD=8RAcsRYSj75nePoCvzatZeqtaeyd8p7C4EtyWx78d2XwdJqa7c5SLuWqojWuz3yd
ENV DATABASE_DATABASE=uploader

ENV AUTHOR_URL=https://example.com
ENV AUTHOR_NAME=EXAMPLE
ENV PROVIDER_NAME=EXAMPLE.COM
ENV PROVIDER_URL=https://example.com

ENV USE_DOMINANT_COLOR=true
ENV DOMINANT_COLOR_STATIC=#
ENV BOX_SHADOW_COLOR=#ffffff

ENV COPYRIGHT_TEXT="&copy; MAX.SRL - All Rights Reserved - <a rel="noreferrer" href="https://max.srl/impressum-datenschutz.html" target="_blank">Impressum & Datenschutz</a> | <a rel="noreferrer" href="https://github.com/MaximilianGT500/uploader" target="_blank">Source Code</a>"

ENV DISCORD_WEBHOOK_NAME=Datei-Uploader
ENV DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/XXXX
ENV DISCORD_WEBHOOK_SUCCESS_COLOR=0x03fc28
ENV DISCORD_WEBHOOK_ERROR_COLOR=0xfc0303
ENV REDIRECT_URL=https://example.com


RUN npm install
CMD npm start