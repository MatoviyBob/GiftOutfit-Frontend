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
  setDebug(options.debug);
  initSDK();

  
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

  // Set initData globally for API client
  // Get initDataRaw from SDK after initialization
  const initData = initDataRaw();
  if (initData) {
    console.log('Setting initData globally:', initData.substring(0, 50) + '...');
    setInitData(initData);
  } else {
    console.warn('initData not available during initialization, will be set by useApi hook');
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