import { memo, type FC } from 'react'
// import { GiftAnimation } from './GiftAnimation'
import type { Gift } from '@/types/gift'
import { PatternBackground } from './PatternBackground'
import { Pin, Plus } from 'lucide-react'
import { buildGiftModelUrl, buildGiftPatternUrl } from '@/lib/giftUrls'
import { ProxiedImage } from '@/components/ui/ProxiedImage'

type Props = {
  gift?: Gift | null
  isPinned?: boolean
  isOwnProfile?: boolean
  onClick: () => void
}

export const GiftCard: FC<Props> = memo(({
  gift,
  isPinned,
  isOwnProfile = true,
  onClick,
}) => {
  const isEmpty = !gift
  const isClickable = !isEmpty || isOwnProfile

  return (
    <div
      style={{
        ...(gift?.background ? {
          background: `radial-gradient(circle, ${gift.background.hex.centerColor} 0%, ${gift.background.hex.edgeColor} 100%)`
        } : {})
      }}
      className={`${!gift?.background ? 'bg-card' : ''} border-0 relative aspect-square rounded-lg flex items-center justify-center border border-border/50 ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'} transition-transform select-none overflow-hidden`}
      onClick={isClickable ? onClick : undefined}
    >
      {isPinned && (
        <div className="absolute top-1 left-2 z-10 rounded-full p-1">
          <Pin className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="relative h-full w-full flex items-center justify-center overflow-hidden rounded-lg">
        {gift && <>
          {gift?.pattern && <PatternBackground
            image={buildGiftPatternUrl(gift.name, gift.pattern)}
          /> }

          <div className="absolute inset-0 opacity-[0.03]">
            <div className="grid grid-cols-3 gap-0.5 p-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-full h-full bg-foreground rounded-[2px]"></div>
              ))}
            </div>
          </div>

          <div 
            style={{
              ...(gift?.background ? {
                background: gift.background.hex.edgeColor
              } : {})
            }}
            className={`absolute top-2 -right-7 w-25 text-center ${!gift?.background ? 'bg-zinc-800' : ''} rotate-45 z-12`}
          >
            <span className="text-xs text-white/80 font-medium">#{gift.id}</span>
          </div>

          <div className="relative z-10 flex items-center justify-center text-3xl">
            <ProxiedImage src={buildGiftModelUrl(gift.name, gift.model || 'Original')} className="w-2/3 h-full/2" />
            {/* <GiftAnimation gift={gift} autoplay={false} className="w-2/3 h-full/2" /> */}
          </div>
        </> || (
          // На чужом профиле не показываем "+" в пустых ячейках
          isOwnProfile ? <Plus className="text-foreground/60" /> : null
        )}
      </div>
    </div>
  )
})
