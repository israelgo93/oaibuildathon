import type { PropsWithChildren } from 'react'

export function RequiredFieldLabel({ children }: PropsWithChildren) {
  return (
    <>
      {children} <span className="required-mark" aria-hidden="true">*</span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  )
}

export function OptionalFieldLabel({ children }: PropsWithChildren) {
  return <>{children} <span className="optional-mark">(opcional)</span></>
}

export function RequiredFieldsLegend() {
  return <p className="required-fields-legend"><span aria-hidden="true">*</span> Campo obligatorio</p>
}
