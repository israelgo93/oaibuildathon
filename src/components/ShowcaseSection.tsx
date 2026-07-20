import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import type { ShowcaseProject } from '@/types/api'

function ProjectArrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
}

export function ShowcaseSection() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([])

  useEffect(() => {
    apiRequest<ShowcaseProject[]>('/api/showcase').then(setProjects).catch(() => setProjects([]))
  }, [])

  if (projects.length === 0) return null

  return (
    <section className="showcase-section section" id="proyectos" aria-labelledby="showcase-title">
      <div className="page-shell">
        <div className="showcase-heading">
          <div>
            <p className="section-mark">Construido en Manta · Edición inaugural</p>
            <h2 id="showcase-title">Proyectos que ya llegaron a demo.</h2>
          </div>
          <p>Entregas completadas y verificadas por la organizacion en la Buildathon de Manta, el 15 de julio.</p>
        </div>
        <div className="showcase-grid">
          {projects.map((project, index) => (
            <article key={project.id} className="showcase-card">
              <div className="showcase-index">{String(index + 1).padStart(2, '0')}</div>
              <p>{project.challengeTitle}</p>
              <h3>{project.projectName}</h3>
              <span>por {project.teamName}</span>
              <p className="showcase-description">{project.shortDescription}</p>
              {project.techStack.length > 0 ? <ul>{project.techStack.slice(0, 5).map((technology) => <li key={technology}>{technology}</li>)}</ul> : null}
              <div className="showcase-links">
                {project.demoUrl ? (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver demo de ${project.projectName}; se abre en una pestaña nueva`}
                  >
                    Ver demo <ProjectArrow />
                  </a>
                ) : null}
                {project.repositoryUrl ? (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver codigo de ${project.projectName}; se abre en una pestaña nueva`}
                  >
                    Codigo <ProjectArrow />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
