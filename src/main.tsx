import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import telegramAnalytics from '@telegram-apps/analytics'
import './index.css'
import { App } from './components/App'

// Mock the environment in case, we are outside Telegram.
import './mockEnv.ts'
import { init } from './Init.ts'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

// Initialize Telegram Analytics SDK as early as possible — BEFORE retrieveLaunchParams
// or any other SDK call that could throw. Previously this lived inside `init()` which
// only runs after `retrieveLaunchParams()` succeeds; if that threw on certain clients,
// the SDK never initialized and the dashboard reported "SDK not loaded".
const ANALYTICS_TOKEN = import.meta.env.VITE_ANALYTICS_TOKEN as string | undefined
const ANALYTICS_APP_NAME = import.meta.env.VITE_ANALYTICS_APP_NAME as string | undefined
if (ANALYTICS_TOKEN && ANALYTICS_TOKEN !== 'YOUR_TOKEN_HERE' && ANALYTICS_APP_NAME) {
  try {
    telegramAnalytics.init({
      token: ANALYTICS_TOKEN,
      appName: ANALYTICS_APP_NAME,
    })
  } catch (err) {
    // Kept as console.error so it survives prod's pure-pruning of console.log.
    console.error('[analytics] init failed:', err)
  }
} else {
  console.warn('[analytics] skipped — VITE_ANALYTICS_TOKEN or VITE_ANALYTICS_APP_NAME missing')
}

const client = new QueryClient()
const TON_MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`

const root = createRoot(document.getElementById('root')!)

try {
  const launchParams = retrieveLaunchParams();
  const { tgWebAppPlatform: platform } = launchParams;
  const debug = (launchParams.tgWebAppStartParam || '').includes('platformer_debug')
    || import.meta.env.DEV;

  // Configure all application dependencies.
  await init({
    debug,
    eruda: debug && ['ios', 'android'].includes(platform),
    mockForMacOS: platform === 'macos',
    platform,
  }).then(() => {
    root.render(
      <StrictMode>
        <TonConnectUIProvider manifestUrl={TON_MANIFEST_URL}>
          <QueryClientProvider client={client}>
            <App />
          </QueryClientProvider>
        </TonConnectUIProvider>
      </StrictMode>,
    );
  })
} catch (e) {
  console.error(e);
  root.render(<div>Error</div>);
}