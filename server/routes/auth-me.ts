import type { AuthProfileResult } from '../../src/types/api.js'
import { requireAuthenticatedProfile } from '../auth.js'
import { requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const { publicProfile } = await requireAuthenticatedProfile(request)
  const result: AuthProfileResult = { profile: publicProfile }

  setPrivateResponse(response)
  response.status(200).json(result)
})
