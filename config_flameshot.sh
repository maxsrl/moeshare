#!/bin/bash
IMAGEPATH="$HOME/Bilder/"
IMAGENAME="MoeShare"
KEY="Dein Token"
DOMAIN="example.com/upload"

flameshot config -f "$IMAGENAME"
flameshot gui -r -p "$IMAGEPATH" > /dev/null

FILE="$IMAGEPATH$IMAGENAME.png"

if [ -f "$FILE" ]; then
    echo "$FILE exists."
    URL=$(curl -X POST \
      -H "Content-Type: multipart/form-data" \
      -H "Accept: application/json" \
      -H "User-Agent: ShareX/1.0.0" \
      -H "Authorization: $KEY" \
      -F "file=@$IMAGEPATH$IMAGENAME.png" "https://$DOMAIN" | jq -r '.view')
      printf "%s" "$URL" | xclip -sel clip  
    
    rm "$IMAGEPATH$IMAGENAME.png"
else 
    echo "Aborted."
fi

