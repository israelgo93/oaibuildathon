interface ChallengeThemesProps {
  thematicAxes: string[]
  suggestedTopics: string[]
  compact?: boolean
}

export function ChallengeThemes({ thematicAxes, suggestedTopics, compact = false }: ChallengeThemesProps) {
  if (thematicAxes.length === 0 && suggestedTopics.length === 0) return null

  return (
    <div className={`challenge-themes${compact ? ' challenge-themes-compact' : ''}`}>
      {thematicAxes.length > 0 ? (
        <div>
          <span className="challenge-themes-title">Ejes tematicos</span>
          <ul className="challenge-axis-list">
            {thematicAxes.map((axis) => <li key={axis}>{axis}</li>)}
          </ul>
        </div>
      ) : null}
      {suggestedTopics.length > 0 ? (
        <div>
          <span className="challenge-themes-title">Ideas que puedes explorar</span>
          <ul className="challenge-topic-list">
            {suggestedTopics.map((topic) => <li key={topic}>{topic}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
