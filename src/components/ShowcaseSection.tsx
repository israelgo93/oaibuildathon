import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import type { ShowcaseProject } from '@/types/api'

function ProjectArrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
}

interface ShowcaseEventGroup {
  eventId: string
  eventName: string
  projects: ShowcaseProject[]
}

function groupProjectsByEvent(projects: ShowcaseProject[]): ShowcaseEventGroup[] {
  const groups: ShowcaseEventGroup[] = []
  for (const project of projects) {
    const group = groups.find((item) => item.eventId === project.eventId)
    if (group) group.projects.push(project)
    else groups.push({ eventId: project.eventId, eventName: project.eventName, projects: [project] })
  }
  return groups
}

export function ShowcaseSection() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([])

  useEffect(() => {
    apiRequest<ShowcaseProject[]>('/api/showcase').then(setProjects).catch(() => setProjects([]))
  }, [])

  if (projects.length === 0) return null
  const groups = groupProjectsByEvent(projects)

  return (
    <section className="showcase-section section" id="proyectos" aria-labelledby="showcase-title">
      <div className="page-shell">
        <div className="showcase-heading">
          <div>
            <p className="section-mark">Construido en la Buildathon · Ecuador</p>
            <h2 id="showcase-title">Proyectos que ya llegaron a demo.</h2>
          </div>
          <p>Entregas completadas y verificadas por la organizacion en cada edicion de OpenAI Build Week.</p>
        </div>
        {groups.map((group) => (
          <div className="showcase-event-group" key={group.eventId}>
            {groups.length > 1 ? <h3 className="showcase-event-name">{group.eventName}</h3> : null}
            <div className="showcase-grid">
              {group.projects.map((project, index) => (
                <article key={project.id} className="showcase-card">
                  <div className="showcase-index">{String(index + 1).padStart(2, '0')}</div>
                  <p>{project.challengeTitle}</p>
                  <h4 className="showcase-project-name">{project.projectName}</h4>
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
        ))}
      </div>
    </section>
  )
}
