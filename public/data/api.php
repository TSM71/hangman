<?php
header('Access-Control-Allow-Origin: *');

// Set config
$DB_PATH = '/game/database.sqlite3';
$DB_WORDS = 'words';
$DB_GAMES = 'games';
$MAX_LIVES = 9;
$CHOOSE_COUNT = 50;

// Match action
if (!isset($_GET['q'])) { echo '2'; exit(); }
$params = explode('.', $_GET['q']);
switch ($params[0]) {
  case 'n': // New game
    $db = new SQLite3($DB_PATH);

    // Fetch a random old word
    $word = $db->query('SELECT "index", "word" FROM "'. $DB_WORDS .'" ORDER BY "lastPlayed" ASC LIMIT 1 OFFSET '. rand(0, $CHOOSE_COUNT - 1));
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word->fetchArray();
    if (!$word) { echo '1'; $db->close(); exit(); }

    // Create game id
    $timestamp = (new DateTimeImmutable())->getTimestamp();
    $nonce = rand();

    // Push game state
    $ok = $db->exec('INSERT INTO "'. $DB_GAMES .'" VALUES ('. $timestamp .', '. $nonce .', '. $word['index'] .', '. $MAX_LIVES .', 0)');
    if (!$ok) { echo '1'; $db->close(); exit(); }

    // Update word stats
    $ok = $db->exec('UPDATE "'. $DB_WORDS .'" SET "plays" = "plays" + 1, "lastPlayed" = '. $timestamp .' WHERE "index" = '. $word['index']);
    if (!$ok) { echo '1'; $db->close(); exit(); }

    // Return game state
    echo '0.'. $timestamp .'.'. $nonce .'.'. $MAX_LIVES .'.'. str_repeat('_', strlen($word['word']));

    $db->close();
    break;

  case 'l': // Check letter
    if (count($params) < 4) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[1])) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[2])) { echo '2'; exit(); }
    if (!preg_match('/^[a-z]$/i', $params[3])) { echo '2'; exit(); }
    $db = new SQLite3($DB_PATH);

    // Fetch game state
    $game = $db->query('SELECT "word", "lives" FROM "'. $DB_GAMES .'" WHERE "ended" = 0 AND "timestamp" = '. $params[1] .' AND "nonce" = '. $params[2]);
    if (!$game) { echo '1'; $db->close(); exit(); }
    $game = $game->fetchArray();
    if (!$game) { echo '2'; $db->close(); exit(); }

    // Fetch current word
    $word = $db->query('SELECT "word" FROM "'. $DB_WORDS .'" WHERE "index" = '. $game['word']);
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word->fetchArray();
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word[0];

    // Get masked word
    $masked = preg_replace('/[^'. $params[3] .']/i', '_', $word);

    // Update game state if no matches
    if (!preg_match('/[^_]/i', $masked)) {
      $game['lives'] -= 1;

      $ok = $db->exec('UPDATE "'. $DB_GAMES .'" SET "lives" = '. $game['lives'] .', "ended" = '. ($game['lives'] ? 0 : 1) .' WHERE "timestamp" = '. $params[1] .' AND "nonce" = '. $params[2]);
      if (!$ok) { echo '1'; $db->close(); exit(); }

      // Update word stats if loss
      if (!$game['lives']) {
        $ok = $db->exec('UPDATE "'. $DB_WORDS .'" SET "losses" = "losses" + 1 WHERE "index" = '. $game['word']);
        if (!$ok) { echo '1'; $db->close(); exit(); }
      }
    }

    // Return game state
    echo '0.'. $game['lives'] .'.'. ($game['lives'] ? $masked : $word);

    $db->close();
    break;

  case 'w': // Check word
    if (count($params) < 4) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[1])) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[2])) { echo '2'; exit(); }
    if (!preg_match('/^[a-z]*$/i', $params[3])) { echo '2'; exit(); }
    $db = new SQLite3($DB_PATH);

    // Fetch game state
    $game = $db->query('SELECT "word", "lives" FROM "'. $DB_GAMES .'" WHERE "ended" = 0 AND "timestamp" = '. $params[1] .' AND "nonce" = '. $params[2]);
    if (!$game) { echo '1'; $db->close(); exit(); }
    $game = $game->fetchArray();
    if (!$game) { echo '2'; $db->close(); exit(); }

    // Fetch current word
    $word = $db->query('SELECT "word" FROM "'. $DB_WORDS .'" WHERE "index" = '. $game['word']);
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word->fetchArray();
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word[0];

    // Check if current word matches input
    $win = preg_match('/^'. $word .'$/i', $params[3]);

    // Update game state
    $ok = $db->exec('UPDATE "'. $DB_GAMES .'" SET "lives" = '. ($win ? $game['lives'] : 0) .', "ended" = 1 WHERE "timestamp" = '. $params[1] .' AND "nonce" = '. $params[2]);
    if (!$ok) { echo '1'; $db->close(); exit(); }

    // Update word stats
    $ok = $db->exec('UPDATE "'. $DB_WORDS .'" SET "'. ($win ? 'wins' : 'losses') .'" = "'. ($win ? 'wins' : 'losses') .'" + 1 WHERE "index" = '. $game['word']);
    if (!$ok) { echo '1'; $db->close(); exit(); }

    // Return game state
    echo '0.'. $word;

    $db->close();
    break;

  case 's': // Get stats
    if (count($params) < 3) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[1])) { echo '2'; exit(); }
    if (!preg_match('/^[0-9]+$/i', $params[2])) { echo '2'; exit(); }
    $db = new SQLite3($DB_PATH);

    // Fetch game state
    $game = $db->query('SELECT "word", "lives" FROM "'. $DB_GAMES .'" WHERE "ended" = 1 AND "timestamp" = '. $params[1] .' AND "nonce" = '. $params[2]);
    if (!$game) { echo '1'; $db->close(); exit(); }
    $game = $game->fetchArray();
    if (!$game) { echo '2'; $db->close(); exit(); }

    // Fetch word stats
    $word = $db->query('SELECT "word", "plays", "wins", "losses" FROM "'. $DB_WORDS .'" WHERE "index" = '. $game['word']);
    if (!$word) { echo '1'; $db->close(); exit(); }
    $word = $word->fetchArray();
    if (!$word) { echo '1'; $db->close(); exit(); }

    // Fetch server stats
    $server = $db->query('SELECT total("plays") AS "plays", total("wins") AS "wins", total("losses") AS "losses" FROM "'. $DB_WORDS .'"');
    if (!$server) { echo '1'; $db->close(); exit(); }
    $server = $server->fetchArray();
    if (!$server) { echo '1'; $db->close(); exit(); }

    // Return stats
    echo '0.'. ($game['lives'] ? 1 : 0) .'.'. $word['word'] .'.'. $word['plays'] .'.'. $word['wins'] .'.'. $word['losses'] .'.'. $server['plays'] .'.'. $server['wins'] .'.'. $server['losses'];

    $db->close();
    break;

  default: echo '2'; exit();
}
