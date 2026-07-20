import { EVENT_DETAILS, LANDING_LINKS } from './content'

export function LandingFooter() {
  return (
    <footer className="cinematic-footer">
      <div className="cinematic-shell cinematic-footer-grid">
        <div className="cinematic-wordmark footer-wordmark-v2">
          <span className="cinematic-wordmark-orbit" aria-hidden="true" />
          <span>
            OpenAI Build Week
            <small>{EVENT_DETAILS.location} · {EVENT_DETAILS.year}</small>
          </span>
        </div>
        <div className="cinematic-footer-links">
          <a href={LANDING_LINKS.event} target="_blank" rel="noreferrer">Evento en Luma</a>
          <a href={LANDING_LINKS.global} target="_blank" rel="noreferrer">Build Week global</a>
          <a href="#comunidades">Comunidades</a>
        </div>
        <p>Construido para quienes convierten ideas en realidad.</p>
      </div>
    </footer>
  )
}
