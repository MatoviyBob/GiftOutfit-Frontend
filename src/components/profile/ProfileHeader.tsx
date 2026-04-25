import type { FC } from 'react'
import { useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { BadgeCheckIcon } from 'lucide-react'
import { useHasActiveSubscription } from '@/hooks/useSubscription'
import { useQuery } from '@tanstack/react-query'
import { getGrids } from '@/api/gifts'
import { buildGiftModelUrl, buildGiftPatternUrl } from '@/lib/giftUrls'
import { ProxiedImage } from '@/components/ui/ProxiedImage'
import { ProfileViewCounter } from './ProfileViewCounter'
import { PatternBackground } from '@/components/gifts/PatternBackground'
import type { Gift } from '@/types/gift'
import { useTranslation } from '@/i18n'
import { useGiftStore } from '@/stores/giftStore'

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  subscription_active?: boolean;
  view_count?: number;
  unique_view_count?: number;
}

interface ProfileHeaderProps {
  user?: TelegramUser;
  isOwnProfile?: boolean;
}

export const ProfileHeader: FC<ProfileHeaderProps> = ({ user, isOwnProfile = false }) => {
    const { t } = useTranslation()
    const userName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : t('profile.user')
    const userInitials = user
        ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
        : 'U'

    const subscriptionStatus = useHasActiveSubscription();
    const hasActiveSubscription = isOwnProfile
        ? subscriptionStatus
        : (user?.subscription_active ?? false);

    const { data: grids = [] } = useQuery({
        queryKey: ['grids', user?.id],
        queryFn: () => getGrids(user!.id),
        enabled: !!user?.id,
    })

    // Equipped gift — only relevant on own profile (stored in localStorage)
    const equippedGift = useGiftStore((s) => s.equippedGift)
    const wornGift: Gift | null = isOwnProfile ? equippedGift : null

    const wornBgStyle = wornGift?.background
        ? { background: `radial-gradient(circle, ${wornGift.background.hex.centerColor} 0%, ${wornGift.background.hex.edgeColor} 100%)` }
        : undefined

    const wornPatternUrl = wornGift?.pattern && wornGift?.name
        ? buildGiftPatternUrl(wornGift.name, wornGift.pattern)
        : null

    const wornModelUrl = wornGift?.model && wornGift?.name
        ? buildGiftModelUrl(wornGift.name, wornGift.model)
        : null

    // Pinned gifts from main album
    const giftModels = useMemo(() => {
        if (grids.length === 0) return []
        const mainAlbum = grids[0]
        const pinnedGifts: Gift[] = []
        for (let rowIdx = 0; rowIdx < 2 && pinnedGifts.length < 6; rowIdx++) {
            const row = mainAlbum.rows[rowIdx]
            if (!row) continue
            for (let cellIdx = 0; cellIdx < 3 && cellIdx < row.cells.length && pinnedGifts.length < 6; cellIdx++) {
                const cell = row.cells[cellIdx]
                if (cell && cell.gift && cell.gift.model && cell.pinned) {
                    pinnedGifts.push(cell.gift)
                }
            }
        }
        return pinnedGifts.slice(0, 6)
    }, [grids])

    const giftPositions = useMemo(() => {
        if (giftModels.length === 0) return []
        const positionRanges = [
            { xMin: 80, xMax: 125, yMin: -40, yMax: -20 },
            { xMin: 75, xMax: 125, yMin: -20, yMax: 20 },
            { xMin: 115, xMax: 125, yMin: 20, yMax: 60 },
            { xMin: -90, xMax: -125, yMin: -40, yMax: -20 },
            { xMin: -105, xMax: -125, yMin: -20, yMax: 20 },
            { xMin: -115, xMax: -125, yMin: 20, yMax: 60 },
        ]
        return giftModels.map((_, index) => {
            const range = positionRanges[index] || { xMin: 0, xMax: 0, yMin: 0, yMax: 0 }
            return {
                x: Math.round(Math.random() * (range.xMax - range.xMin) + range.xMin),
                y: Math.round(Math.random() * (range.yMax - range.yMin) + range.yMin),
            }
        })
    }, [giftModels])

    return (
        <div
            className="relative flex flex-col items-center px-4 pt-6 pb-4 overflow-hidden transition-all duration-500"
            style={wornBgStyle}
        >
            {/* Pattern overlay from worn gift */}
            {wornPatternUrl && <PatternBackground image={wornPatternUrl} />}

            <div className="relative flex justify-center items-center mb-4 w-full z-10">
                <Avatar className="w-28 h-28 border-2 border-background">
                    <AvatarImage src={user?.photo_url} alt={userName} />
                    <AvatarFallback className="text-3xl bg-muted text-foreground">
                        {userInitials}
                    </AvatarFallback>
                </Avatar>

                {giftModels.length > 0 && giftPositions.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full h-full">
                        {giftModels.map((gift, index) => {
                            const pos = giftPositions[index]
                            if (!pos) return null
                            const animations = ['float', 'float-2', 'float-3']
                            const animationName = animations[index % animations.length]
                            const animationDuration = 3 + (index % 3) * 0.5
                            return (
                                <div
                                    key={`${gift.id}-${gift.model}`}
                                    className="absolute"
                                    style={{
                                        left: `calc(50% + ${pos.x}px)`,
                                        top: `calc(50% + ${pos.y}px)`,
                                        animation: `${animationName} ${animationDuration}s ease-in-out infinite`,
                                    }}
                                >
                                    <ProxiedImage
                                        src={buildGiftModelUrl(gift.name, gift.model!)}
                                        alt={`${gift.name} ${gift.model}`}
                                        className="w-8 h-8 object-contain gift-glow"
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Username row: name · worn gift icon · premium badge */}
            <div className="relative z-10 flex items-center gap-1.5 mb-1">
                <h1 className="text-xl font-semibold text-foreground">{userName}</h1>

                {wornModelUrl && (
                    <ProxiedImage
                        src={wornModelUrl}
                        alt={wornGift?.name ?? ''}
                        className="w-5 h-5 object-contain"
                        title={wornGift?.name}
                    />
                )}

                {hasActiveSubscription && (
                    <div className="flex items-center">
                        <BadgeCheckIcon className="w-5 h-5 text-blue-500" />
                    </div>
                )}
            </div>

            <p className="relative z-10 text-sm text-muted-foreground mb-4">
                {isOwnProfile ? t('profile.online') : t('profile.lastSeen')}
            </p>

            <ProfileViewCounter
                viewCount={user?.view_count}
                uniqueViewCount={user?.unique_view_count}
            />
        </div>
    )
}
