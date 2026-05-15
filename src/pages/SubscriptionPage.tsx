import type { FC } from 'react'
// import { useMemo } from 'react'
import { Page } from '@/components/Page'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Link } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { BadgeCheckIcon, Eye, Sparkles, GalleryThumbnails } from 'lucide-react'
import { Button } from '@/components/ui/button'
// import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
// import { BadgeCheckIcon, ChevronRightIcon, MessageSquare } from 'lucide-react'
// import { Separator } from '@/components/ui/separator'
// import { GiftDrawer } from '@/components/gifts/GiftDrawer'
// import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
// import { ProfileHeader } from '@/components/profile/ProfileHeader'
// import { ProfileCard } from '@/components/profile/ProfileCard'
// import ProfileTabs from '@/components/profile/ProfileTabs'
import starSvg from '@/assets/star.svg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createInvoice, type Invoice } from '@/api/payment'

import { invoice } from '@telegram-apps/sdk-react'
import { useSubscription, isSubscriptionActive } from '@/hooks/useSubscription'
import { getSubscriptionPlans, type SubscriptionPlan } from '@/api/subscription'
import { proxyImageUrl } from '@/lib/giftUrls'
import { ProxiedImage } from '@/components/ui/ProxiedImage'
import { useTranslation } from '@/i18n'

export const SubscriptionPage: FC = () => {
  const { t, locale } = useTranslation()
  const subscriptionItems = [
    {
      title: t('subscription.premiumBadge'),
      description: t('subscription.premiumBadgeDesc'),
      link: '/subscription',
      icon: <BadgeCheckIcon className="size-5 text-blue-500" />,
    },
    {
      title: t('subscription.multipleCollections'),
      description: t('subscription.multipleCollectionsDesc'),
      link: '/subscription',
      icon: <GalleryThumbnails className="size-5 text-blue-500" />,
    },
    {
      title: t('subscription.profileViews'),
      description: t('subscription.profileViewsDesc'),
      link: '/subscription',
      icon: <Eye className="size-5 text-blue-500" />,
    },
    {
      title: t('subscription.moreSoon'),
      description: t('subscription.moreSoonDesc'),
      link: '/subscription',
      icon: <Sparkles className="size-5 text-blue-500" />,
    },
  ]
//   const lp = useMemo(() => retrieveLaunchParams(), []);
//   const user = lp.tgWebAppData?.user

  const { data: subscription } = useSubscription();
  const hasActiveSubscription = isSubscriptionActive(subscription);

  const queryClient = useQueryClient();

  const { data: subscriptionPlans, isLoading: isSubscriptionPlansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscriptionPlans'],
    queryFn: getSubscriptionPlans,
  })

  const subscriptionPlan = subscriptionPlans?.[0];

  const createInvoiceMutation = useMutation({
    mutationFn: () => createInvoice(subscriptionPlan?.id ?? 1),
    onSuccess: (data: Invoice) => {
      invoice.open(data.invoice_link, 'url').then((status) => {
        if (status == 'paid') {
          // TODO: invalidate subscription
          queryClient.invalidateQueries({ queryKey: ['subscription'] })
        }
      })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
    },
    onError: () => {
      toast(t('common.error'), {
        description: t('toast.errorCreateInvoice'),
      })
    },
  })

  return (
    <Page back={true}>
      <div className="w-full">
        <ProxiedImage src={proxyImageUrl("https://cdn.changes.tg/gifts/models/Mighty%20Arm/png/Original.png")} alt="Premium" className="mt-8 w-24 h-24 mx-auto" />
        <h1 className="m-4 bold text-2xl font-semibold text-center">{t('subscription.exclusiveFeatures')}</h1>
        <ItemGroup className="bg-card rounded-xl overflow-hidden mx-4">
          {subscriptionItems.map((item) => (
            <Item size="default" asChild key={item.title}>
              <Link to={item.link} className="flex relative cursor-pointer">
                <ItemMedia>
                  {item.icon}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {item.title}
                  </ItemTitle>
                  <ItemDescription className="text-md">
                    {item.description}
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>
          ))}
        </ItemGroup>
        <div className="mx-4 mt-4">
          {hasActiveSubscription ? (
            <div className="rounded-full h-12 w-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <span className="text-sm font-medium text-green-500">
                {t('subscription.subscriptionActiveUntil')} {new Date(subscription?.end_date || '').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          ) : (
            <Button className="rounded-full h-12 w-full cursor-pointer" onClick={() => createInvoiceMutation.mutate()}>
              {createInvoiceMutation.isPending || isSubscriptionPlansLoading ? <Spinner className="text-white" /> : <>
                <span className="text-sm font-medium text-white">
                  {t('subscription.getMonthlySubscription')} <img src={starSvg} alt="stars" className="mt-[-2px] size-5 inline-block" />{subscriptionPlan?.price}
                </span>
              </>}
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}