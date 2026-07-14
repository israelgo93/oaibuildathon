import type { ApiHandler, ApiResponse } from '../../server/types.js'
import { setPrivateResponse } from '../../server/http.js'
import { dynamicRouteAction } from '../../server/request-path.js'
import handleAuthMe from '../../server/routes/auth-me.js'
import handlePasswordRecovery from '../../server/routes/auth-password-recovery.js'

type AuthRouteAction = 'me' | 'password-recovery'

function isAuthRouteAction(value: string): value is AuthRouteAction {
  switch (value) {
    case 'me':
    case 'password-recovery':
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
  const rawAction = dynamicRouteAction(request, 'auth')
  if (!isAuthRouteAction(rawAction)) {
    respondNotFound(response)
    return
  }

  switch (rawAction) {
    case 'me':
      await handleAuthMe(request, response)
      return
    case 'password-recovery':
      await handlePasswordRecovery(request, response)
      return
    default: {
      const exhaustiveCheck: never = rawAction
      return exhaustiveCheck
    }
  }
}

export default handler
