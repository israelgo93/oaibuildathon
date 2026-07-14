import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OptionalFieldLabel, RequiredFieldLabel, RequiredFieldsLegend } from './FormFieldLabel.js'

describe('indicadores accesibles de formulario', () => {
  it('muestra el asterisco como decorativo y comunica obligatorio a lectores de pantalla', () => {
    const markup = renderToStaticMarkup(<label><RequiredFieldLabel>Nombre del equipo</RequiredFieldLabel><input required /></label>)
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('(obligatorio)')
    expect(markup).toContain('required=""')
  })

  it('marca campos opcionales y muestra la leyenda del formulario', () => {
    expect(renderToStaticMarkup(<OptionalFieldLabel>Organizacion</OptionalFieldLabel>)).toContain('(opcional)')
    const legend = renderToStaticMarkup(<RequiredFieldsLegend />)
    expect(legend).toContain('aria-hidden="true"')
    expect(legend).toContain('Campo obligatorio')
  })
})
