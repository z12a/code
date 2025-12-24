import React, { useEffect, useRef, useState } from 'react'
import { shareUrlOrCopy, copyText } from './share'

const PRIZES = [
  { id: 'small', text: '再接再厉：免费咖啡一杯 ☕', weight: 50 },
  { id: 'coupon', text: '幸运奖：优惠券 10% 🎟️', weight: 30 },
  { id: 'second', text: '二等奖：价值 50 元代金券 💳', weight: 12 },
  { id: 'first', text: '一等奖：智能手表 🎁', weight: 6 },
  { id: 'grand', text: '特等奖：MacBook Pro 💻', weight: 1 },
  { id: 'blank', text: '摸到空白：再试一次 😊', weight: 20 }
]

function weightedPick(arr) {
  const total = arr.reduce((s, a) => s + (a.weight || 1), 0)
  let r = Math.random() * total
  for (const item of arr) {
    if (r < (item.weight || 1)) return item
    r -= item.weight || 1
  }
  return arr[0]
}

export default function App() {
  const cardRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [prize, setPrize] = useState({ text: '待揭晓', id: 'none' })
  const [statusText, setStatusText] = useState('已刮开：0%')
  const drawingRef = useRef(false)
  const revealedRef = useRef(false)
  const [showModal, setShowModal] = useState(false)
  const [history, setHistory] = useState([])
  const [notice, setNotice] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redemptionResult, setRedemptionResult] = useState(null) // { code, record }

  function pickPrize(fromParam) {
    if (fromParam) return setPrize({ text: fromParam, id: 'shared' })
    setPrize(weightedPick(PRIZES))
  }

  function saveHistory(item) {
    try {
      const prev = JSON.parse(localStorage.getItem('scratch_history') || '[]')
      prev.unshift({ text: item.text || item, id: item.id || 'unknown', time: Date.now() })
      const next = prev.slice(0, 20)
      localStorage.setItem('scratch_history', JSON.stringify(next))
      setHistory(next)
    } catch (e) {
      console.warn('saveHistory error', e)
    }
  }

  function fillMask() {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#bfc7cc')
    g.addColorStop(0.5, '#9da5aa')
    g.addColorStop(1, '#bfc7cc')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // 微小噪点（可能在某些环境被禁止）
    try {
      const imgData = ctx.getImageData(0, 0, w, h)
      for (let i = 0; i < imgData.data.length; i += 4) {
        const v = Math.random() * 20 - 10
        imgData.data[i] = Math.max(180, Math.min(255, imgData.data[i] + v))
        imgData.data[i + 1] = Math.max(180, Math.min(255, imgData.data[i + 1] + v))
        imgData.data[i + 2] = Math.max(180, Math.min(255, imgData.data[i + 2] + v))
      }
      ctx.putImageData(imgData, 0, 0)
    } catch (err) {
      console.warn('putImageData error', err)
    }

    ctx.fillStyle = 'rgba(20,20,20,0.12)'
    ctx.font = 'bold 18px system-ui,Segoe UI,Roboto'
    ctx.textAlign = 'center'
    ctx.fillText('刮开此处', w / 2, h / 2 - 8)
    ctx.font = '14px system-ui,Segoe UI,Roboto'
    ctx.fillText('有机会抽中大奖', w / 2, h / 2 + 14)
    ctx.globalCompositeOperation = 'destination-out'
  }

  function resizeCanvas() {
    const canvas = canvasRef.current
    const card = cardRef.current
    if (!canvas || !card) return
    const rect = card.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctxRef.current = ctx
    fillMask()
  }

  function getLocalPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = (e.clientX ?? (e.touches && e.touches[0].clientX))
    const clientY = (e.clientY ?? (e.touches && e.touches[0].clientY))
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function draw(e) {
    if (!drawingRef.current || revealedRef.current) return
    e.preventDefault()
    const ctx = ctxRef.current
    const p = getLocalPos(e)
    ctx.beginPath()
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  function checkReveal() {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    try {
      const img = ctx.getImageData(0, 0, w, h)
      let cleared = 0
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] === 0) cleared++
      const total = img.data.length / 4
      const pct = Math.round((cleared / total) * 100)
      setStatusText(`已刮开：${pct}%`)
      if (pct >= 60) revealAll()
    } catch (err) {
      console.warn('无法读取像素', err)
    }
  }

  function revealAll() {
    if (revealedRef.current) return
    revealedRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.transition = 'opacity 600ms ease'
    canvas.style.opacity = '0'
    setTimeout(() => {
      if (canvas.parentElement) canvas.remove()
      setStatusText('已全部揭晓')
      // 打开结果模态并保存历史
      setShowModal(true)
      saveHistory(prize)
    }, 650)
  }

  function reset() {
    revealedRef.current = false
    const card = cardRef.current
    if (!card) return
    // 重新插入 canvas（如果被移除）
    let canvas = canvasRef.current
    if (!canvas || !document.body.contains(canvas)) {
      canvas = document.createElement('canvas')
      canvas.id = 'mask'
      card.appendChild(canvas)
      canvasRef.current = canvas
      canvas.addEventListener('pointerdown', pointerDown)
      window.addEventListener('pointerup', pointerUp)
      canvas.addEventListener('pointermove', draw)
    }
    pickPrize()
    resizeCanvas()
    canvas.style.opacity = '1'
    setStatusText('已刮开：0%')
  }

  function pointerDown(e) {
    if (revealedRef.current) return
    drawingRef.current = true
    draw(e)
  }
  function pointerUp() {
    drawingRef.current = false
    setTimeout(checkReveal, 50)
  }

  async function doShare() {
    const text = `我在刮刮乐中获得：${prize.text}`
    const url = `${location.origin}${location.pathname}?prize=${encodeURIComponent(prize.text)}`
    const res = await shareUrlOrCopy({ title: '刮刮乐', text, url })
    if (res.shared) {
      setNotice('已通过系统分享')
    } else if (res.copied) {
      setNotice('已复制分享链接到剪贴板')
    } else {
      setNotice('分享失败：已复制链接作备用')
      try { await copyText(url) } catch (e) { console.warn(e) }
    }
    setTimeout(() => setNotice(''), 2000)
  }

  async function copyLink() {
    const url = `${location.origin}${location.pathname}?prize=${encodeURIComponent(prize.text)}`
    const ok = await copyText(url)
    setNotice(ok ? '已复制链接' : '复制失败')
    setTimeout(() => setNotice(''), 1500)
  }

  async function redeemPrize() {
    setRedeeming(true)
    try {
      const r = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize: prize.text })
      })
      const j = await r.json()
      if (j.ok) {
        setRedemptionResult({ code: j.code, record: j.record })
        setNotice('兑奖申请已生成')
        // 保存到历史
        saveHistory({ text: `${prize.text}（兑奖码 ${j.code}）`, id: 'redeemed' })
      } else {
        setNotice('申请失败')
      }
    } catch (e) {
      console.warn(e)
      setNotice('申请出错')
    }
    setRedeeming(false)
    setTimeout(() => setNotice(''), 1500)
  }

  // 生成更美的分享图并在右下角绘制二维码（异步）
  async function downloadImage() {
    const w = 1200
    const h = 630
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')

    // 背景渐变
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#0b1220')
    g.addColorStop(1, '#082033')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // 圆角卡片
    const pad = 48
    const cardW = w - pad * 2
    const cardH = h - pad * 2
    ctx.fillStyle = '#071826'
    roundRect(ctx, pad, pad, cardW, cardH, 20)
    ctx.fill()

    // 标题
    ctx.fillStyle = '#ffd166'
    ctx.font = '700 28px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('刮刮乐 - 我的奖品', pad + 28, pad + 48)

    // 奖项文字
    ctx.fillStyle = '#fff'
    ctx.font = '700 48px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(prize.text, w / 2, h / 2)

    // 生成分享链接与二维码
    const shareUrl = `${location.origin}${location.pathname}?prize=${encodeURIComponent(prize.text)}`
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 260 })
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => (img.onload = res))
      const qrSize = 180
      ctx.drawImage(img, w - pad - qrSize, h - pad - qrSize, qrSize, qrSize)
    } catch (e) {
      console.warn('生成二维码失败', e)
    }

    // 版权小字
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('分享自 刮刮乐', pad + 28, h - pad - 12)

    const data = c.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = data
    a.download = 'scratch-result.png'
    a.click()
    setNotice('图片已生成并下载')
    setTimeout(() => setNotice(''), 1500)
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  useEffect(() => {
    // 初始化
    const params = new URLSearchParams(location.search)
    const shared = params.get('prize')
    if (shared) {
      pickPrize(decodeURIComponent(shared))
      // 直接显示模态以便分享链接打开后展示结果
      setTimeout(() => setShowModal(true), 300)
    } else {
      pickPrize()
    }
    const canvas = canvasRef.current
    ctxRef.current = canvas.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('load', resizeCanvas)
    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointermove', draw)
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false })

    try {
      const prev = JSON.parse(localStorage.getItem('scratch_history') || '[]')
      setHistory(prev)
    } catch (e) {
      console.warn(e)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointermove', draw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="wrap">
      <h1>刮刮乐</h1>
      <p>用鼠标或手指来刮开覆盖层，看看能否刮中大奖！</p>
      <div className="card" id="card" ref={cardRef}>
        <div className="prize" id="prize">
          🎉 恭喜！中奖：<span id="prizeText">{prize.text}</span>
        </div>
        <canvas id="mask" ref={canvasRef}></canvas>
      </div>
      <div className="controls">
        <button className="btn" id="reset" onClick={reset}>
          重新生成
        </button>
        <button className="btn primary" id="reveal" onClick={revealAll}>
          立即揭晓
        </button>
      </div>
      <div className="status" id="status">{statusText}</div>
      <div className="hint">提示：通过滑动或点击并移动来刮开覆盖层，达到 60% 后自动揭示全部。</div>

      {/* 历史记录 */}
      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '8px 0' }}>历史记录</h4>
        <div style={{ maxHeight: 160, overflow: 'auto' }}>
          {history.length === 0 && <div style={{ color: 'var(--muted)' }}>暂无历史</div>}
          {history.map((h, i) => (
            <div key={i} style={{ fontSize: 13, color: '#dce7ff', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.03)' }}>
              <div>{h.text}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(h.time).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 结果模态 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>你的奖品</h3>
            <p style={{ fontSize: 20, margin: '8px 0 18px' }}>{prize.text}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn" onClick={doShare}>分享</button>
              <button className="btn" onClick={copyLink}>复制链接</button>
              <button className="btn" onClick={downloadImage}>下载图片</button>
              {redemptionResult ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    兑奖码：<strong style={{ color: '#ffd166' }}>{redemptionResult.code}</strong>
                  </div>
                  <button className="btn" onClick={() => { copyText(redemptionResult.code); setNotice('已复制兑奖码'); setTimeout(()=>setNotice(''),1200)}}>复制兑奖码</button>
                  <button className="btn" onClick={async () => {
                    // 查询状态
                    try {
                      const r = await fetch(`/api/redeem/${redemptionResult.code}`)
                      const j = await r.json()
                      if (j.ok) setNotice(j.record.used ? '已使用' : '未使用')
                      else setNotice('查询失败')
                    } catch (e) { setNotice('查询出错') }
                    setTimeout(()=>setNotice(''),1200)
                  }}>查询状态</button>
                </div>
              ) : (
                <button className="btn primary" onClick={redeemPrize} disabled={redeeming}>{redeeming ? '申请中...' : '申请兑奖'}</button>
              )}
              <button className="btn" onClick={() => setShowModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 通知 */}
      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

