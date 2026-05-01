# CLAUDE.md — GiftOutfit Frontend (TypeScript/React)

## Кто ты
Senior TypeScript + React разработчик и UI/UX дизайнер. Создаешь Telegram Mini App, красивый и быстрый.

## Tech Stack
- **Framework**: React 18+ + TypeScript (strict mode)
- **Build**: Vite
- **Styling**: Tailwind CSS
- **UI**: Custom components (Artifacts с живым превью)
- **Telegram**: Telegram Mini App SDK
- **Blockchain**: TON SDK, tonapi.io
- **State**: React Context / local state (no Redux needed yet)
- **HTTP**: fetch API (async/await)

## Правила (всегда соблюдай)
- ✅ **TypeScript strict mode везде** — никогда `any`, всегда типизируй
- ✅ **Functional components + hooks** (забудь class components)
- ✅ **UI-компоненты в Artifacts** с живым превью
- ✅ **Tailwind only** — никакого inline CSS
- ✅ **Дизайн**: современный минимализм, soft shadows, `rounded-xl`, fully responsive
- ✅ **No console.log** в production — используй proper logging
- ✅ **Async/await** везде, никогда не игнорируй ошибки

## Структура проекта

```
src/
├── pages/                        # Главные страницы (routing)
│   ├── HomePage.tsx             # Главная (feed профилей, дизайн)
│   ├── ProfilePage.tsx          # Профиль юзера (подарки, статистика)
│   ├── SettingsPage.tsx         # Настройки (TON кошелек, язык, звук)
│   ├── MyProfilePage.tsx        # Мой профиль (избранное, подписки)
│   └── AdminPage.tsx            # Админ панель (дашборд)
├── components/
│   ├── ProfileCard.tsx          # Карточка профиля (превью)
│   ├── GiftGrid.tsx             # Сетка подарков
│   ├── WalletConnect.tsx        # TON кошелек (connect/disconnect)
│   ├── Stats.tsx                # Статистика (просмотры, подписчики)
│   ├── Navigation.tsx           # Bottom nav / header
│   └── ...
├── api/
│   ├── client.ts                # Базовый HTTP клиент (auth headers)
│   ├── users.ts                 # GET /users/{id}, POST /view
│   ├── gifts.ts                 # GET /gifts, POST /check
│   ├── tonApi.ts                # TON NFT API (wallet detection)
│   └── ...
├── hooks/
│   ├── useUser.ts               # Состояние текущего юзера (Telegram Init Data)
│   ├── useWallet.ts             # TON кошелек state + methods
│   ├── useGifts.ts              # Подарки (loaded, favorites)
│   └── ...
├── utils/
│   ├── tgMiniApp.ts             # Telegram Mini App initialization
│   ├── validation.ts            # Telegram signature validation
│   ├── format.ts                # Formatting helpers
│   └── ...
├── styles/
│   └── globals.css              # Tailwind + custom CSS vars
├── types/
│   ├── user.ts                  # UserDB, ProfileView types
│   ├── gift.ts                  # GiftDB, GiftUI types
│   ├── telegram.ts              # Telegram SDK types
│   └── ...
└── App.tsx                      # Root component + routing

```

## Ключевые страницы

| Страница | Путь | Назначение | Ключевые компоненты |
|----------|------|-----------|-------------------|
| **Home** | `/` | Feed профилей, discover | ProfileCard, FilterBar |
| **Profile** | `/profile/{id}` | Профиль юзера, его подарки | Stats, GiftGrid, ActionButtons |
| **My Profile** | `/me` | Мой профиль, настройки | MyStats, Favorites, SubscribeButton |
| **Settings** | `/settings` | TON кошелек, язык, уведомления | WalletConnect, LanguageSelect |
| **Admin** | `/admin` | Дашборд статистики | StatsCards, AnalyticsChart |

## Ключевые компоненты (в Artifacts)

```tsx
// Все UI-компоненты выводятся в Artifacts с живым превью!

// Пример структуры:
<ProfileCard 
  user={user}
  gifts={gifts}
  onView={() => trackView(user.id)}
  isMyProfile={isMe}
/>

<GiftGrid 
  gifts={gifts}
  loading={loading}
  onGiftClick={(gift) => showDetails(gift)}
/>

<WalletConnect 
  isConnected={tonConnected}
  address={walletAddress}
  onConnect={connectWallet}
  onDisconnect={disconnectWallet}
/>
```

## Telegram Mini App Integration

**Init (App.tsx):**
```tsx
import { useTelegramInitData } from './hooks/useUser';

function App() {
  const { user, isReady } = useTelegramInitData();
  
  if (!isReady) return <LoadingScreen />;
  
  return (
    <Router>
      <MainLayout>
        <Routes {...routes} />
      </MainLayout>
    </Router>
  );
}
```

**Auth Header для API:**
```tsx
// в api/client.ts
const tmaInitData = window.Telegram.WebApp.initData;
headers['Authorization'] = `tma ${tmaInitData}`;
```

## TON Wallet Integration

**Connect (SettingsPage.tsx):**
```tsx
import { useTonConnect } from '@tonconnect/ui-react';

function WalletSection() {
  const { wallet, connected } = useTonConnect();
  
  if (connected) {
    return <WalletConnected address={wallet?.account?.address} />;
  }
  
  return <ConnectButton />;
}
```

**Wallet Gifts (ProfilePage.tsx):**
```tsx
async function loadWalletGifts(walletAddress: string) {
  const response = await fetch(
    `https://tonapi.io/v2/accounts/${walletAddress}/nfts?` +
    `limit=100&indirect_ownership=true`
  );
  
  // Detected via nft.fragment.com/gift/ URL
  // Auto-matched against KNOWN_GIFT_COLLECTIONS
}
```

## Дизайн System

**Цвета & Spacing:**
```tailwind
/* Modern minimalism */
text-foreground / text-foreground/60 (opacity)
bg-card / bg-background
rounded-xl (cornerRadius)
shadow-sm (soft shadows, не резкие)
gap-3 / gap-4 (spacing)
```

**Responsive (mobile-first):**
```tailwind
col-span-1 sm:col-span-2 lg:col-span-3
text-sm sm:text-base lg:text-lg
p-3 sm:p-4 lg:p-6
```

## Быстрые ссылки

- **Telegram Init**: `src/hooks/useUser.ts` + `src/utils/tgMiniApp.ts`
- **TON Wallet**: `src/hooks/useWallet.ts` + `src/components/WalletConnect.tsx`
- **API Client**: `src/api/client.ts` (with auth header)
- **Gift Detection**: `src/api/tonApi.ts` (fragment.com URLs)
- **Settings**: `src/pages/SettingsPage.tsx` (TON кошелек, язык, звук)
- **Admin**: `src/pages/AdminPage.tsx` (дашборд с графиком)

## API Integration Checklist

```
GET /users/{id}           → profileCard data
POST /users/{id}/view     → track viewing
GET /gifts                → all gifts + wallet gifts
POST /gifts/check         → force check new wallet gifts
POST /payments/create     → gift purchase
GET /admin/stats          → dashboard stats
```

## Notes для себя

- **TON Gift detection** работает по URL `nft.fragment.com/gift/` в metadata
- **Wallet gifts** меняются динамически — кэшируй с TTL 30s или на demand по кнопке
- **Fragment slug** извлекается: `lightsword-21945.webp` → `lightsword`
- **Profile view tracking** — POST сразу после загрузки, no duplicates
- **Settings page** — TON address отображается inline справа перед кнопкой (не в subtitle)

## Обновляй этот файл!
Если добавляются новые страницы, компоненты, или меняется архитектура — апдейтируй сюда.
