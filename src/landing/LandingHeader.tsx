import { ArrowIcon } from './icons'
import { LANDING_LINKS, sceneNavigation, type LandingVisualSceneId } from './content'

interface LandingHeaderProps {
  activeScene: LandingVisualSceneId
}

export function LandingHeader({ activeScene }: LandingHeaderProps) {
  return (
    <>
      <header className="cinematic-header">
        <a className="cinematic-wordmark" href="#top" aria-label="OpenAI Build Week Portoviejo, inicio">
          <span className="cinematic-wordmark-orbit" aria-hidden="true" />
          <span>
            OpenAI Build Week
            <small>Portoviejo / Ecuador</small>
          </span>
        </a>

        <nav className="cinematic-primary-nav" aria-label="Navegación principal">
          <a href="#experiencia" aria-current={activeScene === 'experiencia' ? 'location' : undefined}>Experiencia</a>
          <a href="#agenda" aria-current={activeScene === 'agenda' ? 'location' : undefined}>Agenda</a>
          <a href="#premios" aria-current={activeScene === 'premios' ? 'location' : undefined}>Premios</a>
        </nav>

        <a className="cinematic-registration" href={LANDING_LINKS.registration}>
          Registra tu equipo
          <ArrowIcon />
        </a>
      </header>

      <nav className="scene-index" aria-label="Índice de escenas">
        {sceneNavigation.map((item) => {
          const isActive = activeScene === item.id
          return (
            <a
              href={`#${item.id}`}
              className={isActive ? 'scene-index-link is-active' : 'scene-index-link'}
              aria-current={isActive ? 'location' : undefined}
              key={item.id}
            >
              <span>{item.shortLabel}</span>
              <strong>{item.label}</strong>
            </a>
          )
        })}
      </nav>
    </>
  )
}
