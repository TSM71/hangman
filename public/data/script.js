/** @typedef {{ word: string, lives: number, ended: boolean, check(letter: string): Promise<boolean>, stats(): Promise<Record<string, number>> }} Game */

/** @implements {Game} */
class ServerGame {
  ended = false
  /** @type {string} */
  endpoint
  /** @type {string} */
  id
  /** @private @param {string} word @param {number} lives @param {string} endpoint @param {string} id */
  constructor(word, lives, endpoint, id) {
    this.word = word
    this.lives = lives
    this.endpoint = endpoint
    this.id = id
  }

  /** @private @param {string} query @returns {Promise<string[]>} */
  static async callAPI(endpoint, query) {
    const res = await fetch(`${endpoint}?q=${query}`).then(res => res.text())
    if (res[0] === '1') throw new Error('Server error')
    if (res[0] === '2') throw new Error('User error')
    return res.split('.').slice(1)
  }

  /** @param {string} endpoint @returns {Promise<Game>} */
  static async new(endpoint) {
    const [ timestamp, nonce, lives, word ] = await ServerGame.callAPI(endpoint, 'n')
    return new ServerGame(word, +lives, endpoint, `${timestamp}.${nonce}`)
  }

  /** @override @param {string} letter @returns {Promise<boolean>} */
  async check(letter) {
    const [ livesStr, word ] = await ServerGame.callAPI(this.endpoint, `l.${this.id}.${letter}`)
    const lives = +livesStr
    const ok = lives === this.lives
    this.lives = lives
    this.word = this.word.replace(/_/g, (_, index) => word[index])
    this.ended = !this.word.includes('_')
    if (!this.ended || lives === 0) return ok
    const [ target ] = await ServerGame.callAPI(this.endpoint, `w.${this.id}.${this.word}`)
    if (this.word !== target) throw new Error('Check error')
    return true
  }

  /** @override @returns {Promise<{ won: boolean, word: string, wordPlays: number, wordWins: number, wordLosses: number, serverPlays: number, serverWins: number, serverLosses: number }>} */
  async stats() {
    const [ won, word, ...stats ] = await ServerGame.callAPI(this.endpoint, `s.${this.id}`)
    const [ wordPlays, wordWins, wordLosses, serverPlays, serverWins, serverLosses ] = stats.map(e => +e)
    return { won: !!+won, word, wordPlays, wordWins, wordLosses, serverPlays, serverWins, serverLosses }
  }
}

/** @implements {Game} */
class LocalGame {
  ended = false
  /** @type {string} */
  target
  /** @private @param {string} word @param {number} lives @param {string} target */
  constructor(word, lives, target) {
    this.word = word
    this.lives = lives
    this.target = target
  }

  /** @param {string} word @param {number} lives @returns {Promise<Game>} */
  static async new(word, lives) {
    return new LocalGame('_'.repeat(word.length), lives, word)
  }

  /** @override @param {string} letter @returns {Promise<boolean>} */
  async check(letter) {
    const lives = this.target.includes(letter) ? this.lives : this.lives - 1
    const word = this.target.replace(new RegExp(`[^${letter}]`, 'gi'), '_')
    const ok = lives === this.lives
    this.lives = lives
    this.word = lives === 0 ? this.target : this.word.replace(/_/g, (_, index) => word[index])
    this.ended = this.word === this.target
    return ok
  }

  /** @override @returns {Promise<Record<string, number>>} */
  async stats() {
    return {}
  }
}

/**
 * @param {{ imgSrc: (lives: number | null, ended: boolean | null) => string, imgText: (lives: number | null, ended: boolean | null) => string, input: string, keyboard: string[], new: string, abort: string, won: string, lost: string, statsText: (stats: Record<string, number>) => string }} lang
 * @param {(word: string) => Promise<Game>} newGame
 * @return {{ rootElement: HTMLDivElement, keydownListener: (event: KeyboardEvent) => void }}
 */
