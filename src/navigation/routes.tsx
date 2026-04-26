import { lazy } from 'react'
import type { ComponentType, JSX } from 'react'

const IndexPage = lazy(() => import('@/pages/IndexPage').then(m => ({ default: m.IndexPage })))
const ExplorePage = lazy(() => import('@/pages/Explore/ExplorePage').then(m => ({ default: m.ExplorePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
  icon?: JSX.Element;
}

export const routes: Route[] = [
  { path: '/explore', Component: ExplorePage, title: 'Explore Page' },
  { path: '/portfolio', Component: IndexPage, title: 'Portfolio' },
  { path: '/profile/:userId', Component: ProfilePage, title: 'Profile' },
  { path: '/settings', Component: SettingsPage, title: 'Settings' },
  { path: '/subscription', Component: SubscriptionPage, title: 'Subscription' },
]
