import type { FC } from 'react'
import { useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { Page } from '@/components/Page'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const GiftDrawer = lazy(() => import('@/components/gifts/GiftDrawer'))
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileCard } from '@/components/profile/ProfileCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { Settings, Share2 } from "lucide-react"
import { Link } from 'react-router-dom';
import { SubscriptionItem } from '@/components/subscription/SubscriptionItem'
import { generateProfileShareLink } from '@/lib/shareProfile'
import { trackProfileView, getUser, getMySettings, type TelegramUser } from '@/api/user'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { getGrids } from '@/api/gifts'
import { getConstructorCollections } from '@/api/constructor'

export const IndexPage: FC = () => {
  const { t } = useTranslation()
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const telegramUser = lp.tgWebAppData?.user
  const hasTrackedView = useRef(false)

  // Загружаем данные пользователя с сервера для получения bio + equipped_gift
  const { data: user, isLoading: isLoadingUser } = useQuery<TelegramUser>({
    queryKey: ['user', telegramUser?.id],
    queryFn: () => getUser(telegramUser!.id),
    enabled: !!telegramUser?.id,
  })

  const queryClient = useQueryClient()

  // Загружаем настройки для получения реферального кода
  const { data: mySettings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    enabled: !!telegramUser?.id,
  })
  const referralCode = mySettings?.referral_code

  // Prefetch grids + constructor data + backgrounds as soon as we know the user.
  // This makes opening the drawer, switching albums, and seeing gifts feel instant.
  useEffect(() => {
    if (telegramUser?.id) {
      queryClient.prefetchQuery({
        queryKey: ['grids', telegramUser.id],
        queryFn: () => getGrids(telegramUser.id),
      })
      queryClient.prefetchQuery({
        queryKey: ['constructor', 'collections'],
        queryFn: getConstructorCollections,
        staleTime: 1000 * 60 * 60 * 24,
      })
      // Backgrounds are fetched with long staleTime when needed in drawer/grid
    }
  }, [telegramUser?.id, queryClient])

  // Отслеживаем просмотр своего профиля при загрузке
  useEffect(() => {
    // Отслеживаем только если пользователь загружен и еще не отслеживали просмотр
    if (telegramUser?.id && !hasTrackedView.current) {
      hasTrackedView.current = true
      trackProfileView(telegramUser.id).catch((error) => {
        // Тихая обработка ошибок - не критично, если не удалось зарегистрировать просмотр
        console.warn('Failed to track profile view:', error)
      })
    }
  }, [telegramUser?.id])

  const handleShareProfile = async () => {
    if (!telegramUser?.id) return

    const shareLink = generateProfileShareLink(telegramUser.id, referralCode)
    
    // Пытаемся использовать Telegram WebApp API для шейринга
    const win = window as unknown as Record<string, unknown>
    const telegram = win.Telegram as Record<string, unknown> | undefined
    const webApp = telegram?.WebApp as Record<string, unknown> | undefined
    const openTelegramLink = webApp?.openTelegramLink as ((url: string) => void) | undefined
    
    if (openTelegramLink && typeof openTelegramLink === 'function') {
        try {
            openTelegramLink(shareLink)
            toast(t('toast.openingShare'))
        } catch {
            // Fallback: копируем в буфер обмена
            navigator.clipboard.writeText(shareLink)
            toast(t('toast.profileLinkCopied'), {
                description: t('toast.profileLinkCopiedDesc')
            })
        }
    } else {
        // Fallback: копируем в буфер обмена
        navigator.clipboard.writeText(shareLink)
        toast(t('toast.profileLinkCopied'), {
            description: t('toast.profileLinkCopiedDesc')
        })
    }
  }

  // Показываем спиннер пока загружаются данные пользователя
  if (isLoadingUser) {
    return (
      <Page back={false}>
        <div className="flex w-full justify-center items-center min-h-[50vh]">
          <Spinner className="size-8" />
        </div>
      </Page>
    )
  }

  // Используем данные с сервера, если они загружены, иначе данные из Telegram
  const displayUser = user || telegramUser

  const topActions = (
    <div className="flex items-center w-full pt-2 pb-1 px-2">
      <button
        aria-label={t('profile.shareProfile')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white active:scale-95 transition-transform cursor-pointer"
        onClick={handleShareProfile}
      >
        <Share2 className="size-5" />
      </button>
      <Link
        to="/settings"
        aria-label={t('profile.settingsAria')}
        className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white active:scale-95 transition-transform cursor-pointer"
      >
        <Settings className="size-5" />
      </Link>
    </div>
  )

  return (
    <Page back={false}>
      <div className="w-full">

        <ProfileHeader user={displayUser} isOwnProfile={true} topActions={topActions} />

        <SubscriptionItem />

        <ProfileCard user={displayUser} isOwnProfile={true} />

        {displayUser && <ProfileTabs user={displayUser} isOwnProfile={true} />}

        <div className="py-5 px-4 text-foreground/50 text-center text-sm space-y-1">
          <div>
            {t('footer.thanks')} <a href="https://t.me/giftchanges" className="text-primary">@giftchanges</a> {t('footer.and')} <a href="https://t.me/proTON_priTON" className="text-primary">@proTON_priTON</a> {t('footer.forApi')}
          </div>
          <div>
            {t('footer.developer')}: <a href="https://t.me/dnevnik_ton" className="text-primary">@dnevnik_ton</a>
          </div>
        </div>

        <ErrorBoundary>
          <Suspense fallback={null}>
            <GiftDrawer />
          </Suspense>
        </ErrorBoundary>
      </div>
    </Page>
  )
}