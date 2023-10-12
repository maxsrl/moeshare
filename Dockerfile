FROM node:20-slim

WORKDIR /opt/moeshare/
COPY . ./

RUN mkdir -p /opt/moeshare/uploads/ \
    /opt/moeshare/public/assets/ \
    /opt/moeshare/db/ && \
    touch /opt/moeshare/.env

ENV AUDIO_FORMATS=.mp3,.wav,.ogg,.aac,.flac \
    VIDEO_FORMATS=.mp4,.avi,.mkv,.mov,.wmv \
    IMAGE_FORMATS=.jpg,.jpeg,.png,.bmp,.svg,.webp,.tiff \
    BASE_URL=http://localhost:3000 \
    PORT=3000 \
    JWT_TOKEN=CHANGEME \
    REMOVE_METADATA=true \
    USE_PREVIEW=true \
    LOGS=false \
    ALLOW_METRICS=true \
    USE_HLS=true \
    SITE_TITLE=MoeShare \
    SITE_FAVICON=https://moeshare.de/assets/img/logo.png \
    OG_TITLE=EXAMPLE \
    OG_DESCRIPTION=EXAMPLE \
    THEME_COLOR=&dominantColor \
    FONT_COLOR=#343540 \
    AUTHOR_URL=https://example.com \
    AUTHOR_NAME=EXAMPLE \
    PROVIDER_NAME=EXAMPLE.COM \
    PROVIDER_URL=https://example.com \
    USE_DOMINANT_COLOR=true \
    DOMINANT_COLOR_STATIC=# \
    BOX_SHADOW_COLOR=#ffffff \
    COPYRIGHT_TEXT="&copy; 2023 MoeShare - All Rights Reserved" \
    DISCORD_WEBHOOK_NAME=MoeShare \
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/XXXX \
    DISCORD_WEBHOOK_SUCCESS_COLOR=0x03fc28 \
    DISCORD_WEBHOOK_ERROR_COLOR=0xfc0303 \
    REDIRECT_URL=https://example.com

RUN npm ci
EXPOSE ${PORT}/tcp
CMD ["node", "index.js"]
