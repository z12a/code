const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { randomBytes } = require('crypto')

const DATA_FILE = path.join(__dirname, 'data.json')
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch (e) {
    return []
  }
}
function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8')
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/redeem/:code', (req, res) => {
  const code = req.params.code
  const data = readData()
  const found = data.find((r) => r.code === code)
  if (!found) return res.status(404).json({ ok: false, error: 'not_found' })
  res.json({ ok: true, record: found })
})

app.post('/api/redeem', (req, res) => {
  const { prize, name } = req.body || {}
  if (!prize) return res.status(400).json({ ok: false, error: 'missing_prize' })
  const code = randomBytes(4).toString('hex')
  const rec = { code, prize, name: name || '', createdAt: Date.now(), used: false }
  const data = readData()
  data.unshift(rec)
  writeData(data)
  res.json({ ok: true, code, record: rec })
})

app.post('/api/redeem/:code/use', (req, res) => {
  const code = req.params.code
  const data = readData()
  const idx = data.findIndex((r) => r.code === code)
  if (idx === -1) return res.status(404).json({ ok: false, error: 'not_found' })
  if (data[idx].used) return res.json({ ok: false, error: 'already_used' })
  data[idx].used = true
  data[idx].usedAt = Date.now()
  writeData(data)
  res.json({ ok: true, record: data[idx] })
})

// 简单的健康检查
app.get('/api/health', (req, res) => res.json({ ok: true }))

const port = process.env.PORT || 3333
app.listen(port, () => console.log(`Redeem server listening on ${port}`))
