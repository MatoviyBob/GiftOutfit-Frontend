import type { FC } from 'react'
import { Crown, Trash } from 'lucide-react'
import type { Gift } from '@/types/gift'
import { GiftAnimation } from './GiftAnimation'
import { PatternBackground } from './PatternBackground'
import { buildGiftPatternUrl, buildTelegramGiftUrl } from '@/lib/giftUrls'
import { useTranslation } from '@/i18n'
import { useGiftStore } from '@/stores/giftStore'

type GiftPreviewProps = {
  gift: Gift | null | undefined
  onDelete?: () => void
}

export const GiftPreview: FC<GiftPreviewProps> = ({ gift, onDelete }) => {
  const { t } = useTranslation()
  const equippedGift = useGiftStore((s) => s.equippedGift)
  const equipGift = useGiftStore((s) => s.equipGift)

  if (!gift) return (
    <div className="relative min-h-[200px] text-white overflow-hidden bg-muted"></div>
  )

  const backgroundStyle = gift.background
    ? {
        background: `radial-gradient(circle, ${gift.background.hex.centerColor} 0%, ${gift.background.hex.edgeColor} 100%)`,
      }
    : undefined

  const hasPattern = !!gift.pattern
  const patternUrl = gift.pattern ? buildGiftPatternUrl(gift.name, gift.pattern) : null
  const telegramUrl = gift.url ?? (gift.id > 0 ? buildTelegramGiftUrl(gift.name, gift.id) : null)

  const isOwnProfile = !!onDelete
  const isEquipped = equippedGift?.id === gift.id && equippedGift?.name === gift.name

  return (
    <div
      className="relative min-h-[200px] text-white overflow-hidden bg-muted"
      style={backgroundStyle}
    >
      {hasPattern && patternUrl && <PatternBackground image={patternUrl} />}

      <div className="absolute w-full my-4 px-4 z-20 flex items-center justify-end mb-2 gap-2">
        {telegramUrl && (
          <a
            href={telegramUrl}
            className="mr-auto flex h-9 px-4 items-center justify-center rounded-full bg-white/15 backdrop-blur text-white z-20 relative active:scale-95 transition-transform cursor-pointer"
          >
            {t('giftPreview.openInTelegram')}
          </a>
        )}

        {/* Wear/Unequip button — only on own profile, only for gifts with a model */}
        {isOwnProfile && gift.model && (
          <button
            className={`flex h-9 w-13 items-center justify-center rounded-full backdrop-blur text-white z-20 relative active:scale-95 transition-all cursor-pointer ${
              isEquipped
                ? 'bg-yellow-400/40 ring-1 ring-yellow-400/70'
                : 'bg-white/15'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              equipGift(gift)
            }}
            title={isEquipped ? t('giftDrawer.unWear') : t('giftDrawer.wear')}
          >
            <Crown className={`w-5 h-5 ${isEquipped ? 'text-yellow-300' : 'text-white'}`} />
          </button>
        )}

        {onDelete && (
          <button
            className="flex h-9 w-13 items-center justify-center rounded-full bg-white/15 backdrop-blur text-white z-20 relative active:scale-95 transition-transform cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="relative h-full z-10 flex items-center justify-center">
        <div className="h-5/8 w-full max-w-xs rounded-3xl flex items-center justify-center overflow-hidden">
          <GiftAnimation gift={gift} className="h-full" />
        </div>

        {telegramUrl && (
          <div className="absolute b-0 w-full text-center text-white/70 text-xs bottom-0 py-3">
            <a href={telegramUrl}>{t('giftPreview.collectible')} #{gift.id}</a>
          </div>
        )}
      </div>
    </div>
  )
}
