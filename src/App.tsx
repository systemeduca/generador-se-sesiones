import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Download, 
  Sparkles, 
  User, 
  School, 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  FileUp,
  Upload,
  FileText,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  HeadingLevel,
  VerticalAlign
} from 'docx';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils';
import { 
  AREAS_POR_NIVEL, 
  GRADOS_POR_NIVEL, 
  BIMESTRES, 
  NIVELES,
  COMPETENCIAS_POR_AREA, 
  ENFOQUES_TRANSVERSALES, 
  COMPETENCIAS_TRANSVERSALES,
  DURACIONES,
  CONDICIONES_NEE,
  ACTIVIDADES_NEE,
  INSTRUMENTOS_EVALUACION,
  OPCIONES_INCLUSION_2026,
  OPCIONES_RECURSOS_2026,
  OPCIONES_DIVERSIDAD_2026
} from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SpecialNeedStudent {
  id: string;
  name: string;
  condition: string;
  activity: string;
}

interface SessionData {
  teacherName: string;
  institution: string;
  directorName: string;
  studentContext: string;
  level: string;
  grade: string;
  area: string;
  topic: string;
  sessionTitle: string;
  bimestre: string;
  unit: string;
  sessionNumber: string;
  date: string;
  duration: string;
  instrument: string;
  studentList: string;
  competencies: string[];
  aiSuggestCompetency: boolean;
  transversalCompetencies: string[];
  transversalApproaches: string[];
  specialNeeds: SpecialNeedStudent[];
  generateTheory: boolean;
  generateApplication: boolean;
  templateFile?: {
    data: string;
    mimeType: string;
    name: string;
  };
  detectedSchema?: {
    detectedFields: string[];
    structureDescription: string;
    customSections: { title: string; fields: string[] }[];
  };
  unitPurpose?: string;
  inclusion2026?: string;
  resources2026?: string;
  resources2026Custom?: string;
  diversity2026?: string;
  diversity2026Custom?: string;
  dynamicFieldsValues: Record<string, string>;
}

