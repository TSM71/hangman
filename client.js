#!/usr/bin/env node
if ([undefined, '-h', '--help'].includes(process.argv[2])) {
  console.log('Usage: ./client.js [backendURL]')
  process.exit()
}
const backend = process.argv[2]
const [ok, timestamp, nonce, maxLives, wordTemplate] = await fetch(`${backend}?q=n`).then(res => res.text()).then(res => res.split('.'))
if (ok !== '0') process.exit()
let lives = maxLives, word = wordTemplate
const errors = []
const show = () => process.stdout.write(`\x1b[G\x1b[K${lives} | ${word.replace(/_/g, '.').toUpperCase().padEnd(5)} | ${errors.join('')}`)
process.stdout.write(`♥ | ${'GUESS'.padEnd(word.length)} | ERRORS\n`)
show()
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding('utf-8')
process.stdin.on('data', async key => {
  if (key === '\x03') process.exit()
  if (!/^[A-Z]$/.test(key.toUpperCase())) return
  if (word.toUpperCase().includes(key.toUpperCase())) return
  if (errors.includes(key.toUpperCase())) return
  process.stdout.write('...')
  const [ok, newLives, wordTemplate] = await fetch(`${backend}?q=l.${timestamp}.${nonce}.${key.toUpperCase()}`).then(res => res.text()).then(res => res.split('.'))
  if (ok !== '0') {
    process.stdout.write('\n')
    process.exit()
  }
  if (!wordTemplate.toUpperCase().includes(key.toUpperCase())) errors.push(key.toUpperCase())
  lives = newLives
  word = word.replace(/_/g, (_, index) => wordTemplate[index])
  show()
  if (lives === '0') {
    process.stdout.write('\nYou lost...\n')
    process.exit()
  }
  if (!/_/.test(word)) {
    const [ok, wordTemplate] = await fetch(`${backend}?q=w.${timestamp}.${nonce}.${word.toUpperCase()}`).then(res => res.text()).then(res => res.split('.'))
    if (ok !== '0') {
      process.stdout.write('\n')
      process.exit()
    }
    if (wordTemplate.toUpperCase() !== word.toUpperCase()) {
      process.stdout.write('\n')
      process.exit()
    }
    process.stdout.write('\nYou won!\n')
    process.exit()
  }
})
