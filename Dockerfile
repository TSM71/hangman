FROM debian:bullseye-slim
RUN apt update && apt install -y php sqlite3 php-sqlite3
RUN mkdir /game
COPY ./init.sql /game/init.sql
RUN sqlite3 /game/database.sqlite3 '.read /game/init.sql'
COPY ./public /game/public
EXPOSE 8080
CMD ["php", "-S", "[::]:8080", "-t", "/game/public"]
