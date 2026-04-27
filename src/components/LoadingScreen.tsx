import { useState, useEffect, useRef } from 'react'

type LoadingScreenProps = {
  onComplete: () => void
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const startTimeRef = useRef<number | null>(null)

  // Проверяем, может изображение уже загружено (из кэша браузера)
  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    if (img.complete && img.naturalWidth > 0) {
      setImageLoaded(true)
      startTimeRef.current = Date.now()
    }
  }, [])

  // Отсчет минимального времени показа после загрузки изображения
  useEffect(() => {
    if (!imageLoaded && !imageError) {
      return // Ждем загрузки изображения
    }

    // Минимальное время показа - 3 секунды (чтобы профиль успел прогрузиться)
    const minDisplayTime = 3000
    const fadeOutDuration = 500 // Длительность плавного перехода

    const checkAndFade = () => {
      if (startTimeRef.current === null) return

      const elapsed = Date.now() - startTimeRef.current
      const remaining = minDisplayTime - elapsed

      if (remaining <= 0) {
        // Начинаем плавное исчезновение
        setIsFading(true)

        // После завершения анимации скрываем экран
        setTimeout(() => {
          setIsVisible(false)
          onComplete()
        }, fadeOutDuration)
      } else {
        // Проверяем снова через оставшееся время
        setTimeout(checkAndFade, remaining)
      }
    }

    // Запускаем проверку
    checkAndFade()
  }, [imageLoaded, imageError, onComplete])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="bg-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'none',
      }}
    >
      <img
        ref={imageRef}
        src="./loading-screen.webp"
        alt="Loading"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in',
        }}
        onLoad={() => {
          setImageLoaded(true)
          startTimeRef.current = Date.now()
        }}
        onError={() => {
          setImageError(true)
          startTimeRef.current = Date.now()
        }}
      />
    </div>
  )
}

