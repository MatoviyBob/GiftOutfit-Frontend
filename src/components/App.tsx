import { useState, useEffect, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useSignal, isMiniAppDark, retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { toast } from 'sonner'
import { Layout } from './Layout'

import { ThemeProvider } from '@/components/theme-provider'
import { I18nProvider } from '@/i18n'
import { routes } from '@/navigation/routes'
import { LoadingScreen } from './LoadingScreen'
import { parseProfileUserIdFromStartParam } from '@/lib/parseDeeplink'
import { AUTH_EXPIRED_EVENT } from '@/api/apiClient'
// import { parseProfileUserIdFromStartParam } from '@/lib/parseDeeplink'

function AppRoutes() {
  const navigate = useNavigate();
  const launchParams = retrieveLaunchParams();
  // const currentUser = launchParams.tgWebAppData?.user;
  const startParam = launchParams.tgWebAppStartParam;

  useEffect(() => {
    if (startParam) {
      const targetUserId = parseProfileUserIdFromStartParam(startParam);
      if (targetUserId) {
        navigate(`/profile/${targetUserId}`, { replace: true });
      }
    }
  }, []);
  //   // Перенаправляем только один раз при монтировании
  //   if (hasProcessedNavigation.current) {
  //     return;
  //   }
    
  //   // hasProcessedNavigation.current = true;
    
  //   // Если URL уже содержит /profile, не перенаправляем
  //   if (location.pathname.includes('/profile/')) {
  //     return;
  //   }
    
  //   // Если есть startParam с profile userId (из deeplink)
  //   if (startParam) {
  //     const targetUserId = parseProfileUserIdFromStartParam(startParam);
      
  //     if (targetUserId) {
  //       // Если это не текущий пользователь, перенаправляем на его профиль
  //       if (!currentUser || currentUser.id !== targetUserId) {
  //         navigate(`/profile/${targetUserId}`, { replace: true });
  //         return;
  //       }
  //       // Если это текущий пользователь, перенаправляем на /portfolio
  //       navigate('/portfolio', { replace: true });
  //       return;
  //     }
  //   }
    
  //   // Если нет startParam или это не profile, перенаправляем на /portfolio
  //   if (location.pathname !== '/portfolio' && location.pathname !== '/') {
  //     navigate('/portfolio', { replace: true });
  //   } else if (location.pathname === '/') {
  //     navigate('/portfolio', { replace: true });
  //   }
  // }, []);
  

  return (
    <Suspense fallback={null}>
      <Routes>
        {routes.map((route) => <Route key={route.path} {...route} />)}
        <Route path="*" element={<Navigate to="/portfolio" replace />}/>
      </Routes>
    </Suspense>
  );
}

export function App() {
  const [isLoading, setIsLoading] = useState(true)
  const isDark = useSignal(isMiniAppDark);

  // Surface expired-session (401) failures to the user. The backend rejects
  // init_data older than 24h; the only fix is a full reload so Telegram
  // hands the app fresh init_data.
  useEffect(() => {
    const onAuthExpired = () => {
      toast.error('Сессия устарела. Перезапустите приложение.', {
        duration: 10000,
        action: { label: 'Перезагрузить', onClick: () => window.location.reload() },
      })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [])

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      <ThemeProvider defaultTheme={isDark ? 'dark' : 'light'} storageKey="vite-ui-theme">
        <I18nProvider>
          <HashRouter>
            <Layout>
              <AppRoutes />
            </Layout>
          </HashRouter>
        </I18nProvider>
      </ThemeProvider>
    </>
  )
}
