import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { BadgeCheckIcon } from 'lucide-react'
import { useHasActiveSubscription } from '@/hooks/useSubscription'
import { useQuery } from '@tanstack/react-query'
import { getGrids, type Grid } from '@/api/gifts'
import { getMySettings } from '@/api/user'
import { buildGiftModelUrl, buildGiftPatternUrl } from '@/lib/giftUrls'
import { ProxiedImage } from '@/components/ui/ProxiedImage'
import { ProfileViewCounter } from './ProfileViewCounter'
import { PatternBackground } from '@/components/gifts/PatternBackground'
import { SparkleGift } from '@/components/ui/SparkleGift'
import type { Gift } from '@/types/gift'
import type { TelegramUser } from '@/api/user'
import { useTranslation } from '@/i18n'
import { useGiftStore } from '@/stores/giftStore'

interface ProfileHeaderProps {
  user?: TelegramUser;
  isOwnProfile?: boolean;
  topActions?: ReactNode;
}

/** Info about a pinned gift and its grid location, so we can open it in GiftDrawer */
type PinnedGiftCell = {
  gift: Gift
  gridId: number
  rowIndex: number
  cellIndex: number
  posX: number
  posY: number
  animationName: string
  animationDuration: number
}

const POSITION_RANGES = [
  { xMin: 80,   xMax: 125,  yMin: -40, yMax: -20 },
  { xMin: 75,   xMax: 125,  yMin: -20, yMax: 20  },
  { xMin: 115,  xMax: 125,  yMin: 20,  yMax: 60  },
  { xMin: -90,  xMax: -125, yMin: -40, yMax: -20 },
  { xMin: -105, xMax: -125, yMin: -20, yMax: 20  },
  { xMin: -115, xMax: -125, yMin: 20,  yMax: 60  },
]

