import { FC, useEffect, useRef } from 'react'
import styles from './AITopology.module.less'

interface NodeItem {
  id: string
  label: string
  icon: string
  angle: number
}

const nodeConfigs: NodeItem[] = [
  { id: 'box', label: '包装盒设计', icon: '\u{1F4E6}', angle: 0 },
  { id: 'bottle', label: '瓶型标签设计', icon: '\u{1F37E}', angle: 72 },
  { id: 'clothing', label: '服装外观设计', icon: '\u{1F455}', angle: 144 },
  { id: 'ceramic', label: '瓷器表面设计', icon: '\u{1F3FA}', angle: 216 },
  { id: 'customDesign', label: '自定义设计', icon: '\u{1F3A8}', angle: 288 },
]

const AITopology: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    // Animation state
    let frame = 0
    let animationId: number

    const draw = () => {
      const rect = container.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const radius = Math.min(rect.width, rect.height) * 0.32

      ctx.clearRect(0, 0, rect.width, rect.height)

      // Draw connecting lines with gradient and pulse effect
      nodeConfigs.forEach((node, i) => {
        const angle = (node.angle - 90) * (Math.PI / 180)
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        // Create gradient line
        const gradient = ctx.createLinearGradient(centerX, centerY, x, y)
        const pulseAlpha = 0.3 + Math.sin(frame * 0.03 + i * 0.5) * 0.2
        gradient.addColorStop(0, `rgba(102, 126, 234, ${pulseAlpha})`)
        gradient.addColorStop(1, `rgba(255, 122, 24, ${pulseAlpha * 0.6})`)

        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw data flow particles
        const particleCount = 3
        for (let p = 0; p < particleCount; p++) {
          const progress = ((frame * 0.01 + i * 0.2 + p * 0.33) % 1)
          const px = centerX + (x - centerX) * progress
          const py = centerY + (y - centerY) * progress

          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          const particleGradient = ctx.createRadialGradient(px, py, 0, px, py, 6)
          particleGradient.addColorStop(0, `rgba(255, 122, 24, ${0.8 * (1 - progress * 0.5)})`)
          particleGradient.addColorStop(1, 'rgba(255, 122, 24, 0)')
          ctx.fillStyle = particleGradient
          ctx.fill()
        }
      })

      // Draw center glow
      const glowSize = 80 + Math.sin(frame * 0.02) * 10
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize)
      centerGlow.addColorStop(0, 'rgba(102, 126, 234, 0.3)')
      centerGlow.addColorStop(0.5, 'rgba(102, 126, 234, 0.1)')
      centerGlow.addColorStop(1, 'rgba(102, 126, 234, 0)')
      ctx.fillStyle = centerGlow
      ctx.fillRect(0, 0, rect.width, rect.height)

      // Draw orbit ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(102, 126, 234, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      frame++
      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className={styles.container} ref={containerRef}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Central AI Core */}
      <div className={styles.aiCore}>
        <div className={styles.aiCoreInner}>
          <div className={styles.aiIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor" opacity="0.5"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
              <path d="M12 8v1M12 15v1M8 12h1M15 12h1M9.17 9.17l.71.71M14.12 14.12l.71.71M9.17 14.83l.71-.71M14.12 9.88l.71-.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.aiLabel}>AI</span>
        </div>
        <div className={styles.aiPulse} />
        <div className={styles.aiPulse2} />
      </div>

      {/* Surrounding nodes */}
      {nodeConfigs.map((node) => {
        const angle = (node.angle - 90) * (Math.PI / 180)
        const r = 38 // percentage
        const x = 50 + Math.cos(angle) * r
        const y = 50 + Math.sin(angle) * r

        return (
          <div
            key={node.id}
            className={styles.node}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              '--delay': `${node.angle * 5}ms`
            } as React.CSSProperties}
          >
            <div className={styles.nodeIcon}>{node.icon}</div>
            <span className={styles.nodeLabel}>{node.label}</span>
          </div>
        )
      })}

      {/* Decorative elements */}
      <div className={styles.gridOverlay} />
      <div className={styles.scanLine} />
    </div>
  )
}

export default AITopology
