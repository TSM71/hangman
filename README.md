# Hangman

A minimalist hangman game that can be played locally or against a server.

## Backend

The backend code is entirely contained in [`public/data/api.php`](./public/data/api.php).  
The configuration options are available at the start of this file.

The necessary script to create the database is contained in [`init.sql`](./init.sql).
This file contains the word list.

### Notes on the backend

The default word list is in French because I stole it from my dad, whom this game was made for.  
I am aware the `plays`/`wins`/`losses`/`lastPlayed` columns of `words` can be derived from `games`, but they make the game logic more straightforward.

### Hosting via Docker

A [`Dockerfile`](./Dockerfile) and [`compose.yml`](./compose.yml) are provided to open a server on port `8080` hosting the backend and web client.

### Hosting natively

This game uses PHP with a SQLite database.  
You can find the requirements in the provided [`Dockerfile`](./Dockerfile).  
The database path is defined at the start of [`public/data/api.php`](./public/data/api.php).

## Web client

The web client is contained in [`public/`](./public/), excluding [`public/data/api.php`](./public/data/api.php).  
The entrypoint is [`public/index.html`](./public/index.html).  
The configuration options are available in this file.

### Notes on the web client

The aspect ratio is 45:64 so it fits on most screens.  
The default language is French because it was made for my dad, who is French.  

### URL parameters

The interface of the web client can be changed via URL parameters.  
The available options are as follow:

Interface language: `?lang=` - `fr` (default), `en`  
Hangman image: `?img=` - `hangman` (default), `healthbar`  
Colorblind mode: `?colorblind` - boolean

### Controls

The web client can be used with either mouse or keyboard.  
The keyboard controls are as follow:

Lobby: `[A]~[Z]` - Focus input field and type  
Lobby: `[Enter]` - Start a new game  
In game: `[A]~[Z]` - Check a letter  
In game: `[Escape]` - Abort  
Results: `[Escape]/[Enter]` - Return to lobby  
Results: `[I]` - View statistics

### Accessibility

I tried my best with the tags and colors, but I have no idea what I'm doing.  
If you have experience with this sort of thing, please help.

## CLI client

A CLI client is also available with [`client.js`](./client.js).  
This client uses Node.js to run.
