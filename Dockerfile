FROM node:current-slim

WORKDIR /opt/uploader/
COPY . ./

RUN mkdir -p /opt/uploader/uploads/ && \
    mkdir -p /opt/uploader/public/assets/ && \
    touch /opt/uploader/.env
	
ENV AUDIO_FORMATS=.mp3,.wav,.ogg,.aac,.flac \
    VIDEO_FORMATS=.mp4,.avi,.mkv,.mov,.wmv \
    IMAGE_FORMATS=.jpg,.jpeg,.png,.bmp,.svg,.webp,.tiff \
    BASE_URL=http://localhost:3000 \
    PORT=3000 \
    JWT_TOKEN=CHANGEME \
    REMOVE_METADATA=true \
    USE_PREVIEW=true \
    SITE_TITLE=EXAMPLE \
    SITE_FAVICON=/assets/favicon.png \
    OG_TITLE=EXAMPLE \
    OG_DESCRIPTION=EXAMPLE \
    THEME_COLOR=&dominantColor \
    DATABASE_HOST=127.0.0.1 \
    DATABASE_PORT=5432 \
    DATABASE_USER=postgres \
    DATABASE_PASSWORD=postgres \
    DATABASE_DATABASE=postgres \
    AUTHOR_URL=https://example.com \
    AUTHOR_NAME=EXAMPLE \
    PROVIDER_NAME=EXAMPLE.COM \
    PROVIDER_URL=https://example.com \
    USE_DOMINANT_COLOR=true \
    DOMINANT_COLOR_STATIC=# \
    BOX_SHADOW_COLOR=#ffffff \
    COPYRIGHT_TEXT="&copy; 2023 EXAMPLE - All Rights Reserved" \
    DISCORD_WEBHOOK_NAME=Datei-Uploader \
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/XXXX \
    DISCORD_WEBHOOK_SUCCESS_COLOR=0x03fc28 \
    DISCORD_WEBHOOK_ERROR_COLOR=0xfc0303 \
    REDIRECT_URL=https://example.com


RUN npm install
CMD ["node", "index.js"]