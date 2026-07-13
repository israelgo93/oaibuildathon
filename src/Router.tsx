import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from '@/App'
import { AdminPage } from '@/pages/AdminPage'
import { JudgePage } from '@/pages/JudgePage'
import { LoginPage } from '@/pages/LoginPage'
import { MentorPage } from '@/pages/MentorPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TeamPortalPage } from '@/pages/TeamPortalPage'
import { SystemLayout } from '@/components/system/SystemLayout'

function NotFoundPage() {
  return <SystemLayout eyebrow="404" title="Esta ruta no esta en orbita"><a className="system-button" href="/">Volver al inicio</a></SystemLayout>
}

export function AppRouter() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