export default function App() {
  const [view, setView] = useState<'landing' | 'form'>('landing');
  const [mode, setMode] = useState<'UNIT' | 'BOOKS' | 'FREE' | 'TEMPLATE' | null>(null);
  const [unitTab, setUnitTab] = useState<'upload' | 'current'>('upload');
  const [data, setData] = useState<SessionData>({
    teacherName: '',
    institution: '',
    directorName: '',
    studentContext: '',
    level: 'Secundaria',
    grade: '2do Grado',
    area: 'Matemática',
    topic: '',
    sessionTitle: '',
    bimestre: 'I',
    unit: '',
    sessionNumber: '',
    date: '',
    duration: '90',
    instrument: 'Lista de cotejo',
    studentList: '',
    competencies: [],
    aiSuggestCompetency: false,
    transversalCompetencies: [],
    transversalApproaches: [],
    specialNeeds: [],
    generateTheory: true,
    generateApplication: true,
    unitPurpose: '',
    inclusion2026: 'Ninguno',
    resources2026: 'Ninguno',
    resources2026Custom: '',
    diversity2026: 'Ninguno',
    diversity2026Custom: '',
    dynamicFieldsValues: {},
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isSuggestingContext, setIsSuggestingContext] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [savedLists, setSavedLists] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('edugen_saved_lists');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentListName, setCurrentListName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Formato no soportado. Sube JPG, PNG, PDF o Word (.docx).");
      return;
    }

    setIsAnalyzingTemplate(true);
    setError(null);

    try {
      let base64Data = '';
      let mimeType = file.type;
      let textContent = '';

      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textContent = result.value;
        mimeType = 'text/plain'; // We'll send text to Gemini
      } else if (file.type === 'application/pdf') {
        // We can send PDF directly to Gemini if it's supported, 
        // but let's try to extract some text or just send as is.
        // Gemini 1.5+ supports PDF base64.
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      } else {
        // Image
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      setData(prev => ({
        ...prev,
        templateFile: {
          data: base64Data || textContent,
          mimeType: mimeType,
          name: file.name
        }
      }));
      
      await analyzeTemplate(base64Data || textContent, mimeType);
    } catch (err) {
      console.error(err);
      setError("Error al procesar el archivo.");
      setIsAnalyzingTemplate(false);
    }
  };

  const analyzeTemplate = async (dataOrText: string, mimeType: string) => {
    setIsAnalyzingTemplate(true);
    setError(null);

    try {
      const prompt = `Analiza este archivo (esquema o formato de sesión de aprendizaje). 
      Identifica todas las secciones, tablas y campos que contiene.
      
      Debes mapear los campos detectados a estas categorías estándar si existen:
      - "teacherName": Nombre del docente
      - "institution": Institución Educativa
      - "level": Nivel (Primaria/Secundaria)
      - "grade": Grado
      - "bimestre": Bimestre o Trimestre
      - "area": Área curricular
      - "topic": Tema o contenido específico
      - "sessionTitle": Título de la sesión
      - "unit": Unidad de aprendizaje
      - "sessionNumber": Nº de sesión
      - "date": Fecha
      - "duration": Tiempo o duración
      - "instrument": Instrumento de evaluación
      - "studentContext": Contexto de los estudiantes (DUA)
      - "competencies": Competencias, capacidades o desempeños
      - "transversalCompetencies": Competencias transversales
      - "transversalApproaches": Enfoques transversales
      
      REGLAS CRÍTICAS:
      1. Si un campo del archivo se puede mapear a una de las categorías anteriores, INCLÚYELO en "mapping" y NO lo pongas en "missingFields".
      2. "missingFields" SOLO debe contener campos que NO existen en la lista anterior (ejemplo: "Eje articulador", "Propósito de la unidad", "Recursos TIC específicos").
      3. "hiddenStandardFields" debe contener las categorías estándar de la lista anterior que NO aparecen en el archivo analizado.
      
      Devuelve un objeto JSON con esta estructura:
      {
        "detectedFields": ["Campo 1", "Campo 2", ...],
        "mapping": {
          "nombre_campo_en_archivo": "nombre_categoria_estandar"
        },
        "missingFields": ["Campo nuevo 1", "Campo nuevo 2", ...],
        "hiddenStandardFields": ["categoria_estandar_a_ocultar_1", ...],
        "structureDescription": "Breve descripción"
      }`;

      let parts: any[] = [{ text: prompt }];
      if (mimeType === 'text/plain') {
        parts.push({ text: `Contenido del esquema:\n${dataOrText}` });
      } else {
        parts.push({ inlineData: { data: dataOrText, mimeType } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: { responseMimeType: "application/json" }
      });

      const schema = JSON.parse(response.text || '{}');
      
      const standardCategories = [
        'teacherName', 'institution', 'level', 'grade', 'bimestre', 'area', 
        'topic', 'sessionTitle', 'unit', 'sessionNumber', 'date', 'duration', 
        'instrument', 'studentContext', 'competencies', 'transversalCompetencies', 
        'transversalApproaches'
      ];

      // Initialize dynamic fields only for those that are truly missing from standard
      // and not already mapped to a standard category
      const mappedStandardFields = Object.values(schema.mapping || {});
      const dynamicFields = (schema.missingFields || [])
        .filter((field: string) => {
          // Check if the field name itself is a standard category (unlikely but possible)
          if (standardCategories.includes(field)) return false;
          // Check if this field was already mapped to a standard category
          const mappedTo = schema.mapping?.[field];
          if (mappedTo && standardCategories.includes(mappedTo)) return false;
          return true;
        })
        .reduce((acc: any, field: string) => {
          acc[field] = '';
          return acc;
        }, {});

      setData(prev => ({ 
        ...prev, 
        detectedSchema: schema,
        dynamicFieldsValues: dynamicFields
      }));
    } catch (err) {
      console.error(err);
      setError("No se pudo analizar el esquema automáticamente.");
    } finally {
      setIsAnalyzingTemplate(false);
    }
  };

  const isFieldVisible = (fieldName: string) => {
    if (!data.detectedSchema) return true;
    return !data.detectedSchema.hiddenStandardFields?.includes(fieldName);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'level') {
      const firstArea = AREAS_POR_NIVEL[value][0];
      const firstGrade = GRADOS_POR_NIVEL[value][0];
      setData(prev => ({ 
        ...prev, 
        level: value, 
        area: firstArea, 
        grade: firstGrade,
        competencies: [] 
      }));
    } else {
      setData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleCompetency = (comp: string) => {
    setData(prev => ({
      ...prev,
      competencies: prev.competencies.includes(comp)
        ? prev.competencies.filter(c => c !== comp)
        : [...prev.competencies, comp]
    }));
  };

  const toggleTransversalCompetency = (comp: string) => {
    setData(prev => ({
      ...prev,
      transversalCompetencies: prev.transversalCompetencies.includes(comp)
        ? prev.transversalCompetencies.filter(c => c !== comp)
        : [...prev.transversalCompetencies, comp]
    }));
  };

  const toggleTransversalApproach = (approach: string) => {
    setData(prev => ({
      ...prev,
      transversalApproaches: prev.transversalApproaches.includes(approach)
        ? prev.transversalApproaches.filter(a => a !== approach)
        : [...prev.transversalApproaches, approach]
    }));
  };

  const addSpecialNeed = () => {
    setData(prev => ({
      ...prev,
      specialNeeds: [
        ...prev.specialNeeds,
        { id: Math.random().toString(36).substr(2, 9), name: '', condition: '', activity: '' }
      ]
    }));
  };

  const updateSpecialNeed = (id: string, field: keyof SpecialNeedStudent, value: string) => {
    setData(prev => ({
      ...prev,
      specialNeeds: prev.specialNeeds.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const removeSpecialNeed = (id: string) => {
    setData(prev => ({
      ...prev,
      specialNeeds: prev.specialNeeds.filter(s => s.id !== id)
    }));
  };

  const saveCurrentList = () => {
    if (!currentListName.trim()) {
      setError("Ingresa un nombre para la lista");
      return;
    }
    const newLists = { ...savedLists, [currentListName]: data.studentList };
    setSavedLists(newLists);
    localStorage.setItem('edugen_saved_lists', JSON.stringify(newLists));
    setError(null);
  };

  const deleteList = (name: string) => {
    const newLists = { ...savedLists };
    delete newLists[name];
    setSavedLists(newLists);
    localStorage.setItem('edugen_saved_lists', JSON.stringify(newLists));
    if (currentListName === name) setCurrentListName('');
  };

  const loadList = (name: string) => {
    if (savedLists[name]) {
      setData(prev => ({ ...prev, studentList: savedLists[name] }));
      setCurrentListName(name);
    }
  };

  const suggestTitle = async () => {
    if (!data.topic || !data.area) {
      setError("Por favor ingresa un tema y selecciona un área para sugerir un título.");
      return;
    }

    setIsSuggestingTitle(true);
    setError(null);

    try {
      const prompt = `Sugiere un título creativo y pedagógico para una sesión de aprendizaje de ${data.area} para ${data.grade} sobre el tema: "${data.topic}". Responde únicamente con el título, sin comillas ni texto adicional.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const suggestedTitle = response.text.trim();
      setData(prev => ({ ...prev, sessionTitle: suggestedTitle }));
    } catch (err) {
      console.error(err);
      setError("Error al sugerir el título.");
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  const suggestContext = async () => {
    setIsSuggestingContext(true);
    setError(null);

    try {
      let locationInfo = "Perú (General)";
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        if (geoData.country_name === 'Peru' || geoData.country === 'PE') {
          locationInfo = `${geoData.city || ''} ${geoData.region || ''}, Perú`.trim();
        }
      } catch (geoErr) {
        console.warn("No se pudo detectar la ubicación exacta:", geoErr);
      }

      const prompt = `Como experto pedagogo peruano, describe el contexto de los estudiantes para una sesión de aprendizaje.
      Considera:
      - Institución Educativa: ${data.institution || 'No especificada'}
      - Nivel Educativo: ${data.level}
      - Región/Ubicación detectada: ${locationInfo}
      - Realidad: Basándote en el nombre de la institución y la región, describe el entorno socio-económico, necesidades de aprendizaje comunes en esa zona o tipo de colegio, e intereses típicos de estudiantes de ${data.level} en esa realidad específica del Perú.
      - Enfoque DUA: Menciona brevemente la variabilidad del aprendizaje en este grupo.
      Responde con un párrafo de máximo 100 palabras que sea realista, pedagógico y útil para un docente.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const suggestedContext = response.text.trim();
      setData(prev => ({ ...prev, studentContext: suggestedContext }));
    } catch (err) {
      console.error(err);
      setError("Error al sugerir el contexto. Intenta nuevamente.");
    } finally {
      setIsSuggestingContext(false);
    }
  };

  const generateSession = async () => {
    if (!data.topic) {
      setError("Por favor ingresa el tema específico de la sesión.");
      return;
    }
    if (!data.area) {
      setError("Por favor selecciona un área curricular.");
      return;
    }
    if (!data.aiSuggestCompetency && data.competencies.length === 0) {
      setError("Por favor selecciona al menos una competencia o activa la sugerencia por IA.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const availableCompetencies = COMPETENCIAS_POR_AREA[data.area] || [];
      const competencyInstruction = data.aiSuggestCompetency 
        ? `Analiza el tema "${data.topic}" y el área "${data.area}" para seleccionar la competencia más pertinente de esta lista oficial: [${availableCompetencies.join(', ')}]. Justifica pedagógicamente la elección en el contenido.`
        : `Usa estas competencias seleccionadas: ${data.competencies.join(', ')}`;

      const dynamicFieldsInstruction = Object.entries(data.dynamicFieldsValues)
        .filter(([_, v]) => String(v).trim() !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

      let templateInstruction = "";
      let contents: any = [];

      if (data.templateFile) {
        templateInstruction = `
          IMPORTANTE: El usuario ha subido un formato específico. 
          DEBES seguir estrictamente el esquema detectado: ${JSON.stringify(data.detectedSchema || 'Analiza el contenido adjunto')}.
          Si el formato tiene campos adicionales o una organización diferente a la estándar, ADÁPTATE a ella.
          Usa estos valores proporcionados por el usuario para los campos detectados:
          ${dynamicFieldsInstruction}
          
          Incluye en el JSON de respuesta una propiedad "customData" que contenga los valores finales para estos campos específicos.
        `;
        
        if (data.templateFile.mimeType === 'text/plain') {
          contents = [
            { text: `Contenido del esquema (Word):\n${data.templateFile.data}` },
            { text: `Genera la sesión siguiendo este esquema.` }
          ];
        } else {
          contents = [
            { inlineData: { data: data.templateFile.data, mimeType: data.templateFile.mimeType } },
            { text: `Genera la sesión siguiendo este formato visual.` }
          ];
        }
      }

      const prompt = `
        Genera una sesión de aprendizaje completa para el nivel ${data.level} en Perú, siguiendo la estructura del CNEB.
        ${templateInstruction}
        Datos:
        - Área: ${data.area}
        - Grado: ${data.grade}
        - Tema: ${data.topic}
        - Competencias: ${competencyInstruction}
        - Competencias Transversales: ${data.transversalCompetencies.length > 0 ? data.transversalCompetencies.join(', ') : 'Sugiérelas tú (TIC o Autonomía)'}
        - Enfoques Transversales: ${data.transversalApproaches.length > 0 ? data.transversalApproaches.join(', ') : 'Sugiérelos tú según el tema'}
        - Contexto: ${data.studentContext}
        - Propósito de la Unidad (Alineación): ${data.unitPurpose || 'No especificado'}
        - Enfoque Inclusión 2026: ${data.inclusion2026 !== 'Ninguno' ? data.inclusion2026 : 'No especificado'}
        - Recursos 2026: ${data.resources2026 === 'Escribir o redactar (personalizado)' ? data.resources2026Custom : (data.resources2026 !== 'Ninguno' ? data.resources2026 : 'No especificado')}
        - Diversidad 2026: ${data.diversity2026 === 'Escribir o redactar (personalizado)' ? data.diversity2026Custom : (data.diversity2026 !== 'Ninguno' ? data.diversity2026 : 'No especificado')}
        - Instrumento: ${data.instrument}

        Debes devolver un objeto JSON con la siguiente estructura (y añade "customData" si hay campos del esquema subido):
        {
          "sessionTitle": "Título creativo de la sesión",
          "unitTitle": "Título de la unidad de aprendizaje",
          "purpose": {
            "pedagogicalIntention": "Descripción detallada de la intención pedagógica",
            "significantSituationRelation": "Cómo se relaciona con una situación significativa real",
            "integralDevelopmentRelation": "Relación con el desarrollo integral del estudiante",
            "summary": "Propósito resumido"
          },
          "learningTable": [
            {
              "competency": "Nombre de la competencia",
              "capacities": ["Capacidad 1", "Capacidad 2"],
              "criteria": ["Criterio 1", "Criterio 2"],
              "instruments": ["Lista de cotejo", "Rúbrica"],
              "evidence": "Evidencia de aprendizaje esperada"
            }
          ],
          "transversalCompetencies": [
            {
              "competency": "Nombre de la competencia transversal",
              "capacities": ["Capacidad 1", "Capacidad 2"],
              "criteria": ["Criterio 1", "Criterio 2"],
              "instruments": ["Lista de cotejo"]
            }
          ],
          "transversalApproaches": [
            { "approach": "Enfoque", "value": "Valor", "attitude": "Actitud observable", "evidence": "Cuándo se evidencia" }
          ],
          "didacticSequence": {
            "inicio": [
              { "process": "Proceso pedagógico (ej. Motivación, Saberes previos, etc.)", "activities": "Descripción de actividades", "resources": "Materiales usados" }
            ],
            "desarrollo": [
              { "process": "Proceso didáctico específico de la competencia (ej. Familiarización con el problema, etc.)", "activities": "Descripción de los pasos didácticos", "resources": "Materiales usados" }
            ],
            "cierre": [
              { "process": "Proceso pedagógico (ej. Metacognición, Evaluación)", "activities": "Descripción de la reflexión final", "resources": "Materiales usados" }
            ]
          },
          "resources": [
            { "category": "Recursos educativos", "material": "Material X", "use": "Uso en la sesión" }
          ],
          "diversity": [
            { "strategy": "Ficha diferenciada", "description": "Descripción de la estrategia" }
          ],
          "feedback": [
            { "type": "Reflexiva", "description": "Descripción", "when": "Cuándo se aplica" }
          ],
          "theory": "Contenido teórico resumido del tema",
          "applicationSheet": [
            { "question": "Pregunta 1", "options": ["a", "b", "c", "d"], "answer": "a" }
          ],
          "customData": {} 
        }
        Asegúrate de que el contenido sea pedagógicamente sólido y adaptado al grado.
      `;

      if (contents.length === 0) {
        contents = prompt;
      } else {
        contents.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: data.templateFile ? { parts: contents } : prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const content = JSON.parse(response.text || '{}');
      setGeneratedContent(content);
      setData(prev => ({ ...prev, sessionTitle: content.sessionTitle }));
    } catch (err) {
      console.error(err);
      setError("Error al generar la sesión. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadWord = async () => {
    if (!generatedContent) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "SESIÓN DE APRENDIZAJE",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `"${(data.sessionTitle || data.topic || generatedContent.sessionTitle).toUpperCase()}"`,
                bold: true,
                size: 28,
                color: "1a5f7a",
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // I. DATOS INFORMATIVOS
          new Paragraph({
            children: [new TextRun({ text: "I. DATOS INFORMATIVOS", bold: true, color: "1a5f7a" })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "DOCENTE:", bold: true, color: "FFFFFF" })] })], 
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.teacherName)], width: { size: 75, type: WidthType.PERCENTAGE } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "INSTITUCIÓN:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.institution)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "ÁREA:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.area)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "GRADO/SECCIÓN:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.grade)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "UNIDAD:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.unit)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "Nº SESIÓN:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.sessionNumber)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "FECHA:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(data.date)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "TIEMPO:", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(`${data.duration} minutos`)] }),
                ],
              }),
            ],
          }),

          // II. PROPÓSITO
          new Paragraph({
            children: [new TextRun({ text: "II. PROPÓSITO DE LA SESIÓN", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "Intención pedagógica", bold: true, color: "FFFFFF" })] })], 
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(generatedContent.purpose.pedagogicalIntention)], width: { size: 70, type: WidthType.PERCENTAGE } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "Relación con la situación significativa", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(generatedContent.purpose.significantSituationRelation)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "Relación con el desarrollo integral", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(generatedContent.purpose.integralDevelopmentRelation)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "Propósito resumido", bold: true, color: "FFFFFF" })] })],
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(generatedContent.purpose.summary)] }),
                ],
              }),
            ],
          }),

          // III. COMPETENCIAS
          new Paragraph({
            children: [new TextRun({ text: "III. COMPETENCIA, CAPACIDADES, CRITERIOS DE EVALUACIÓN, INSTRUMENTOS Y EVIDENCIAS DE APRENDIZAJE", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPETENCIA", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CAPACIDADES", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CRITERIOS", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INSTRUMENTOS", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "EVIDENCIA", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                ],
              }),
              ...generatedContent.learningTable.map((row: any) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.competency, bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: row.capacities.map((c: string) => new Paragraph(`- ${c}`)) }),
                  new TableCell({ children: row.criteria.map((c: string) => new Paragraph(`- ${c}`)) }),
                  new TableCell({ children: (row.instruments || [data.instrument]).map((i: string) => new Paragraph(`- ${i}`)) }),
                  new TableCell({ children: [new Paragraph(row.evidence)] }),
                ],
              })),
              ...(generatedContent.transversalCompetencies || []).map((row: any) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.competency, bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: row.capacities.map((c: string) => new Paragraph(`- ${c}`)) }),
                  new TableCell({ children: row.criteria.map((c: string) => new Paragraph(`- ${c}`)) }),
                  new TableCell({ children: (row.instruments || [data.instrument]).map((i: string) => new Paragraph(`- ${i}`)) }),
                  new TableCell({ children: [new Paragraph("Se evidencia en el desarrollo de la sesión")] }),
                ],
              })),
            ],
          }),

          // IV. ENFOQUES TRANSVERSALES
          new Paragraph({
            children: [new TextRun({ text: "IV. ENFOQUES TRANSVERSALES", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ENFOQUE", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "VALOR", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACTITUD OBSERVABLE", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                ],
              }),
              ...(generatedContent.transversalApproaches || []).map((row: any) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(row.approach)] }),
                  new TableCell({ children: [new Paragraph(row.value)] }),
                  new TableCell({ children: [new Paragraph(row.attitude)] }),
                ],
              })),
            ],
          }),

          // V. OPCIONES 2026
          ...(data.inclusion2026 !== 'Ninguno' || data.resources2026 !== 'Ninguno' || data.diversity2026 !== 'Ninguno' ? [
            new Paragraph({
              children: [new TextRun({ text: "V. OPCIONES 2026 (INCLUSIÓN, DIVERSIDAD Y RECURSOS)", bold: true, color: "1a5f7a" })],
              spacing: { before: 400, after: 100 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CATEGORÍA", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DETALLE / SELECCIÓN", bold: true, color: "FFFFFF" })] })], shading: { fill: "1a5f7a" } }),
                  ],
                }),
                ...(data.inclusion2026 !== 'Ninguno' ? [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Enfoque inclusión y participación", bold: true })] })] }),
                      new TableCell({ children: [new Paragraph(data.inclusion2026 || '')] }),
                    ],
                  })
                ] : []),
                ...(data.resources2026 !== 'Ninguno' ? [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Recursos y referencias", bold: true })] })] }),
                      new TableCell({ children: [new Paragraph(data.resources2026 === 'Escribir o redactar (personalizado)' ? (data.resources2026Custom || '') : (data.resources2026 || ''))] }),
                    ],
                  })
                ] : []),
                ...(data.diversity2026 !== 'Ninguno' ? [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Consideraciones de diversidad", bold: true })] })] }),
                      new TableCell({ children: [new Paragraph(data.diversity2026 === 'Escribir o redactar (personalizado)' ? (data.diversity2026Custom || '') : (data.diversity2026 || ''))] }),
                    ],
                  })
                ] : []),
              ],
            })
          ] : []),

          // VI. SECUENCIA
          new Paragraph({
            children: [new TextRun({ text: "VI. SECUENCIA DIDÁCTICA", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MOMENTOS", bold: true, color: "FFFFFF" })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACTIVIDADES/ESTRATEGIAS", bold: true, color: "FFFFFF" })] })], width: { size: 65, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RECURSOS", bold: true, color: "FFFFFF" })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                ],
              }),
              // INICIO
              ...(generatedContent.didacticSequence.inicio || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "INICIO" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: item.process, bold: true })] }),
                    new Paragraph({ text: item.activities, spacing: { before: 100 } })
                  ] }),
                  new TableCell({ children: [new Paragraph(item.resources)] }),
                ],
              })),
              // DESARROLLO
              ...(generatedContent.didacticSequence.desarrollo || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "DESARROLLO" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: item.process, bold: true })] }),
                    new Paragraph({ text: item.activities, spacing: { before: 100 } })
                  ] }),
                  new TableCell({ children: [new Paragraph(item.resources)] }),
                ],
              })),
              // CIERRE
              ...(generatedContent.didacticSequence.cierre || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "CIERRE" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: item.process, bold: true })] }),
                    new Paragraph({ text: item.activities, spacing: { before: 100 } })
                  ] }),
                  new TableCell({ children: [new Paragraph(item.resources)] }),
                ],
              })),
            ],
          }),

          // VII. TEORÍA DEL TEMA
          ...(data.generateTheory ? [
            new Paragraph({
              children: [new TextRun({ text: "VII. TEORÍA DEL TEMA", bold: true })],
              spacing: { before: 400, after: 100 },
            }),
            new Paragraph(generatedContent.theory)
          ] : []),

          // VIII. INSTRUMENTO DE EVALUACIÓN
          new Paragraph({
            children: [new TextRun({ text: `VIII. INSTRUMENTO DE EVALUACIÓN: ${data.instrument.toUpperCase()}`, bold: true })],
            spacing: { before: 400, after: 100 },
          }),
          ...(data.studentList.trim() ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "N°", bold: true })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Apellidos y Nombres", bold: true })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                    ...generatedContent.learningTable[0]?.criteria.slice(0, 3).map((_: any, idx: number) => 
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Criterio ${idx + 1}`, bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } })
                    ) || []
                  ],
                }),
                ...data.studentList.split('\n').filter(name => name.trim()).map((name, idx) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph((idx + 1).toString())] }),
                    new TableCell({ children: [new Paragraph(name.trim())] }),
                    ...Array(Math.min(generatedContent.learningTable[0]?.criteria.length || 0, 3)).fill(0).map(() => 
                      new TableCell({ children: [new Paragraph("")] })
                    )
                  ],
                })),
              ],
            })
          ] : [
            new Paragraph("Se adjunta el instrumento seleccionado para la evaluación de las evidencias de aprendizaje.")
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Sesion_${data.topic.replace(/\s+/g, '_')}.docx`);
  };

  const selectMode = (m: 'UNIT' | 'BOOKS' | 'FREE' | 'TEMPLATE') => {
    setMode(m);
    setView('form');
    // Si es modo libre, limpiamos el template si existía
    if (m === 'FREE') {
      setData(prev => ({ ...prev, templateFile: undefined, detectedSchema: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-screen text-center"
          >
            <div className="mb-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                  <GraduationCap className="text-white w-10 h-10" />
                </div>
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-4">
                Generador de Sesiones <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  de Aprendizaje V-5.4
                </span>
                <span className="ml-4 inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-bold align-middle">
                  CNEB 2026
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Una herramienta creada por <span className="text-emerald-400 font-semibold">Juan Caicedo</span> y potenciada por <span className="text-cyan-400 font-semibold">Gemini</span>
              </p>
            </div>

            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 text-sm mb-12 hover:bg-slate-800 transition-colors">
              <span className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center text-[10px] text-white font-bold">i</span>
              Novedades 2026 ▼
            </button>

            <div className="w-full bg-slate-900/40 border border-slate-800/60 rounded-[40px] p-8 md:p-12 backdrop-blur-xl shadow-2xl shadow-black/20">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">1</div>
                <h2 className="text-2xl md:text-3xl font-bold">¿Cómo quieres crear la sesión?</h2>
              </div>
              <p className="text-slate-400 mb-12 text-sm md:text-base">Cuatro formas de trabajar: elige la que mejor encaje con tu caso.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => selectMode('UNIT')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 shadow-xl hover:shadow-indigo-500/20 border border-indigo-400/20"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Unidad de Aprendizaje</h3>
                  <p className="text-indigo-100/70 text-sm">Genera sesiones a partir de tu unidad ya planificada.</p>
                </button>

                <button 
                  onClick={() => selectMode('BOOKS')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-blue-600 hover:bg-blue-500 transition-all duration-300 shadow-xl hover:shadow-blue-500/20 border border-blue-400/20"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Libros del Estado</h3>
                  <p className="text-blue-100/70 text-sm">Genera Matemática y Comunicación si usas los libros del Estado.</p>
                </button>

                <button 
                  onClick={() => selectMode('FREE')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-purple-600 hover:bg-purple-500 transition-all duration-300 shadow-xl hover:shadow-purple-500/20 border border-purple-400/20"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Sesión libre</h3>
                  <p className="text-purple-100/70 text-sm">Genera cualquier curso sin información previa.</p>
                </button>

                <button 
                  onClick={() => selectMode('TEMPLATE')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 shadow-xl hover:shadow-emerald-500/20 border border-emerald-400/20"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Modelo de mi colegio</h3>
                  <p className="text-emerald-100/70 text-sm">Crea tu sesión con la plantilla o esquema de tu colegio.</p>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-[#0f172a] text-white"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
              <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setView('landing')}
                    className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
                  >
                    <GraduationCap className="text-white w-6 h-6" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">EduGen <span className="text-emerald-400">V-5.4</span></h1>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">CNEB 2026 • {mode === 'UNIT' ? 'Unidad' : mode === 'BOOKS' ? 'Libros' : mode === 'FREE' ? 'Libre' : 'Plantilla'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('landing')}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Volver al inicio
                  </button>
                  <div className="h-4 w-px bg-slate-800" />
                  <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded text-slate-400">PRO</span>
                </div>
              </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Form Section */}
                <div className="lg:col-span-7 space-y-10">
                  {/* Smart Template Section (Only if not FREE mode) */}
                  {mode !== 'FREE' && (
                    <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 space-y-4 backdrop-blur-xl">
                      {mode === 'UNIT' && (
                        <div className="flex p-1 bg-slate-800/30 rounded-2xl mb-4">
                          <button 
                            onClick={() => setUnitTab('upload')}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                              unitTab === 'upload' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            <Upload size={14} />
                            Subir Unidad
                          </button>
                          <button 
                            onClick={() => setUnitTab('current')}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                              unitTab === 'current' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            <Calendar size={14} />
                            Sesión Establecida
                          </button>
                        </div>
                      )}

                      {unitTab === 'upload' || mode !== 'UNIT' ? (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              {mode === 'UNIT' ? <FileText size={24} /> : mode === 'BOOKS' ? <BookOpen size={24} /> : <FileUp size={24} />}
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-white">
                                {mode === 'UNIT' ? 'Subir Unidad de Aprendizaje' : mode === 'BOOKS' ? 'Subir Libro/Página MINEDU' : 'Subir Esquema/Plantilla'}
                              </h2>
                              <p className="text-xs text-slate-400">
                                {mode === 'UNIT' ? 'Sube tu unidad para que la IA extraiga la secuencia.' : mode === 'BOOKS' ? 'Sube la página del libro para generar la sesión.' : 'Sube tu esquema para adaptar el formulario.'}
                              </p>
                            </div>
                          </div>

                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="template-upload"
                            />
                            <label 
                              htmlFor="template-upload"
                              className={cn(
                                "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                data.templateFile ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 hover:border-emerald-500/30"
                              )}
                            >
                              {isAnalyzingTemplate ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin text-emerald-400" />
                                  <span className="text-xs font-bold text-emerald-400">Analizando...</span>
                                </div>
                              ) : data.templateFile ? (
                                <div className="flex flex-col items-center gap-1">
                                  <CheckCircle2 className="text-emerald-400" />
                                  <span className="text-xs font-bold text-emerald-200">{data.templateFile.name}</span>
                                  <span className="text-[10px] text-emerald-400/70">Archivo cargado con éxito</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Upload className="text-slate-500 mb-1" />
                                  <span className="text-xs font-bold text-slate-400">Subir archivo</span>
                                  <span className="text-[10px] text-slate-500">JPG, PNG, PDF, Word (Max 5MB)</span>
                                </div>
                              )}
                            </label>
                          </div>
                          
                          {data.detectedSchema && (
                            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Campos Detectados:</p>
                              <div className="flex flex-wrap gap-2">
                                {data.detectedSchema.detectedFields?.map((f: string) => (
                                  <span key={f} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full font-medium border border-emerald-500/20">{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                              <Calendar size={24} />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-white">Sesión Establecida</h2>
                              <p className="text-xs text-slate-400">Configura los detalles de la sesión actual de tu unidad.</p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700 space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Título de la Unidad</label>
                              <input 
                                type="text"
                                name="unit"
                                value={data.unit}
                                onChange={handleInputChange}
                                placeholder="Ej: Unidad 1"
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all text-white placeholder:text-slate-600"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              * Esta información se sincroniza con el formulario principal.
                            </p>
                          </div>
                        </div>
                      )}
                    </section>
                  )}

              {data.detectedSchema && data.detectedSchema.missingFields && data.detectedSchema.missingFields.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-4 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-400" size={16} />
                    <h3 className="text-xs font-bold text-blue-200 uppercase tracking-wider">Campos Adicionales Detectados</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.detectedSchema.missingFields.map((field) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{field}</label>
                        <input 
                          type="text"
                          value={data.dynamicFieldsValues[field] || ''}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            dynamicFieldsValues: {
                              ...prev.dynamicFieldsValues,
                              [field]: e.target.value
                            }
                          }))}
                          placeholder={`Ingresa ${field.toLowerCase()}...`}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-blue-500/20 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-lg font-bold text-white">Datos del Docente e Institución</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isFieldVisible('teacherName') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} /> Nombre del Docente
                    </label>
                    <input 
                      type="text" 
                      name="teacherName"
                      value={data.teacherName}
                      onChange={handleInputChange}
                      placeholder="Ej. Pedro Ruiz"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600"
                    />
                  </div>
                )}
                {isFieldVisible('institution') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <School size={14} /> Institución Educativa
                    </label>
                    <input 
                      type="text" 
                      name="institution"
                      value={data.institution}
                      onChange={handleInputChange}
                      placeholder="Ej. I.E. Martín de la Riva"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600"
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-lg font-bold text-white">Contexto y Planificación</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isFieldVisible('level') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nivel Educativo</label>
                      <select 
                        name="level"
                        value={data.level}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                      >
                        {NIVELES.map(n => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('grade') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grado</label>
                      <select 
                        name="grade"
                        value={data.grade}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                      >
                        {GRADOS_POR_NIVEL[data.level].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('bimestre') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bimestre / Trimestre</label>
                      <select 
                        name="bimestre"
                        value={data.bimestre}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                      >
                        {BIMESTRES.map(b => <option key={b} value={b} className="bg-slate-900">{b} Bimestre</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isFieldVisible('unit') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidad de Aprendizaje</label>
                      <input 
                        type="text" 
                        name="unit"
                        value={data.unit}
                        onChange={handleInputChange}
                        placeholder="Ej. Unidad 1"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white placeholder:text-slate-600"
                      />
                    </div>
                  )}
                  {isFieldVisible('sessionNumber') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nº de Sesión</label>
                      <input 
                        type="text" 
                        name="sessionNumber"
                        value={data.sessionNumber}
                        onChange={handleInputChange}
                        placeholder="Ej. Sesión 05"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white placeholder:text-slate-600"
                      />
                    </div>
                  )}
                  {isFieldVisible('date') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date" 
                        name="date"
                        value={data.date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isFieldVisible('area') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Área Curricular</label>
                      <select 
                        name="area"
                        value={data.area}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                      >
                        {AREAS_POR_NIVEL[data.level].map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('duration') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración total de la Sesión (minutos)</label>
                      <select 
                        name="duration"
                        value={data.duration}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                      >
                        {DURACIONES.map(d => <option key={d.value} value={d.value} className="bg-slate-900">{d.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {isFieldVisible('instrument') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instrumento de Evaluación</label>
                    <select 
                      name="instrument"
                      value={data.instrument}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-white appearance-none cursor-pointer"
                    >
                      {INSTRUMENTOS_EVALUACION.map(i => <option key={i} value={i} className="bg-slate-900">{i}</option>)}
                    </select>
                  </div>
                )}

                {isFieldVisible('topic') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={14} /> Tema Específico de la Sesión
                    </label>
                    <input 
                      type="text" 
                      name="topic"
                      value={data.topic}
                      onChange={handleInputChange}
                      placeholder="Ej. Las Fracciones en la vida diaria"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white placeholder:text-slate-600"
                    />
                  </div>
                )}

                {isFieldVisible('sessionTitle') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400" /> Título de la sesión
                      </label>
                      <button 
                        onClick={suggestTitle}
                        disabled={isSuggestingTitle}
                        className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {isSuggestingTitle ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Sugerir con IA
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      <span className="text-yellow-500 font-bold">(Opcional)</span> Para el encabezado del Word; si lo dejas vacío se usa el tema.
                    </p>
                    <textarea 
                      name="sessionTitle"
                      value={data.sessionTitle}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Título de la sesión..."
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm font-medium text-white placeholder:text-slate-600"
                    />
                  </div>
                )}

                {isFieldVisible('studentContext') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Contexto de los estudiantes (DUA)
                      </label>
                      <button 
                        onClick={suggestContext}
                        disabled={isSuggestingContext}
                        className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {isSuggestingContext ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Sugerir con IA
                      </button>
                    </div>
                    <textarea 
                      name="studentContext"
                      value={data.studentContext}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe el entorno, necesidades e intereses de tus alumnos..."
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white placeholder:text-slate-600"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex flex-col gap-1">
                    <span className="flex items-center gap-2"><Target size={14} /> Propósito de aprendizaje</span>
                    <span className="text-[10px] text-yellow-500 lowercase font-medium">
                      <span className="font-bold uppercase">(Opcional)</span> Si realizaste la <span className="font-bold uppercase text-emerald-400">UNIDAD</span> en el generador, pégalo aquí para alinear toda la sesión con ese propósito.
                    </span>
                  </label>
                  <textarea 
                    name="unitPurpose"
                    value={data.unitPurpose}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Pega el propósito de tu unidad..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-emerald-500/20 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            </section>

            {isFieldVisible('competencies') && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-lg font-bold text-white">Competencias a Desarrollar</h2>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 space-y-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
                    <input 
                      type="text" 
                      className="hidden" // Just to keep the structure if needed, but we use state
                    />
                    <input 
                      type="checkbox" 
                      id="aiSuggestCompetency"
                      checked={data.aiSuggestCompetency}
                      onChange={(e) => setData(prev => ({ ...prev, aiSuggestCompetency: e.target.checked, competencies: e.target.checked ? [] : prev.competencies }))}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <label htmlFor="aiSuggestCompetency" className="text-sm font-bold text-emerald-400 cursor-pointer">
                      Dejar que la IA sugiera la competencia
                    </label>
                  </div>
                  
                  {!data.aiSuggestCompetency && (
                    <>
                      <p className="text-xs font-medium text-slate-500 italic">Selecciona hasta 3 competencias para esta sesión:</p>
                      <div className="grid grid-cols-1 gap-3">
                        {COMPETENCIAS_POR_AREA[data.area]?.map(comp => (
                          <button
                            key={comp}
                            onClick={() => toggleCompetency(comp)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.competencies.includes(comp) 
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                                : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-500"
                            )}
                          >
                            {comp}
                            {data.competencies.includes(comp) && <CheckCircle2 size={16} className="text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {(isFieldVisible('transversalCompetencies') || isFieldVisible('transversalApproaches')) && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">4</div>
                  <h2 className="text-lg font-bold text-white">Elementos Transversales (Opcional)</h2>
                </div>
                <div className="space-y-6">
                  {isFieldVisible('transversalCompetencies') && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Competencias Transversales</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMPETENCIAS_TRANSVERSALES.map(comp => (
                          <button
                            key={comp}
                            onClick={() => toggleTransversalCompetency(comp)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.transversalCompetencies.includes(comp) 
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                                : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-500"
                            )}
                          >
                            {comp}
                            {data.transversalCompetencies.includes(comp) && <CheckCircle2 size={16} className="text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                      {data.transversalCompetencies.length === 0 && (
                        <p className="text-[10px] text-slate-500 italic">Si no seleccionas ninguna, la IA sugerirá las más pertinentes.</p>
                      )}
                    </div>
                  )}

                  {isFieldVisible('transversalApproaches') && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enfoques Transversales</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ENFOQUES_TRANSVERSALES.map(approach => (
                          <button
                            key={approach}
                            onClick={() => toggleTransversalApproach(approach)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.transversalApproaches.includes(approach) 
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                                : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-500"
                            )}
                          >
                            {approach}
                            {data.transversalApproaches.includes(approach) && <CheckCircle2 size={16} className="text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                      {data.transversalApproaches.length === 0 && (
                        <p className="text-[10px] text-slate-500 italic">Si no seleccionas ninguno, la IA sugerirá los más pertinentes.</p>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-6 mt-6">
                    <h3 className="text-emerald-400 font-bold text-center text-sm uppercase tracking-widest">Opciones 2026 (inclusión, diversidad, recursos)</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300">Enfoque inclusión y participación <span className="text-yellow-500">(Opcional)</span>:</label>
                        <select 
                          name="inclusion2026"
                          value={data.inclusion2026}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                          {OPCIONES_INCLUSION_2026.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-800">{opt === 'Ninguno' ? '-- Ninguno --' : opt}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300">Recursos y referencias <span className="text-yellow-500">(Opcional)</span>:</label>
                        <select 
                          name="resources2026"
                          value={data.resources2026}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                          {OPCIONES_RECURSOS_2026.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-800">{opt === 'Ninguno' ? '-- Ninguno --' : opt}</option>
                          ))}
                        </select>
                        {data.resources2026 === 'Escribir o redactar (personalizado)' && (
                          <textarea 
                            name="resources2026Custom"
                            value={data.resources2026Custom}
                            onChange={handleInputChange}
                            placeholder="Escribe aquí tus recursos y referencias..."
                            className="w-full bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24 mt-2"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300">Consideraciones de diversidad <span className="text-yellow-500">(Opcional)</span>:</label>
                        <select 
                          name="diversity2026"
                          value={data.diversity2026}
                          onChange={handleInputChange}
                          className="w-full bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                          {OPCIONES_DIVERSIDAD_2026.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-800">{opt === 'Ninguno' ? '-- Ninguno --' : opt}</option>
                          ))}
                        </select>
                        {data.diversity2026 === 'Escribir o redactar (personalizado)' && (
                          <textarea 
                            name="diversity2026Custom"
                            value={data.diversity2026Custom}
                            onChange={handleInputChange}
                            placeholder="Escribe aquí tus consideraciones de diversidad..."
                            className="w-full bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24 mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {isFieldVisible('specialNeeds') && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">5</div>
                    <h2 className="text-lg font-bold text-white">Inclusión (NEE)</h2>
                  </div>
                  <button 
                    onClick={addSpecialNeed}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus size={14} /> Agregar Alumno
                  </button>
                </div>
                
                <div className="space-y-4">
                  <AnimatePresence>
                    {data.specialNeeds.map((student) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 relative group backdrop-blur-xl"
                      >
                        <button 
                          onClick={() => removeSpecialNeed(student.id)}
                          className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del alumno</label>
                            <input 
                              type="text" 
                              value={student.name}
                              onChange={(e) => updateSpecialNeed(student.id, 'name', e.target.value)}
                              placeholder="Nombre..."
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm text-white placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condición</label>
                            <select 
                              value={student.condition}
                              onChange={(e) => updateSpecialNeed(student.id, 'condition', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm text-white appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-slate-900">Seleccionar condición...</option>
                              {CONDICIONES_NEE.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividad Sugerida</label>
                            <select 
                              value={student.activity}
                              onChange={(e) => updateSpecialNeed(student.id, 'activity', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm text-white appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-slate-900">Seleccionar actividad...</option>
                              {ACTIVIDADES_NEE.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {data.specialNeeds.length === 0 && (
                    <div className="border-2 border-dashed border-slate-800 rounded-2xl py-10 flex flex-col items-center justify-center text-slate-600">
                      <Plus size={32} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">No hay alumnos con NEE registrados</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {isFieldVisible('studentList') && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">6</div>
                    <h2 className="text-lg font-bold text-white">Lista de Alumnos (Opcional)</h2>
                  </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={saveCurrentList}
                    className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    Guardar lista
                  </button>
                  {currentListName && (
                    <button 
                      onClick={() => deleteList(currentListName)}
                      className="text-[10px] font-bold bg-red-500/10 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 space-y-4 backdrop-blur-xl">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seleccionar lista guardada</label>
                  <select 
                    value={currentListName}
                    onChange={(e) => loadList(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-white appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">-- Seleccionar lista guardada --</option>
                    {Object.keys(savedLists).map(name => (
                      <option key={name} value={name} className="bg-slate-900">{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la lista (para guardar)</label>
                  <input 
                    type="text"
                    value={currentListName}
                    onChange={(e) => setCurrentListName(e.target.value)}
                    placeholder="Ej. 2do A - Matemática"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-white placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombres de alumnos (uno por línea)</label>
                  <textarea 
                    value={data.studentList}
                    onChange={(e) => setData(prev => ({ ...prev, studentList: e.target.value }))}
                    rows={6}
                    placeholder="Juan Pérez García&#10;María López Rodríguez&#10;..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm font-mono text-white placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">Los nombres aparecerán en el instrumento de evaluación del documento Word.</p>
                </div>
              </div>
            </section>
          )}

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">7</div>
                <h2 className="text-lg font-bold text-white">Opciones de Contenido Adicional</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                  data.generateTheory ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-800/30 border-slate-700 hover:border-slate-500"
                )}>
                  <input 
                    type="checkbox"
                    checked={data.generateTheory}
                    onChange={(e) => setData(prev => ({ ...prev, generateTheory: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="block font-bold text-white">Generar Teoría del Tema</span>
                    <span className="text-xs text-slate-500">Crea un resumen teórico detallado para la sesión.</span>
                  </div>
                </label>
                <label className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                  data.generateApplication ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-800/30 border-slate-700 hover:border-slate-500"
                )}>
                  <input 
                    type="checkbox"
                    checked={data.generateApplication}
                    onChange={(e) => setData(prev => ({ ...prev, generateApplication: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="block font-bold text-white">Generar Ficha de Aplicación</span>
                    <span className="text-xs text-slate-500">Crea preguntas y actividades de evaluación.</span>
                  </div>
                </label>
              </div>
            </section>

            <div className="pt-6">
              <button 
                onClick={generateSession}
                disabled={isGenerating}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Generar Sesión Completa
                  </>
                )}
              </button>
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-500/20">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                <div className="bg-slate-950 p-6 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vista Previa del Documento</span>
                </div>
                
                <div className="p-8 min-h-[600px] flex flex-col">
                  {!generatedContent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600">
                        <FileText size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500">Sin contenido generado</p>
                        <p className="text-xs text-slate-600 max-w-[200px] mx-auto mt-1">Completa el formulario y presiona generar para ver el resultado aquí.</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black leading-tight text-white">{generatedContent.sessionTitle}</h3>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{data.area} • {data.grade}</p>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50 space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Propósito Resumido</h4>
                            <p className="text-sm text-slate-300 leading-relaxed italic">"{generatedContent.purpose.summary}"</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-700/50">
                            <div>
                              <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Situación Significativa</h5>
                              <p className="text-[11px] text-slate-400 leading-tight">{generatedContent.purpose.significantSituationRelation}</p>
                            </div>
                            <div>
                              <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Desarrollo Integral</h5>
                              <p className="text-[11px] text-slate-400 leading-tight">{generatedContent.purpose.integralDevelopmentRelation}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Elementos Transversales</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                              <p className="text-[9px] font-bold text-emerald-400 uppercase mb-1">Competencias</p>
                              <p className="text-[10px] text-slate-400 line-clamp-2">
                                {generatedContent.transversalCompetencies?.map((c: any) => c.competency).join(', ') || "Sugeridas por IA"}
                              </p>
                            </div>
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                              <p className="text-[9px] font-bold text-emerald-400 uppercase mb-1">Enfoques</p>
                              <p className="text-[10px] text-slate-400 line-clamp-2">
                                {generatedContent.transversalApproaches?.map((a: any) => a.approach).join(', ') || "Sugeridos por IA"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {generatedContent.customData && Object.keys(generatedContent.customData).length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Datos del Formato Detectado</h4>
                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
                              {Object.entries(generatedContent.customData).map(([key, val]) => (
                                <div key={key} className="flex justify-between gap-4">
                                  <span className="text-[10px] font-bold text-blue-400 uppercase">{key}:</span>
                                  <span className="text-[10px] text-slate-400 text-right">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secuencia Didáctica</h4>
                          <div className="space-y-3">
                            {['inicio', 'desarrollo', 'cierre'].map((moment) => (
                              <div key={moment} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold uppercase">
                                    {moment[0]}
                                  </div>
                                  <span className="text-xs font-bold text-slate-300 uppercase">{moment}</span>
                                </div>
                                {generatedContent.didacticSequence[moment]?.map((item: any, idx: number) => (
                                  <div key={idx} className="space-y-1">
                                    <p className="text-[10px] font-bold text-emerald-400">{item.process}</p>
                                    <p className="text-[11px] text-slate-400 line-clamp-3">{item.activities}</p>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 mt-auto">
                        <button 
                          onClick={downloadWord}
                          className="w-full bg-white text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-lg shadow-black/20"
                        >
                          <Download size={20} />
                          Descargar Word (.docx)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <Sparkles className="text-emerald-400 mb-2" size={18} />
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">IA Optimizada</p>
                  <p className="text-[10px] text-slate-500 mt-1">Generación basada en el CNEB 2026.</p>
                </div>
                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <Target className="text-blue-400 mb-2" size={18} />
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Enfoque DUA</p>
                  <p className="text-[10px] text-slate-500 mt-1">Adaptaciones curriculares automáticas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-30 grayscale invert">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <GraduationCap className="text-slate-900 w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">EduGen</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">© 2026 Juan Caicedo • Potenciado por Google Gemini</p>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Servidor Activo</span>
          </div>
        </div>
      </footer>
    </motion.div>
  )}
</AnimatePresence>
</div>
);
}
