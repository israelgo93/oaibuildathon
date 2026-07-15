import type { ApiHandler, ApiResponse } from '../../server/types.js'
import { setPrivateResponse } from '../../server/http.js'
import { dynamicRouteAction } from '../../server/request-path.js'
import handleDashboard from '../../server/routes/judge-dashboard.js'
import handleSubmissionAnalysis from '../../server/routes/judge-submission-analysis.js'

type JudgeRouteAction = 'dashboard' | 'submission-analysis'

function isJudgeRouteAction(value: string): value is JudgeRouteAction {
  switch (value) {
    case 'dashboard':
    case 'submission-analysis':
      return true
    default:
      return false
  }
}

function respondNotFound(response: ApiResponse): void {
  setPrivateResponse(response)
  response.status(404).json({ error: 'Ruta no encontrada' })
}

const handler: ApiHandler = async (request, response) => {
  const rawAction = dynamicRouteAction(request, 'judge')
  if (!isJudgeRouteAction(rawAction)) {
    respondNotFound(response)
    return
  }

  switch (rawAction) {
    case 'dashboard':
      await handleDashboard(request, response)
      return
    case 'submission-analysis':
      await handleSubmissionAnalysis(request, response)
      return
    default: {
      const exhaustiveCheck: never = rawAction
      return exhaustiveCheck
    }
  }
}

export default handler
