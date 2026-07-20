import { agenda, EVENT_DETAILS } from '../content'

export function AgendaScene() {
  return (
    <section className="cinematic-scene agenda-scene-v2" id="agenda" aria-labelledby="agenda-title">
      <div className="cinematic-stage agenda-stage-v2">
        <div className="cinematic-shell agenda-composition">
          <div className="agenda-date">
            <span>21</span>
            <strong>JUL</strong>
            <small>Portoviejo / Ecuador</small>
          </div>

          <div className="agenda-track-viewport">
            <div className="agenda-heading-v2">
              <p className="scene-label">{EVENT_DETAILS.dateShort} · Portoviejo</p>
              <h2 id="agenda-title">De cero a demo, en una jornada.</h2>
              <p>No vienes solo a escuchar. Vienes a formar equipo, tomar una idea, ponerla a prueba y mostrar lo que construiste.</p>
            </div>

            <ol className="agenda-track">
              {agenda.map((item, index) => (
                <li className="agenda-row" key={`${item.time}-${item.title}`}>
                  <span className="agenda-row-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <time>{item.time}</time>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
