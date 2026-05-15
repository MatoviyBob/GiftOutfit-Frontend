import {
  setDebug,
  mountBackButton,
  restoreInitData,
  init as initSDK,
  bindThemeParamsCssVars,
  mountViewport,
  bindViewportCssVars,
  mockTelegramEnv,
  type ThemeParams,
  themeParamsState,
  retrieveLaunchParams,
  emitEvent,
  expandViewport,
  swipeBehavior,
  // setMiniAppHeaderColor,
  themeParams,
  miniApp,
  initDataRaw,
  requestFullscreen
} from '@telegram-apps/sdk-react';
import { setInitData } from './api/apiClient';

/**
 * Initializes the application and configures its dependencies.
 *
 * Note: @telegram-apps/analytics is initialized at the top of main.tsx, before
 * this function runs, so the /flow heartbeat fires regardless of any errors here.
 */
export async function init(options: {
    debug: boolean;
    eruda: boolean;
    mockForMacOS: boolean;
    platform: string;
}): Promise<void> {
  // Set @telegram-apps/sdk-react debug mode and initialize it.
  // initSDK() can throw on unusual clients (malformed environment); guard it
  // so a failure here doesn't abort the whole init() and blank the screen.
  setDebug(options.debug);
  try {
    initSDK();
  } catch (err) {
    console.error('[init] initSDK() failed:', err);
  }

  
  // Eruda disabled in production
  
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
  }

  if (swipeBehavior.disableVertical.isAvailable()) {
    swipeBehavior.disableVertical();
  }
  
  // Telegram for macOS has a ton of bugs, including cases, when the client doesn't
  // even response to the "web_app_request_theme" method. It also generates an incorrect
  // event for the "web_app_request_safe_area" method.
  if (options.mockForMacOS) {
    let firstThemeSent = false;
    mockTelegramEnv({
      onEvent(event, next) {
        if (event[0] === 'web_app_request_theme') {
          let tp: ThemeParams = {};
          if (firstThemeSent) {
            tp = themeParamsState();
          } else {
            firstThemeSent = true;
            tp ||= retrieveLaunchParams().tgWebAppThemeParams;
          }
          return emitEvent('theme_changed', { theme_params: tp });
        }

        if (event[0] === 'web_app_request_safe_area') {
          return emitEvent('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
        }

        next();
      },
    });
  }

  // Mount all components used in the project.
  mountBackButton.ifAvailable();
  restoreInitData();

  // Set initData globally for API client.
  // NOTE: never log initData / launchParams — they contain the HMAC `hash`
  // and the `user` blob and act as a session token. Logging them in prod
  // would expose them in DevTools (and any analytics that scrape console).
  const initData = initDataRaw();
  if (initData) {
    setInitData(initData);
  } else if (import.meta.env.DEV) {
    console.warn('[init] initData not available during initialization');
  }

  // Safe to call in any order.
  themeParams.mountSync();
  miniApp.mountSync();
  bindThemeParamsCssVars();

  if (mountViewport.isAvailable()) {
    mountViewport()
      .then(async () => {
        expandViewport();
        bindViewportCssVars();
        // if (setMiniAppHeaderColor.isAvailable() && setMiniAppHeaderColor.supports.rgb()) {
        //   setMiniAppHeaderColor('#000000');
        // }

        if (requestFullscreen.isAvailable() && (options.platform == 'ios' || options.platform == 'android')) {
          await requestFullscreen();
        }
      })
  }
}