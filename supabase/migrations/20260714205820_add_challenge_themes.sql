-- Agrega ejes tematicos y ejemplos de proyectos a cada reto.
alter table public.challenges
  add column thematic_axes text[] not null default array['Exploracion abierta']::text[],
  add column suggested_topics text[] not null default array['Define una oportunidad concreta alineada con el reto y demuestra una solucion funcional.']::text[];

update public.challenges
set
  thematic_axes = array[
    'Operaciones y productividad',
    'Compras y cadena de suministro',
    'Atencion y servicios',
    'Datos y toma de decisiones',
    'Finanzas y cumplimiento',
    'Trabajo y talento'
  ],
  suggested_topics = array[
    'Automatizacion de cotizaciones, ordenes de compra y seguimiento de proveedores.',
    'Agentes para inventario, abastecimiento, alertas de stock y coordinacion logistica.',
    'Asistentes de atencion que clasifican solicitudes, consultan fuentes y escalan casos.',
    'Flujos para extraer, validar, resumir y enrutar informacion de documentos.',
    'Conciliacion de pagos, gastos, facturas o reportes con revision humana.',
    'Agentes de investigacion y monitoreo que convierten datos en decisiones trazables.',
    'Automatizacion de onboarding, seleccion, capacitacion o soporte interno.',
    'Coordinadores de tareas entre correo, calendarios, formularios, APIs y sistemas existentes.'
  ]
where title = 'Agentes y automatizacion';

update public.challenges
set
  thematic_axes = array[
    'Extensibilidad de Codex',
    'Desarrollo asistido por IA',
    'Integraciones y APIs',
    'Calidad, pruebas y seguridad',
    'Diseno, prototipado y publicacion',
    'Colaboracion y conocimiento'
  ],
  suggested_topics = array[
    'Skills reutilizables que conviertan un proceso especializado en un flujo confiable.',
    'Plugins instalables que agrupen skills, conectores, configuracion MCP, hooks o recursos.',
    'Servidores MCP y conectores que permitan consultar datos o ejecutar acciones con permisos claros.',
    'APIs, SDKs, CLIs, generadores o plantillas para acelerar el inicio de productos.',
    'Herramientas de revision de codigo, pruebas, evaluaciones, seguridad y documentacion automatizada.',
    'Sistemas para gestionar contexto, instrucciones, prompts y conocimiento de un proyecto.',
    'Flujos de diseno a codigo, prototipado, accesibilidad y validacion de interfaces.',
    'Utilidades para despliegue, observabilidad, depuracion y mantenimiento de aplicaciones con IA.'
  ]
where title = 'Herramientas para builders';

update public.challenges
set
  thematic_axes = array[
    'Pesca y economia costera',
    'Agro, agua y productividad',
    'Turismo sostenible y accesible',
    'Educacion, ciencia e inclusion digital',
    'Salud y acceso a servicios',
    'Empleo y emprendimiento',
    'Resiliencia y gestion de riesgos',
    'Ambiente y economia circular'
  ],
  suggested_topics = array[
    'Trazabilidad, cadena de frio, seguridad y comercializacion para pesca artesanal y alimentos.',
    'Alertas de riego, clima, plagas, precios o cosecha para productores de Manabi.',
    'Guias de turismo accesible, rutas culturales y experiencias que distribuyan mejor la demanda local.',
    'Tutores adaptativos de matematicas, lectura o ciencias con verificacion y fuentes.',
    'Asistentes para explorar hipotesis, demostraciones matematicas o literatura cientifica con evidencia.',
    'Orientacion de tramites, salud preventiva y servicios para personas con barreras digitales o de accesibilidad.',
    'Rutas seguras, alertas y coordinacion comunitaria ante sismos, tsunami, inundaciones o incendios.',
    'Reporte y priorizacion de residuos, contaminacion de playas, aguas servidas o puntos criticos.',
    'Formacion, empleabilidad y productividad para jovenes, emprendedores y pequenos negocios.',
    'Monitoreo de consumo de agua, fugas, calidad ambiental o uso eficiente de recursos.'
  ]
where title = 'Impacto local';

alter table public.challenges
  add constraint challenges_thematic_axes_count
    check (cardinality(thematic_axes) between 1 and 8),
  add constraint challenges_suggested_topics_count
    check (cardinality(suggested_topics) between 1 and 12);
