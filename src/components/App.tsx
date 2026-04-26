import { useState, useEffect, useRef, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useSignal, isMiniAppDark, retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { Layout } from './Layout'

import { ThemeProvider } from '@/components/theme-provider'
import { I18nProvider } from '@/i18n'
import { routes } from '@/navigation/routes'
import { LoadingScreen } from './LoadingScreen'
import { parseProfileUserIdFromStartParam } from '@/lib/parseDeeplink'
// import { parseProfileUserIdFromStartParam } from '@/lib/parseDeeplink'

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const launchParams = retrieveLaunchParams();
  // const currentUser = launchParams.tgWebAppData?.user;
  const startParam = launchParams.tgWebAppStartParam;
  // const hasProcessedNavigation = useRef(false);

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