function init(lang, newGame) {
  /** @type {Game | undefined} */
  let game

  const eRoot = document.createElement('main')
  eRoot.classList.add('ui-root')
  const eImage = eRoot.appendChild(document.createElement('div'))
  eImage.classList.add('ui-image')
  eImage.ariaLive = 'assertive'
  const eImg = eImage.appendChild(document.createElement('img'))
  const eStats = eImage.appendChild(document.createElement('div'))
  eStats.role = 'status'
  const eStatsBt = eStats.appendChild(document.createElement('a'))
  eStatsBt.ariaKeyShortcuts = 'I'
  const eStatsIcon = eStatsBt.appendChild(document.createElement('span'))
  eStatsIcon.ariaHidden = 'true'
  const eGenericTop = eRoot.appendChild(document.createElement('div'))
  eGenericTop.classList.add('ui-generic')
  const eInput = eGenericTop.appendChild(document.createElement('input'))
  eInput.type = 'text'
  eInput.placeholder = lang.input
  const eWord = eGenericTop.appendChild(document.createElement('div'))
  eWord.classList.add('ui-guess')
  eWord.role = 'alert'
  eWord.ariaLive = 'assertive'
  const eKeyboard = eRoot.appendChild(document.createElement('div'))
  eKeyboard.classList.add('ui-keyboard')
  eKeyboard.style.setProperty('--kb-cols', lang.keyboard.reduce((a, e) => Math.max(a, e.length), 0))
  eKeyboard.style.setProperty('--kb-rows', lang.keyboard.length)
  /** @type {Map<string, HTMLButtonElement>} */
  const eKeys = new Map()
  lang.keyboard.forEach(row => {
    const eRow = eKeyboard.appendChild(document.createElement('div'))
    row.toUpperCase().split('').forEach(char => {
      const eChar = eRow.appendChild(document.createElement('button'))
      eChar.textContent = char
      const eCharIcon = eChar.appendChild(document.createElement('span'))
      eCharIcon.ariaHidden = 'true'
      eKeys.set(char, eChar)
      eChar.addEventListener('click', () => useKey(char))
    })
  })
  const eGenericBottom = eRoot.appendChild(document.createElement('div'))
  eGenericBottom.classList.add('ui-generic')
  const eNew = eGenericBottom.appendChild(document.createElement('button'))
  eNew.textContent = lang.new
  eNew.ariaKeyShortcuts = 'Enter'
  eNew.addEventListener('click', start)
  const eReset = eGenericBottom.appendChild(document.createElement('button'))
  eReset.addEventListener('click', reset)

  setWord('')
  setLives(null)
  reset()

  /** @param {string} key */
  async function useKey(key) {
    const eChar = eKeys.get(key)
    if (!eChar || eChar.disabled) return
    eChar.disabled = true
    eChar.ariaKeyShortcuts = null
    const ok = await game.check(key)
    eChar.classList.add(ok ? 'ui-ok' : 'ui-ko')
    setWord(game.word)
    setLives(game.lives)
    if (!game.ended) return
    eKeys.forEach(eChar => {
      eChar.disabled = true
      eChar.ariaKeyShortcuts = null
    })
    eReset.textContent = game.lives ? lang.won : lang.lost
    eReset.ariaKeyShortcuts = 'Enter Escape'
    eReset.classList.add(game.lives ? 'ui-ok': 'ui-ko')
    const stats = lang.statsText(await game.stats())
    eStatsBt.onclick = () => alert(stats)
    eStatsBt.ariaLabel = stats
    if (stats) eStats.style.display = ''
  }
  /** @param {string} word */
  function setWord(word) {
    while (eWord.firstChild) eWord.firstChild.remove()
    const text = word.replace(/[^_a-z]/gi, '').toUpperCase().split('')
    eWord.ariaLabel = text.join(' ')
    text.forEach(char => {
      const eChar = eWord.appendChild(document.createElement('span'))
      eChar.textContent = char
      eChar.ariaHidden = true
    })
  }
  /** @param {number} lives */
  function setLives(lives) {
    eImg.src = lang.imgSrc(lives, game?.ended ?? null)
    eImg.alt = lang.imgText(lives, game?.ended ?? null)
  }
  function reset() {
    game = undefined
    eKeys.forEach(eChar => {
      eChar.classList.remove('ui-ok', 'ui-ko')
      eChar.disabled = true
      eChar.ariaKeyShortcuts = null
    })
    setLives(null)
    eInput.style.display = ''
    eWord.style.display = 'none'
    eNew.style.display = ''
    eReset.style.display = 'none'
    eStats.style.display = 'none'
  }
  async function start() {
    eReset.textContent = lang.abort
    eReset.ariaKeyShortcuts = 'Escape'
    eReset.classList.remove('ui-ok', 'ui-ko')
    const word = eInput.value.replace(/[^a-z]/gi, '').toUpperCase()
    eInput.value = ''
    game = await newGame(word)
    setWord(game.word)
    setLives(game.lives)
    eKeys.forEach((eChar, char) => {
      eChar.disabled = false
      eChar.ariaKeyShortcuts = char
    })
    eInput.style.display = 'none'
    eWord.style.display = ''
    eNew.style.display = 'none'
    eReset.style.display = ''
  }

  return {
    rootElement: eRoot,
    keydownListener: evt => {
      if (game) {
        if (evt.key === 'Escape') reset()
        else if (game.ended) {
          if (evt.key === 'Enter') reset()
          else if (evt.key === 'i' && !eStats.style.display) eStatsBt.click()
        } else useKey(evt.key.toUpperCase())
      } else {
        if (evt.key === 'Enter') start()
        else eInput.focus()
      }
    }
  }
}
