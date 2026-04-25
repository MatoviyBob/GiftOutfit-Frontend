import type { FC } from 'react'
import { useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/Page'
import { GiftDrawer } from '@/components/gifts/GiftDrawer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileCard } from '@/components/profile/ProfileCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { getUser, trackProfileView, type TelegramUser } from '@/api/user'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { useTranslation } from '@/i18n'

export const ProfilePage: FC = () => {
  const { t } = useTranslation()
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const userIdNumber = userId ? parseInt(userId, 10) : null
  const currentUser = retrieveLaunchParams().tgWebAppData?.user

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userIdNumber],
    queryFn: () => getUser(userIdNumber!),
    enabled: !!userIdNumber && !isNaN(userIdNumber),
  })

  // Если это собственный профиль, перенаправляем на /portfolio
  const isOwnProfile = currentUser && userIdNumber === currentUser.id
  const hasTrackedView = useRef(false)

  // Перенаправляем на собственный профиль, если открыт через deeplink
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      navigate('/portfolio', { replace: true })
    }
  }, [isOwnProfile, currentUser, navigate])

  // Отслеживаем просмотр профиля при загрузке
  useEffect(() => {
    // Отслеживаем только если:
    // 1. Пользователь загружен
    // 2. Это не собственный профиль (свой профиль отслеживается в IndexPage)
    // 3. Еще не отслеживали просмотр
    if (user && userIdNumber && !isOwnProfile && !hasTrackedView.current) {
      hasTrackedView.current = true
      trackProfileView(userIdNumber).catch((error) => {
        // Тихая обработка ошибок - не критично, если не удалось зарегистрировать просмотр
        console.warn('Failed to track profile view:', error)
      })
    }
  }, [user, userIdNumber, isOwnProfile])

  // Не показываем страницу, если это собственный профиль (будет редирект)
  if (isOwnProfile) {
    return (
      <Page back={true}>
        <div className="flex w-full justify-center items-center min-h-[50vh]">
          <Spinner className="size-8" />
        </div>
      </Page>
    )
  }

  if (isLoading) {
    return (
      <Page back={true}>
        <div className="flex w-full justify-center items-center min-h-[50vh]">
          <Spinner className="size-8" />
        </div>
      </Page>
    )
  }

  if (error || !user) {
    return (
      <Page back={true}>
        <div className="w-full px-4 pt-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
            <p className="text-destructive text-sm font-medium">
              {error ? t('profile.failedToLoad') : t('profile.userNotFound')}
            </p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page back={true}>
      <div className="w-full">
        {/* Кнопка возврата в свой профиль */}
        {currentUser && (
          <div className="flex mt-2">
            <Button 
              size="lg" 
              variant="ghost" 
              aria-label={t('profile.goToMyProfile')} 
              className="ml-auto mr-2"
              asChild
            >
              <Link to="/portfolio">
                <Home className="size-5" />
              </Link>
            </Button>
          </div>
        )}

        <ProfileHeader user={user} isOwnProfile={isOwnProfile} />

        <ProfileCard user={user} isOwnProfile={isOwnProfile} />

        <ProfileTabs user={user} isOwnProfile={isOwnProfile} />

        <div className="py-5 px-4 text-foreground/50 text-center text-sm">
          {t('footer.thanks')} <a href="https://t.me/giftchanges" className="text-primary">@giftchanges</a> {t('footer.and')} <a href="https://t.me/proTON_priTON" className="text-primary">@proTON_priTON</a> {t('footer.forApi')}
        </div>

        <ErrorBoundary>
          <GiftDrawer />
        </ErrorBoundary>
      </div>
    </Page>
  )
}