export const ProfileHeader: FC<ProfileHeaderProps> = ({ user, isOwnProfile = false, topActions }) => {
  const { t } = useTranslation()
  const userName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : t('profile.user')
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U'

  const subscriptionStatus = useHasActiveSubscription()
  const hasActiveSubscription = isOwnProfile
    ? subscriptionStatus
    : (user?.subscription_active ?? false)

  const { data: grids = [] } = useQuery({
    queryKey: ['grids', user?.id],
    queryFn: () => getGrids(user!.id),
    enabled: !!user?.id,
  })

  // Equipped gift: own profile → ['my-settings'] query (same pattern as grids), other → server field
  const { data: mySettings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    enabled: isOwnProfile,
  })
  const setSelectedCell = useGiftStore((s) => s.setSelectedCell)
  const wornGift: Gift | null = isOwnProfile
    ? (mySettings?.equipped_gift ?? null)
    : (user?.equipped_gift ?? null)

  const wornBgStyle = wornGift?.background
    ? { background: `radial-gradient(circle, ${wornGift.background.hex.centerColor} 0%, ${wornGift.background.hex.edgeColor} 100%)` }
    : undefined

  const wornPatternUrl = wornGift?.pattern && wornGift?.name
    ? buildGiftPatternUrl(wornGift.name, wornGift.pattern)
    : null

  const wornModelUrl = wornGift?.model && wornGift?.name
    ? buildGiftModelUrl(wornGift.name, wornGift.model)
    : null

  // Build pinned gifts list with cell location info.
  // If a gift is also the worn gift, exclude it from floating (priority → near username).
  const pinnedGiftCells = useMemo<PinnedGiftCell[]>(() => {
    if (grids.length === 0) return []
    const mainAlbum: Grid = grids[0]
    const result: PinnedGiftCell[] = []
    let posIdx = 0

    for (let rowIdx = 0; rowIdx < 2 && result.length < 6; rowIdx++) {
      const row = mainAlbum.rows[rowIdx]
      if (!row) continue
      for (let cellIdx = 0; cellIdx < row.cells.length && result.length < 6; cellIdx++) {
        const cell = row.cells[cellIdx]
        if (!cell?.gift?.model || !cell.pinned) continue

        // If this gift is the worn one, skip it from floating
        const isWorn = wornGift &&
          cell.gift.id === wornGift.id &&
          cell.gift.name === wornGift.name
        if (isWorn) continue

        const range = POSITION_RANGES[posIdx % POSITION_RANGES.length]
        const posX = Math.round(Math.random() * (range.xMax - range.xMin) + range.xMin)
        const posY = Math.round(Math.random() * (range.yMax - range.yMin) + range.yMin)
        const animations = ['float', 'float-2', 'float-3']

        result.push({
          gift: cell.gift,
          gridId: mainAlbum.id,
          rowIndex: rowIdx,
          cellIndex: cellIdx,
          posX,
          posY,
          animationName: animations[posIdx % animations.length],
          animationDuration: 3 + (posIdx % 3) * 0.5,
        })
        posIdx++
      }
    }
    return result
  }, [grids, wornGift])

  /** Find the cell location of the worn gift in order to open GiftDrawer */
  const findWornCell = () => {
    if (!wornGift) return null
    for (const grid of grids) {
      for (const row of grid.rows) {
        for (let ci = 0; ci < row.cells.length; ci++) {
          const cell = row.cells[ci]
          if (cell?.gift?.id === wornGift.id && cell?.gift?.name === wornGift.name) {
            return { gridId: grid.id, rowIndex: row.row_index, cellIndex: ci, gift: cell.gift }
          }
        }
      }
    }
    return null
  }

  const handleWornGiftClick = () => {
    if (!isOwnProfile) return
    const loc = findWornCell()
    if (!loc) return
    setSelectedCell({ ...loc, isOwnProfile: true })
  }

  const handlePinnedGiftClick = (cell: PinnedGiftCell) => {
    if (!isOwnProfile) return
    setSelectedCell({
      gridId: cell.gridId,
      rowIndex: cell.rowIndex,
      cellIndex: cell.cellIndex,
      gift: cell.gift,
      isOwnProfile: true,
    })
  }

  return (
    <div
      className="relative flex flex-col items-center px-4 pb-8 overflow-hidden transition-all duration-500"
      style={wornBgStyle}
    >
      {wornPatternUrl && <PatternBackground image={wornPatternUrl} />}

      {/* Fade-out overlay: gradient from theme background (bottom) to transparent (top) */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

      {/* Top action buttons (share, settings) — inside the background */}
      {topActions && (
        <div className="relative z-10 w-full">
          {topActions}
        </div>
      )}

      {/* Avatar + floating pinned gifts */}
      <div className="relative flex justify-center items-center mb-4 w-full z-10">
        <Avatar className="w-28 h-28">
          <AvatarImage src={user?.photo_url} alt={userName} />
          <AvatarFallback className="text-3xl bg-muted text-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>

        {pinnedGiftCells.length > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full h-full">
            {pinnedGiftCells.map((item) => (
              <div
                key={`${item.gift.id}-${item.gift.model}`}
                className={`absolute ${isOwnProfile ? 'pointer-events-auto cursor-pointer' : ''}`}
                style={{
                  left: `calc(50% + ${item.posX}px)`,
                  top: `calc(50% + ${item.posY}px)`,
                  animation: `${item.animationName} ${item.animationDuration}s ease-in-out infinite`,
                }}
                onClick={() => handlePinnedGiftClick(item)}
              >
                <SparkleGift>
                  <ProxiedImage
                    src={buildGiftModelUrl(item.gift.name, item.gift.model!)}
                    alt={`${item.gift.name} ${item.gift.model}`}
                    className="w-8 h-8 object-contain"
                  />
                </SparkleGift>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Username · worn gift icon · premium badge */}
      <div className="relative z-10 flex items-center gap-1.5 mb-1">
        <h1 className="text-xl font-semibold text-foreground text-shadow-sm">{userName}</h1>

        {wornModelUrl && (
          <div
            className={isOwnProfile ? 'cursor-pointer active:scale-90 transition-transform' : ''}
            onClick={handleWornGiftClick}
          >
            <SparkleGift>
              <ProxiedImage
                src={wornModelUrl}
                alt={wornGift?.name ?? ''}
                className="w-5 h-5 object-contain"
                title={wornGift?.name}
              />
            </SparkleGift>
          </div>
        )}

        {hasActiveSubscription && (
          <BadgeCheckIcon className="w-5 h-5 text-blue-500" />
        )}
      </div>

      <p className="relative z-10 text-sm text-muted-foreground text-shadow-sm mb-2">
        {isOwnProfile ? t('profile.online') : t('profile.lastSeen')}
      </p>

      <div className="relative z-10 text-shadow-sm mb-1">
        <ProfileViewCounter
          viewCount={user?.view_count}
          uniqueViewCount={user?.unique_view_count}
        />
      </div>
    </div>
  )
}
