import type { ApiHandler, ApiResponse } from '../../server/types.js'
import { setPrivateResponse } from '../../server/http.js'
import { dynamicRouteAction } from '../../server/request-path.js'
import handleBroadcasts from '../../server/routes/admin-broadcasts.js'
import handleStaffAccess from '../../server/routes/admin-staff-access.js'
import handleAnalysisWorker from '../../server/routes/admin-analysis-worker.js'
import handleSubmissionAnalyses from '../../server/routes/admin-submission-analyses.js'

type AdminRouteAction = 'analysis-worker' | 'broadcasts' | 'staff-access' | 'submission-analyses'

function isAdminRouteAction(value: string): value is AdminRouteAction {
  switch (value) {
    case 'analysis-worker':
    case 'broadcasts':
    case 'staff-access':
    case 'submission-analyses':
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
  const rawAction = dynamicRouteAction(request, 'admin')
  if (!isAdminRouteAction(rawAction)) {
    respondNotFound(response)
    return
  }

  switch (rawAction) {
    case 'analysis-worker':
      await handleAnalysisWorker(request, response)
      return
    case 'broadcasts':
      await handleBroadcasts(request, response)
      return
    case 'staff-access':
      await handleStaffAccess(request, response)
      return
    case 'submission-analyses':
      await handleSubmissionAnalyses(request, response)
      return
    default: {
      const exhaustiveCheck: never = rawAction
      return exhaustiveCheck
    }
  }
}

export default handler
