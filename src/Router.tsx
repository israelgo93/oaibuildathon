import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SystemLayout } from '@/components/system/SystemLayout'

const App = lazy(() => import('@/App'))
const AdminPage = lazy(() => import('@/pages/AdminPage').then(({ AdminPage: Page }) => ({ default: Page })))
const JudgePage = lazy(() => import('@/pages/JudgePage').then(({ JudgePage: Page }) => ({ default: Page })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(({ LoginPage: Page }) => ({ default: Page })))
const MentorPage = lazy(() => import('@/pages/MentorPage').then(({ MentorPage: Page }) => ({ default: Page })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(({ RegisterPage: Page }) => ({ default: Page })))
const TeamPortalPage = lazy(() =>
  import('@/pages/TeamPortalPage').then(({ TeamPortalPage: Page }) => ({ default: Page })),
)

function RouteFallback() {
  return <div className="system-loading" role="status">Cargando plataforma...</div>
}

function NotFoundPage() {
  return <SystemLayout eyebrow="404" title="Esta ruta no esta en orbita"><a className="system-button" href="/">Volver al inicio</a></SystemLayout>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/equipo" element={<TeamPortalPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/jurado" element={<JudgePage />} />
          <Route path="/mentor" element={<MentorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
