# PROJECT_MAP.md — GiftOutfit Frontend (TypeScript/React)

## Структура проекта

```
src/
├── pages/
│   ├── IndexPage.tsx             # Главная (feed профилей)
│   ├── ProfilePage.tsx           # Профиль юзера + подарки
│   ├── SettingsPage.tsx          # Настройки (TON кошелек, язык, тема)
│   ├── SubscriptionPage.tsx      # Подписки
│   └── NotFoundPage.tsx
├── components/
│   ├── gifts/
│   │   ├── GiftDrawer.tsx        # Drawer для редактирования/просмотра подарков
│   │   │                         # Режимы: constructor / freeform / my-gifts
│   │   │                         # Кнопка Refresh (RefreshCw) — синхронизация wallet
│   │   ├── GiftPreview.tsx       # Превью подарка (изображение + название)
│   │   ├── GiftFieldButton.tsx   # Кнопка редактирования поля (name, model, background, pattern)
│   │   ├── PatternBackground.tsx #背景 с паттерном
│   │   └── GiftGrid.tsx          # Сетка подарков
│   ├── profile/
│   │   ├── ProfileHeader.tsx     # Хедер профиля (avatar, username, bio)
│   │   ├── ProfileTabs.tsx       # Табы (Posts, Gifts, Media, Saved, Links, GIFs)
│   │   ├── ProfileCard.tsx       # Карточка профиля (на главной)
│   │   └── Stats.tsx             # Статистика (просмотры, подписчики)
│   ├── ui/
│   │   ├── button.tsx            # shadcn Button
│   │   ├── drawer.tsx            # vaul Drawer
│   │   ├── tabs.tsx              # Tabs компонент
│   │   ├── spinner.tsx           # Loading spinner
│   │   ├── ProxiedImage.tsx      # Image с прокси (image_proxy endpoint)
│   │   └── ...
│   ├── search/
│   │   └── SearchDrawer.tsx      # Drawer для поиска подарков
│   ├── Navigation.tsx            # Bottom nav / header
│   ├── LoadingScreen.tsx         # Initial loading
│   └── ...
├── api/
│   ├── apiClient.ts              # Base HTTP client с auth headers
│   ├── user.ts                   # GET /users/{id}, PUT /me/ton-wallet, GET /me/my-gifts, POST /me/my-gifts/sync
│   ├── gifts.ts                  # GET /gifts, POST /gifts/check, PUT /gifts/{id}
│   ├── constructor.ts            # GET /constructor/collections, models, symbols
│   ├── profiles.ts               # GET /users/{id}
│   └── ...
├── hooks/
│   ├── useTonWallet.ts           # TON кошелек state + connect/disconnect + sync to server
│   ├── useGiftQueries.ts         # Queries для подарков (backgrounds, collections)
│   ├── useGiftStore.ts           # Zustand store (selectedCell, copiedGift, editingField)
│   ├── useConstructorState.ts    # Constructor editor state
│   ├── useDrawerItems.ts         # Items для drawer (collections, models, backgrounds)
│   ├── useFavoritePalette.ts     # Любимые цвета фона
│   ├── useSubscription.ts        # Subscription state
│   └── ...
├── stores/
│   └── giftStore.ts              # Zustand: selectedCell, copiedGift, editing, etc.
├── utils/
│   ├── tgMiniApp.ts              # Telegram.WebApp initialization
│   ├── giftUrls.ts               # buildGiftModelUrl(), buildGiftPatternUrl()
│   ├── validation.ts             # Helpers
│   └── ...
├── i18n/
│   ├── index.ts                  # i18n setup (ru, en, zh)
│   └── translations/
│       ├── ru.ts                 # Русский (включая giftDrawer.myGifts, myGiftsEmpty, etc.)
│       ├── en.ts                 # English
│       └── zh.ts                 # 中文
├── types/
│   ├── user.ts
│   ├── gift.ts
│   ├── telegram.ts
│   └── ...
├── styles/
│   └── index.css                 # Tailwind + keyframes (sparkle, glow, float, tab-shake)
│                                 # ВАЖНО: убран `touch-action: manipulation` (ломал vaul drawer)
│                                 # СОХРАНЁН: `-webkit-tap-highlight-color: transparent`
├── App.tsx                       # Root component + routing
├── main.tsx
├── vite.env.d.ts
└── package.json
```

## Ключевые страницы

| Страница | Путь | Назначение | Компоненты |
|----------|------|-----------|-----------|
| **Home** | `/` | Feed профилей | ProfileCard, FilterBar |
| **Profile** | `/profile/{id}` | Профиль юзера, его подарки | ProfileHeader, ProfileTabs, Stats, GiftGrid |
| **My Profile** | `/` (in context) | Мой профиль, мои подарки | SettingsPage (TON кошелек) |
| **Settings** | `/settings` | Язык, тема, TON кошелек | WalletConnect, LanguageSelect |
| **Subscriptions** | `/subscriptions` | Управление подписками | SubscriptionCard, CheckoutButton |

## Ключевые компоненты

