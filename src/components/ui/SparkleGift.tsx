/**
 * Wraps a gift image with animated star sparkles that twinkle around it.
 * Replaces the old CSS `gift-glow` effect.
 */
import type { FC, ReactNode } from 'react'

const SPARKLES = [
  { top: '-6px',  left: '50%',   size: 8,  delay: '0s',    dur: '1.8s' },
  { top: '15%',   right: '-6px', size: 6,  delay: '0.5s',  dur: '2.1s' },
  { bottom: '-6px',left: '30%',  size: 7,  delay: '0.9s',  dur: '1.6s' },
  { top: '60%',   left: '-6px',  size: 5,  delay: '1.3s',  dur: '2.0s' },
  { bottom: '20%',right: '-4px', size: 6,  delay: '0.3s',  dur: '2.3s' },
  { top: '-4px',  left: '20%',   size: 5,  delay: '1.6s',  dur: '1.9s' },
] as const

type Props = {
  children: ReactNode
  className?: string
}

export const SparkleGift: FC<Props> = ({ children, className }) => (
  <div className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
    {children}

    {SPARKLES.map((s, i) => (
      <span
        key={i}
        style={{
          position: 'absolute',
          top:    ('top'    in s ? s.top    : undefined),
          right:  ('right'  in s ? s.right  : undefined),
          bottom: ('bottom' in s ? s.bottom : undefined),
          left:   ('left'   in s ? s.left   : undefined),
          width:  s.size,
          height: s.size,
          animation: `sparkle-appear ${s.dur} ${s.delay} ease-in-out infinite`,
          pointerEvents: 'none',
          // 4-pointed star via clip-path
          background: 'white',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9))',
        }}
      />
    ))}
  </div>
)
