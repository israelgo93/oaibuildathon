import { describe, expect, it } from 'vitest'
import {
  agenda,
  coorganizingCommunities,
  EVENT_DETAILS,
  LANDING_LINKS,
  LANDING_SCENE_IDS,
  LANDING_VISUAL_SCENE_IDS,
  models,
  organizingCommunity,
  prizes,
  PRIZE_TOTAL_CREDITS,
  PRIZE_TOTAL_DISPLAY,
  SUBMISSION_DEADLINE_FALLBACK,
  takeaways,
  venuePartner,
} from './content'

describe('contenido congelado de la landing', () => {
  it('preserva los enlaces publicos y el deadline de respaldo', () => {
    expect(LANDING_LINKS).toEqual({
      event: 'https://luma.com/buildathon.porto',
      global: 'https://openai.com/build-week/',
      gpt: 'https://openai.com/index/gpt-5-6/',
      registration: '/registro',
      buildersWhatsapp: 'https://chat.whatsapp.com/GNoZ7SDOWMhIW6a2tbZypy',
    })
    expect(SUBMISSION_DEADLINE_FALLBACK).toBe('2026-07-21T16:00:00-05:00')
    expect(EVENT_DETAILS).toEqual({
      year: '2026',
      location: 'Portoviejo / Ecuador',
      dateShort: '21 de julio',
      dateLong: 'Martes 21 de julio de 2026',
      modelLaunchDate: '09.07.2026',
    })
  })

  it('preserva agenda, modelos y premios anunciados', () => {
    expect(agenda).toEqual([
      {
        time: '10:00—10:30',
        title: 'Registro y bienvenida',
        description: 'Acreditación, contexto de OpenAI Build Week e introducción a Codex.',
      },
      {
        time: '10:30—11:00',
        title: 'Equipos en órbita',
        description: 'Presentación de la dinámica y conformación de equipos de trabajo.',
      },
      {
        time: '11:30—13:00',
        title: 'Workshop técnico y retos',
        description: 'Tecnologías, experiencias y prácticas para construir con Codex. El bloque cierra con el lanzamiento oficial de los retos y el inicio de la construcción.',
      },
      {
        time: '13:00—14:00',
        title: 'Coffee break',
        description: 'Pausa para conectar, contrastar ideas y recargar energía.',
      },
      {
        time: '14:00—16:00',
        title: 'Sprint de construcción',
        description: 'Codex, código, iteración y mentoría para llevar el prototipo a una versión demostrable.',
      },
      {
        time: '16:00—16:30',
        title: 'Demos y evaluación',
        description: 'Cada equipo presenta lo que construyó ante la comunidad y el jurado.',
      },
      {
        time: '16:30—17:00',
        title: 'Premiación y cierre',
        description: 'Resultados, reconocimientos y el siguiente paso para seguir construyendo.',
      },
    ])
    expect(models).toEqual([
      {
        name: 'Sol',
        code: 'GPT-5.6 / 01',
        role: 'Inteligencia de frontera',
        description: 'El modelo insignia de la familia, creado para el trabajo más exigente en coding, conocimiento, ciencia y seguridad.',
        className: 'body-sol',
      },
      {
        name: 'Terra',
        code: 'GPT-5.6 / 02',
        role: 'Equilibrio cotidiano',
        description: 'Capacidad y eficiencia en balance para construir, analizar e iterar en el trabajo de todos los días.',
        className: 'body-terra',
      },
      {
        name: 'Luna',
        code: 'GPT-5.6 / 03',
        role: 'Eficiencia a escala',
        description: 'El modelo más eficiente en costo de la familia, listo para hacer la inteligencia más accesible y abundante.',
        className: 'body-luna',
      },
    ])
    expect(prizes).toEqual([
      { place: 'Primer lugar', amount: 5_000, className: 'prize-first' },
      { place: 'Segundo lugar', amount: 2_500, className: 'prize-second' },
      { place: 'Tercer lugar', amount: 1_000, className: 'prize-third' },
    ])
    expect(prizes.reduce((total, prize) => total + prize.amount, 0)).toBe(8_500)
    expect(PRIZE_TOTAL_CREDITS).toBe(8_500)
    expect(PRIZE_TOTAL_DISPLAY).toBe('8.500')
    expect(takeaways.map((item) => item.title)).toEqual([
      'Un prototipo demostrable',
      'Flujos de trabajo con Codex',
      'La comunidad que construye',
    ])
  })

  it('preserva anclas y orden institucional', () => {
    expect(LANDING_SCENE_IDS).toEqual([
      'top',
      'experiencia',
      'contexto',
      'modelos',
      'agenda',
      'premios',
      'final',
    ])
    expect(LANDING_VISUAL_SCENE_IDS).toEqual([
      'top',
      'experiencia',
      'contexto',
      'modelos',
      'agenda',
      'premios',
      'aprendizajes',
      'vitrina',
      'final',
      'comunidades',
    ])
    expect([
      organizingCommunity.name,
      ...coorganizingCommunities.map((community) => community.name),
      venuePartner.name,
    ]).toEqual(['The Builders', 'Kriuu', 'Club IA ULEAM', 'PUCE Manabí'])
    expect([
      ...organizingCommunity.links,
      ...coorganizingCommunities.flatMap((community) => community.links),
    ]).toEqual([
      { label: 'Instagram', url: 'https://www.instagram.com/thebuilders.ia' },
      { label: 'WhatsApp', url: 'https://chat.whatsapp.com/GNoZ7SDOWMhIW6a2tbZypy' },
      { label: 'Sitio web', url: 'https://kriuu.com/' },
      { label: 'Instagram', url: 'https://www.instagram.com/kriuu.ec/' },
      { label: 'Sitio web', url: 'https://iauleam.club' },
      { label: 'Instagram', url: 'https://www.instagram.com/club.ia.uleam' },
    ])
  })
})
