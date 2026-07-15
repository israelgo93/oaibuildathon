import type { ApiRequest } from './types.js'

type DynamicRouteGroup = 'admin' | 'auth' | 'judge'

export function dynamicRouteAction(request: ApiRequest, group: DynamicRouteGroup): string {
  if (!request.url) return ''

  try {
    const { pathname } = new URL(request.url, 'https://localhost')
    const segments = pathname.split('/').filter((segment) => segment.length > 0)
    if (segments.length !== 3 || segments[0] !== 'api' || segments[1] !== group) return ''

    return decodeURIComponent(segments[2])
  } catch {
    return ''
  }
}
