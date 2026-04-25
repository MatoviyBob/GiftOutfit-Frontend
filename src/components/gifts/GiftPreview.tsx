import type { FC } from 'react'
import { Crown, Trash } from 'lucide-react'
import type { Gift } from '@/types/gift'
import { GiftAnimation } from './GiftAnimation'
import { PatternBackground } from './PatternBackground'
import { buildGiftPatternUrl, buildTelegramGiftUrl } from '@/lib/giftUrls'
import { useTranslation } from '@/i18n'
import { useGiftStore } from '@/stores/giftStore'
import { updateEquippedGift, type TelegramUser } from '@/api/user'

import { useQueryClient } from '@tanstack/react-query'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'

type GiftPreviewProps = {
  gift: Gift | null | undefined
  onDelete?: () => void
}

export const GiftPreview: FC<GiftPreviewProps> = ({ gift, onDelete }) => {
  const { t } = useTranslation()
  const equippedGift = useGiftStore((s) => s.equippedGift)
  const equipGift = useGiftStore((s) => s.equipGift)
  const queryClient = useQueryClient()
  const lp = retrieveLaunchParams()
  const userId = lp.tgWebAppData?.user?.id

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
            className="mr-auto flex h-9 px-4 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm text-white z-20 relative active:scale-95 transition-transform cursor-pointer border border-white/20"
          >
            {t('giftPreview.openInTelegram')}
          </a>
        )}

        {/* Wear/Unequip button — only on own profile, only for gifts with a model */}
        {isOwnProfile && gift.model && (
          <button
            className={`flex h-9 w-11 items-center justify-center rounded-full backdrop-blur-sm border transition-all cursor-pointer z-20 relative active:scale-95 ${
              isEquipped
                ? 'bg-yellow-400/30 border-yellow-400/60 text-yellow-300'
                : 'bg-black/25 border-white/20 text-white'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              const nextGift = isEquipped ? null : gift

              // 1. Update Zustand store immediately (toggles equip/unequip)
              equipGift(gift)

              // 2. Update query cache so re-fetches carry the right value
              if (userId) {
                queryClient.setQueryData<TelegramUser>(['user', userId], (old) =>
                  old ? { ...old, equipped_gift: nextGift } : old
                )
              }

              // 3. Persist to server — fire-and-forget, no rollback.
              //    Local store already has the correct state.
              updateEquippedGift(nextGift)
            }}
            title={isEquipped ? t('giftDrawer.unWear') : t('giftDrawer.wear')}
          >
            <Crown className="w-5 h-5" />
          </button>
        )}

        {onDelete && (
          <button
            className="flex h-9 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white z-20 relative active:scale-95 transition-transform cursor-pointer"
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
