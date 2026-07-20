import { takeaways } from '../content'

export function TakeawaysScene() {
  return (
    <section className="takeaways-scene" id="aprendizajes" aria-labelledby="takeaway-title">
      <div className="cinematic-shell takeaways-layout-v2">
        <div className="takeaways-heading-v2">
          <p className="scene-label">Lo que te llevas</p>
          <h2 id="takeaway-title">Más que código. Momentum.</h2>
        </div>
        <div className="takeaway-rows">
          {takeaways.map((item, index) => (
            <article className="takeaway-row" key={item.verb}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.verb}</strong>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
