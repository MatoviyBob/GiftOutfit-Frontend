import React from 'react'
import { useProxiedImageUrl } from '@/hooks/useProxiedImageUrl'

type PatternItem = {
  left: number
  top: number
  size: number
  opacity: number
}

type PatternBackgroundProps = {
  image: string
  className?: string
}

// Static pattern data - defined once outside component to avoid re-creation on every render
const BASE_PATTERN: PatternItem[] = [
  { left: 25.5, top: 7, size: 7.2, opacity: 0.05 },
  { left: -0.5, top: 40, size: 7.2, opacity: 0.05 },
  { left: 9.3, top: 23.5, size: 7.2, opacity: 0.08 },
  { left: 6.3, top: 65, size: 7.2, opacity: 0.08 },
  { left: 12.8, top: 86.2, size: 7.2, opacity: 0.08 },
  { left: 34, top: 19.5, size: 9.6, opacity: 0.12 },
  { left: 22.2, top: 32, size: 7.2, opacity: 0.12 },
  { left: 16.5, top: 48.5, size: 12, opacity: 0.12 },
  { left: 24, top: 72.5, size: 8.4, opacity: 0.12 },
]

const CENTER_PATTERN: PatternItem[] = [
  { left: 50, top: 9, size: 7.2, opacity: 0.08 },
  { left: 50, top: 77, size: 8.4, opacity: 0.12 },
  { left: 50, top: 95, size: 7.2, opacity: 0.05 },
]

export const PatternBackground = React.memo<PatternBackgroundProps>(({
  image,
  className,
}) => {
  const proxiedImageUrl = useProxiedImageUrl(image)

  // Use static data + computed mirrored (still cheap)
  const mirrored = BASE_PATTERN.flatMap((item) => [
    item,
    { ...item, left: 100 - item.left },
  ])

  const pattern = [...mirrored, ...CENTER_PATTERN]

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {pattern.map((item, index) => (
        <div
          key={index}
          className="pattern-item"
          style={{
            position: 'absolute',
            left: `${item.left}%`,
            top: `${item.top}%`,
            width: `${item.size}%`,
            height: `${item.size}%`,
            transform: 'translate(-50%, -50%)',
            backgroundImage: proxiedImageUrl ? `url(${proxiedImageUrl})` : 'none',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0)',
            opacity: item.opacity,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  )
})

PatternBackground.displayName = 'PatternBackground'
