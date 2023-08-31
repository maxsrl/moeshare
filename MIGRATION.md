# Migration der Datenbank

## Von PostgreSQL zu SQLite3
Gehe in den Ordner von MoeShare.

 1. Gehe mit diesen Befehl in den Container der Datenbank: `docker exec -it datenbank bash`

 2. Führe nun diese Befehle aus:
    ```bash
    apt update && apt --assume-yes install postgresql-client-15 postgresql-client-common curl wget zip
    cd /var/lib/postgresql/data
    pg_dump -h localhost -U postgres postgres > dump.sql
    curl -F 'files[]=@dump.sql' 'https://www.rebasedata.com/api/v1/convert?outputFormat=sqlite&errorResponse=zip' -o sqlite-datenbank.zip
    unzip sqlite-datenbank.zip
    mv data.sqlite datenbank.sqlite
    curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
    bash nodesource_setup.sh
    apt --assume-yes install nodejs
    wget https://raw.githubusercontent.com/maxsrl/moeshare/main/sqlite-anpassung.js
    npm i sqlite3
    node sqlite-anpassung.js
    exit
    ```
 3. Nachdem du aus dem Container bist, führe diese Befehle aus **(Wenn du NodeJS bereits hast, überspringe die Zeilen: 2-5)**:
    ```bash
    apt install wget
    docker compose down
    mkdir db
    cp pg_data/datenbank.sqlite db/datenbank.sqlite
    rm -r pg_data
    mv docker-compose.yml docker-compose.old.yml
    wget https://raw.githubusercontent.com/maxsrl/moeshare/main/docker-compose.yml
    ```
 3. Ändere die `docker-compose.yml` nach deinen Wünschen.
 5. Starte den Uploader mit `docker compose up -d`
 6. **(Optimal)** Wenn du die gerade installierte Software löschen möchtest, führe diese Befehle aus:
    ```bash
    apt remove --purge wget
    ```
#### Nun hast du erfolgreich von PostgreSQL zu SQLite Migriert.


## Von MariaDB/MySQL zu SQLite3
Gehe in den Ordner von MoeShare.

 1. Gehe mit diesen Befehl in den Container der Datenbank: `docker exec -it uploader-datenbank bash`

 2. Führe nun diese Befehle aus:
    ```bash
    apt update && apt --assume-yes install python3 python3-pip
    pip install mysql-to-sqlite3
    cd /var/lib/mysql
    mysql2sqlite -f ./datenbank.sqlite -d uploader -u uploader --mysql-password 8RAcsRYSj75nePoCvzatZeqtaeyd8p7C4EtyWx78d2XwdJqa7c5SLuWqojWuz3yd
    exit
    ```
 3. Nachdem du aus dem Container bist, führe diese Befehle aus **(Wenn du NodeJS bereits hast, überspringe die Zeilen: 2-5)**:
    ```bash
    apt install wget
    docker compose down
    mkdir db
    cp mariadb/data/datenbank.sqlite db/datenbank.sqlite
    rm -r mariadb
    mv docker-compose.yml docker-compose.old.yml
    wget https://raw.githubusercontent.com/maxsrl/moeshare/main/docker-compose.yml
    ```
 3. Ändere die `docker-compose.yml` nach deinen Wünschen.
 5. Starte den Uploader mit `docker compose up -d`
 6. **(Optimal)** Wenn du die gerade installierte Software löschen möchtest, führe diese Befehle aus:
    ```bash
    apt remove --purge wget
    ```
#### Nun hast du erfolgreich von MariaDB/MySQL zu SQLite Migriert.
