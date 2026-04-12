export const NIVELES = [
  "Inicial",
  "Primaria",
  "Secundaria"
];

export const AREAS_POR_NIVEL: Record<string, string[]> = {
  "Inicial": [
    "Personal Social",
    "Psicomotricidad",
    "Comunicación",
    "Castellano como Segunda Lengua",
    "Matemática",
    "Ciencia y Tecnología"
  ],
  "Primaria": [
    "Personal Social",
    "Educación Física",
    "Comunicación",
    "Castellano como Segunda Lengua",
    "Inglés",
    "Arte y Cultura",
    "Matemática",
    "Ciencia y Tecnología",
    "Educación Religiosa"
  ],
  "Secundaria": [
    "Matemática",
    "Comunicación",
    "Inglés",
    "Arte y Cultura",
    "Ciencias Sociales",
    "Desarrollo Personal, Ciudadanía y Cívica",
    "Educación Física",
    "Educación Religiosa",
    "Ciencia y Tecnología",
    "Educación para el Trabajo"
  ]
};

export const GRADOS_POR_NIVEL: Record<string, string[]> = {
  "Inicial": ["3 años", "4 años", "5 años"],
  "Primaria": ["1er Grado", "2do Grado", "3er Grado", "4to Grado", "5to Grado", "6to Grado"],
  "Secundaria": ["1er Grado", "2do Grado", "3er Grado", "4to Grado", "5to Grado"]
};

export const BIMESTRES = ["I", "II", "III", "IV"];

export const COMPETENCIAS_POR_AREA: Record<string, string[]> = {
  "Matemática": [
    "Resuelve problemas de cantidad",
    "Resuelve problemas de regularidad, equivalencia y cambio",
    "Resuelve problemas de forma, movimiento y localización",
    "Resuelve problemas de gestión de datos e incertidumbre"
  ],
  "Comunicación": [
    "Se comunica oralmente en su lengua materna",
    "Lee diversos tipos de textos escritos en su lengua materna",
    "Escribe diversos tipos de textos en su lengua materna"
  ],
  "Ciencia y Tecnología": [
    "Indaga mediante métodos científicos para construir sus conocimientos",
    "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo",
    "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno"
  ],
  "Desarrollo Personal, Ciudadanía y Cívica": [
    "Construye su identidad",
    "Convive y participa democráticamente en la búsqueda del bien común"
  ],
  "Ciencias Sociales": [
    "Construye interpretaciones históricas",
    "Gestiona responsablemente el espacio y el ambiente",
    "Gestiona responsablemente los recursos económicos"
  ],
  "Personal Social": [
    "Construye su identidad",
    "Convive y participa democráticamente en la búsqueda del bien común",
    "Construye interpretaciones históricas",
    "Gestiona responsablemente el espacio y el ambiente",
    "Gestiona responsablemente los recursos económicos"
  ],
  "Psicomotricidad": [
    "Se desenvuelve de manera autónoma a través de su motricidad"
  ],
  "Educación Física": [
    "Se desenvuelve de manera autónoma a través de su motricidad",
    "Asume una vida saludable",
    "Interactúa a través de sus habilidades sociomotrices"
  ],
  "Arte y Cultura": [
    "Aprecia de manera crítica manifestaciones artístico-culturales",
    "Crea proyectos desde los lenguajes artísticos"
  ],
  "Inglés": [
    "Se comunica oralmente en inglés como lengua extranjera",
    "Lee diversos tipos de textos en inglés como lengua extranjera",
    "Escribe diversos tipos de textos en inglés como lengua extranjera"
  ],
  "Educación Religiosa": [
    "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente...",
    "Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida..."
  ],
  "Educación para el Trabajo": [
    "Gestiona proyectos de emprendimiento económico o social"
  ],
  "Castellano como Segunda Lengua": [
    "Se comunica oralmente en castellano como segunda lengua",
    "Lee diversos tipos de textos escritos en castellano como segunda lengua",
    "Escribe diversos tipos de textos en castellano como segunda lengua"
  ]
};

export const ENFOQUES_TRANSVERSALES = [
  "Enfoque de Derechos",
  "Enfoque Inclusivo o de Atención a la diversidad",
  "Enfoque Intercultural",
  "Enfoque Igualdad de Género",
  "Enfoque Ambiental",
  "Enfoque Orientación al bien común",
  "Enfoque Búsqueda de la Excelencia"
];

export const COMPETENCIAS_TRANSVERSALES = [
  "Se desenvuelve en los entornos virtuales generados por las TIC",
  "Gestiona su aprendizaje de manera autónoma"
];

export const DURACIONES = [
  { label: "45 min (1 h clase)", value: "45" },
  { label: "90 min (2 h clase)", value: "90" },
  { label: "135 min (3 h clase)", value: "135" },
  { label: "180 min (4 h clase)", value: "180" },
  { label: "225 min (5 h clase)", value: "225" }
];

export const CONDICIONES_NEE = [
  "TEA (Trastorno del Espectro Autista)",
  "TDAH (Trastorno por Déficit de Atención e Hiperactividad)",
  "Discapacidad intelectual",
  "Discapacidad visual",
  "Discapacidad auditiva",
  "Síndrome de Down",
  "Dislexia",
  "Trastorno del lenguaje",
  "Dificultades de aprendizaje",
  "Escribir (personalizado)"
];

export const ACTIVIDADES_NEE = [
  "Uso de material concreto",
  "Actividades multisensoriales",
  "Juegos de roles",
  "Tareas más cortas y secuenciadas",
  "Apoyo visual (pictogramas, imágenes)",
  "Agrupación con compañeros de apoyo",
  "Rutinas visuales y anticipación",
  "Manipulativos y juegos didácticos",
  "Escribir (personalizado)"
];

export const INSTRUMENTOS_EVALUACION = [
  "Lista de cotejo",
  "Rúbrica de Evaluación",
  "Ficha de autoevaluación",
  "Escala de valoración",
  "Guía de observación",
  "Cuaderno de campo",
  "Portafolio"
];

export const OPCIONES_INCLUSION_2026 = [
  "Ninguno",
  "Inclusión y participación activa",
  "Atención a la diversidad",
  "Ambos"
];

export const OPCIONES_RECURSOS_2026 = [
  "Ninguno",
  "Material concreto y manipulativos del área",
  "Recursos digitales (videos, apps, páginas web)",
  "Textos y bibliografía recomendada",
  "Fotocopias, fichas y materiales impresos",
  "Recursos del entorno (materiales reciclados, local)",
  "Escribir o redactar (personalizado)"
];

export const OPCIONES_DIVERSIDAD_2026 = [
  "Ninguno",
  "Atención a NEE (necesidades educativas especiales)",
  "Ritmos de aprendizaje diversos",
  "Contexto cultural y plurilingüe",
  "Adaptaciones para estudiantes con barreras",
  "Agrupaciones flexibles",
  "Escribir o redactar (personalizado)"
];