**GiftDrawer.tsx:**
- 3 режима: `constructor` / `freeform` / `my-gifts`
- Constructor — редактирование подарков (GET /constructor/collections)
- Freeform — свободный режим (patterns + backdrops)
- My Gifts — просмотр кэшированных подарков (GET /me/my-gifts)
- **Кнопка Refresh** 🔄 (RefreshCw icon) — только в my-gifts режиме
  - Запускает POST /me/my-gifts/sync (переканировать wallet на tonapi.io)
  - Крутится пока идёт синхронизация
  - Обновляет UI с новыми подарками из cache

**useTonWallet.ts:**
- `useTonWalletConnect()` — hook для TonConnect
- Отслеживает подключение кошелька
- На connect/disconnect → PUT /me/ton-wallet (сохраняет address на сервере)
- useRef pattern — избегает infinite re-renders

**Translations:**
- `giftDrawer.myGifts` — таб "Мои подарки"
- `giftDrawer.myGiftsEmpty` — "Подарки не найдены. Нажмите кнопку обновления."
- `giftDrawer.myGiftsNoWallet` — подсказка о подключении кошелька

## Telegram Mini App Integration

**Init (App.tsx):**
```tsx
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

function App() {
  const lp = retrieveLaunchParams();
  const user = lp.tgWebAppData?.user;
  
  return <MainLayout>...</MainLayout>;
}
```

**Auth Header:**
```tsx
// api/apiClient.ts
const initData = window.Telegram.WebApp.initData;
headers['Authorization'] = `tma ${initData}`;
```

## TON Wallet Integration

**Connect:**
```tsx
import { useTonConnect } from '@tonconnect/ui-react';

const { wallet, connected } = useTonConnect();
```

**Sync Wallet Gifts:**
```tsx
// GiftDrawer.tsx
const syncMutation = useMutation({
  mutationFn: syncMyGifts,  // POST /me/my-gifts/sync
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-cached-gifts'] })
});

// Auto-sync на первый открыт (если cache пуст и wallet connected)
// Manual refresh через кнопку
```

## Дизайн System

**CSS Variables (index.css):**
```css
:root {
  --radius: 0.65rem;
  --background: oklch(...);
  --foreground: oklch(...);
  --card: oklch(...);
  --primary: oklch(...);
  /* и ещё ~30 переменных */
}

.dark {
  /* тёмная версия всех переменных */
}
```

**Tailwind Utilities:**
- `scrollbar-hide` — скрыть скроллбар
- `tabs-list-transparent` — прозрачный background табов
- `text-shadow-sm` — мягкая тень текста
- `animate-tab-shake` — анимация shake для табов
- Keyframes: `sparkle-appear`, `float`, `float-2`, `float-3`, `glow`, `tab-shake`

**ВАЖНО (CSS):**
- ✅ **СОХРАНЁН**: `-webkit-tap-highlight-color: transparent` (убирает синий флеш на iOS)
- ❌ **УБРАН**: `touch-action: manipulation` (ломал vaul Drawer gestures на iOS)

## API Integration

**My Gifts endpoints:**
```typescript
// src/api/user.ts

export interface CachedGift {
  id: number
  name: string
  model?: string
  backdrop_name?: string
  pattern?: string
}

export const updateTonWallet = (walletAddress: string | null): Promise<void>
export const getMyCachedGifts = (): Promise<{ gifts: CachedGift[], wallet_address: string | null, synced_at: string | null }>
export const syncMyGifts = (): Promise<{ gifts: CachedGift[], synced_at: string, count: number }>
```

## Важные patterns

**useTonWallet.ts (avoiding infinite re-render):**
```tsx
const prevAddressRef = useRef<string | null>(undefined as unknown as null);
useEffect(() => {
  if (prevAddressRef.current === walletAddress) return;  // ← stop infinite loop
  prevAddressRef.current = walletAddress;
  updateTonWallet(walletAddress).catch(() => undefined);
}, [walletAddress]);
```

**GiftDrawer.tsx (syncMutation in useEffect):**
```tsx
const syncMutateRef = useRef(syncMutation.mutate);
syncMutateRef.current = syncMutation.mutate;
useEffect(() => {
  if (...conditions... && !cachedGiftsQuery.data?.synced_at) {
    syncMutateRef.current();  // ← use ref, not mutate directly
  }
}, [...deps...]);  // ← syncMutation NOT in deps, use ref instead
```

## Быстрые ссылки

- **Drawer**: `src/components/gifts/GiftDrawer.tsx` (refresh button, my-gifts mode)
- **TON Wallet**: `src/hooks/useTonWallet.ts` + sync logic
- **API client**: `src/api/user.ts` (my-gifts endpoints)
- **Translations**: `src/i18n/translations/*.ts`
- **Styles**: `src/index.css` (CSS vars, keyframes, NO touch-action)
- **Zustand store**: `src/stores/giftStore.ts`

## Notes для себя

- **My Gifts cache** — загружается мгновенно (no API calls), refresh на demand
- **Auto-sync** — срабатывает при первом открытии, только если wallet connected и cache пуст
- **Refresh button** — появляется только в my-gifts режиме, крутится во время синхронизации
- **Translations** — все ключи гiftDrawer.myGifts* уже добавлены (ru, en, zh)
- **CSS fix** — убран touch-action (vaul drawer), оставлен -webkit-tap-highlight (tap delay)
- **Syncoration pattern** — используем syncMutateRef чтоб избежать infinite re-render в useEffect
