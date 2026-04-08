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
  INSTRUMENTOS_EVALUACION 
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
  dynamicFieldsValues: Record<string, string>;
}

export default function App() {
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
              { "process": "Motivación, Saberes previos y Conflicto cognitivo", "activities": "Descripción de actividades", "resources": "Materiales usados" }
            ],
            "desarrollo": [
              { "process": "Gestión y acompañamiento del desarrollo de las competencias", "activities": "Descripción de los pasos didácticos", "resources": "Materiales usados" }
            ],
            "cierre": [
              { "process": "Evaluación y Metacognición", "activities": "Descripción de la reflexión final", "resources": "Materiales usados" }
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

          // CUSTOM DATA (IF TEMPLATE USED)
          ...(generatedContent.customData && Object.keys(generatedContent.customData).length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "DATOS ADICIONALES (SEGÚN FORMATO)", bold: true, color: "1a5f7a" })],
              spacing: { before: 400, after: 100 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: Object.entries(generatedContent.customData).map(([key, val]) => new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: key.toUpperCase(), bold: true, color: "FFFFFF" })] })], 
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "1a5f7a" }
                  }),
                  new TableCell({ children: [new Paragraph(String(val))], width: { size: 70, type: WidthType.PERCENTAGE } }),
                ],
              })),
            })
          ] : []),

          // II. PROPÓSITO
          new Paragraph({
            children: [new TextRun({ text: "II. PROPÓSITO DE LA SESIÓN", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
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

          // V. SECUENCIA
          new Paragraph({
            children: [new TextRun({ text: "V. SECUENCIA DIDÁCTICA", bold: true, color: "1a5f7a" })],
            spacing: { before: 400, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MOMENTOS", bold: true, color: "FFFFFF" })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PROCESOS", bold: true, color: "FFFFFF" })] })], width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACTIVIDADES/ESTRATEGIAS Y RECURSOS", bold: true, color: "FFFFFF" })] })], width: { size: 60, type: WidthType.PERCENTAGE }, shading: { fill: "1a5f7a" } }),
                ],
              }),
              // INICIO
              ...(generatedContent.didacticSequence.inicio || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "INICIO" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [new Paragraph(item.process)] }),
                  new TableCell({ children: [
                    new Paragraph(item.activities),
                    new Paragraph({ children: [new TextRun({ text: `Recursos: ${item.resources}`, italics: true })], spacing: { before: 100 } })
                  ] }),
                ],
              })),
              // DESARROLLO
              ...(generatedContent.didacticSequence.desarrollo || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "DESARROLLO" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [new Paragraph(item.process)] }),
                  new TableCell({ children: [
                    new Paragraph(item.activities),
                    new Paragraph({ children: [new TextRun({ text: `Recursos: ${item.resources}`, italics: true })], spacing: { before: 100 } })
                  ] }),
                ],
              })),
              // CIERRE
              ...(generatedContent.didacticSequence.cierre || []).map((item: any, idx: number) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "CIERRE" : "", bold: true })] })], shading: { fill: "f0f7f9" } }),
                  new TableCell({ children: [new Paragraph(item.process)] }),
                  new TableCell({ children: [
                    new Paragraph(item.activities),
                    new Paragraph({ children: [new TextRun({ text: `Recursos: ${item.resources}`, italics: true })], spacing: { before: 100 } })
                  ] }),
                ],
              })),
            ],
          }),

          // VI. TEORÍA DEL TEMA
          ...(data.generateTheory ? [
            new Paragraph({
              children: [new TextRun({ text: "VI. TEORÍA DEL TEMA", bold: true })],
              spacing: { before: 400, after: 100 },
            }),
            new Paragraph(generatedContent.theory)
          ] : []),

          // VII. INSTRUMENTO DE EVALUACIÓN
          new Paragraph({
            children: [new TextRun({ text: `VII. INSTRUMENTO DE EVALUACIÓN: ${data.instrument.toUpperCase()}`, bold: true })],
            spacing: { before: 400, after: 100 },
          }),
          ...(data.studentList.trim() ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
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

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">EduGen <span className="text-emerald-500">V-5.4</span></h1>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">CNEB 2026 • Secundaria</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Reiniciar
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-500">PRO</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Form Section */}
          <div className="lg:col-span-7 space-y-10">
            {/* Smart Template Section */}
            <section className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                  <FileUp size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">Modo Inteligente</h2>
                  <p className="text-xs text-emerald-600">Sube tu esquema (PDF/Word/Imagen) para adaptar el formulario.</p>
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
                    data.templateFile ? "bg-emerald-100 border-emerald-300" : "bg-white border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  {isAnalyzingTemplate ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">Analizando esquema...</span>
                    </div>
                  ) : data.templateFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-800">{data.templateFile.name}</span>
                      <span className="text-[10px] text-emerald-600">Esquema adaptado con éxito</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-emerald-700">Subir esquema o formato</span>
                      <span className="text-[10px] text-emerald-500">JPG, PNG, PDF, Word (Max 5MB)</span>
                    </div>
                  )}
                </label>
              </div>
              
              {data.detectedSchema && (
                <div className="bg-white/50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2">Campos Detectados en el Archivo:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.detectedSchema.detectedFields?.map((f: string) => (
                      <span key={f} className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.detectedSchema && data.detectedSchema.missingFields && data.detectedSchema.missingFields.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-500" size={16} />
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Campos Adicionales Detectados</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.detectedSchema.missingFields.map((field) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{field}</label>
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
                          className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-lg font-bold">Datos del Docente e Institución</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isFieldVisible('teacherName') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} /> Nombre del Docente
                    </label>
                    <input 
                      type="text" 
                      name="teacherName"
                      value={data.teacherName}
                      onChange={handleInputChange}
                      placeholder="Ej. Pedro Ruiz"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}
                {isFieldVisible('institution') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <School size={14} /> Institución Educativa
                    </label>
                    <input 
                      type="text" 
                      name="institution"
                      value={data.institution}
                      onChange={handleInputChange}
                      placeholder="Ej. I.E. Martín de la Riva"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-lg font-bold">Contexto y Planificación</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isFieldVisible('level') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nivel Educativo</label>
                      <select 
                        name="level"
                        value={data.level}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('grade') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grado</label>
                      <select 
                        name="grade"
                        value={data.grade}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {GRADOS_POR_NIVEL[data.level].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('bimestre') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bimestre / Trimestre</label>
                      <select 
                        name="bimestre"
                        value={data.bimestre}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {BIMESTRES.map(b => <option key={b} value={b}>{b} Bimestre</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isFieldVisible('unit') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unidad de Aprendizaje</label>
                      <input 
                        type="text" 
                        name="unit"
                        value={data.unit}
                        onChange={handleInputChange}
                        placeholder="Ej. Unidad 1"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}
                  {isFieldVisible('sessionNumber') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nº de Sesión</label>
                      <input 
                        type="text" 
                        name="sessionNumber"
                        value={data.sessionNumber}
                        onChange={handleInputChange}
                        placeholder="Ej. Sesión 05"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}
                  {isFieldVisible('date') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date" 
                        name="date"
                        value={data.date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isFieldVisible('area') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Área Curricular</label>
                      <select 
                        name="area"
                        value={data.area}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {AREAS_POR_NIVEL[data.level].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  )}
                  {isFieldVisible('duration') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duración total de la Sesión (minutos)</label>
                      <select 
                        name="duration"
                        value={data.duration}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {DURACIONES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {isFieldVisible('instrument') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Instrumento de Evaluación</label>
                    <select 
                      name="instrument"
                      value={data.instrument}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {INSTRUMENTOS_EVALUACION.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                )}

                {isFieldVisible('topic') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={14} /> Tema Específico de la Sesión
                    </label>
                    <input 
                      type="text" 
                      name="topic"
                      value={data.topic}
                      onChange={handleInputChange}
                      placeholder="Ej. Las Fracciones en la vida diaria"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}

                {isFieldVisible('sessionTitle') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-500" /> Título de la sesión
                      </label>
                      <button 
                        onClick={suggestTitle}
                        disabled={isSuggestingTitle}
                        className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {isSuggestingTitle ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Sugerir con IA
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      <span className="text-yellow-600 font-bold">(Opcional)</span> Para el encabezado del Word; si lo dejas vacío se usa el tema.
                    </p>
                    <textarea 
                      name="sessionTitle"
                      value={data.sessionTitle}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Título de la sesión..."
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm font-medium"
                    />
                  </div>
                )}

                {isFieldVisible('studentContext') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Contexto de los estudiantes (DUA)
                      </label>
                      <button 
                        onClick={suggestContext}
                        disabled={isSuggestingContext}
                        className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1 disabled:opacity-50"
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
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            </section>

            {isFieldVisible('competencies') && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-lg font-bold">Competencias a Desarrollar</h2>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl mb-2">
                    <input 
                      type="text" 
                      className="hidden" // Just to keep the structure if needed, but we use state
                    />
                    <input 
                      type="checkbox" 
                      id="aiSuggestCompetency"
                      checked={data.aiSuggestCompetency}
                      onChange={(e) => setData(prev => ({ ...prev, aiSuggestCompetency: e.target.checked, competencies: e.target.checked ? [] : prev.competencies }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="aiSuggestCompetency" className="text-sm font-bold text-emerald-700 cursor-pointer">
                      Dejar que la IA sugiera la competencia
                    </label>
                  </div>
                  
                  {!data.aiSuggestCompetency && (
                    <>
                      <p className="text-xs font-medium text-gray-400 italic">Selecciona hasta 3 competencias para esta sesión:</p>
                      <div className="grid grid-cols-1 gap-3">
                        {COMPETENCIAS_POR_AREA[data.area]?.map(comp => (
                          <button
                            key={comp}
                            onClick={() => toggleCompetency(comp)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.competencies.includes(comp) 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                : "bg-white border-gray-100 text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {comp}
                            {data.competencies.includes(comp) && <CheckCircle2 size={16} className="text-emerald-500" />}
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
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">4</div>
                  <h2 className="text-lg font-bold">Elementos Transversales (Opcional)</h2>
                </div>
                <div className="space-y-6">
                  {isFieldVisible('transversalCompetencies') && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Competencias Transversales</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMPETENCIAS_TRANSVERSALES.map(comp => (
                          <button
                            key={comp}
                            onClick={() => toggleTransversalCompetency(comp)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.transversalCompetencies.includes(comp) 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                : "bg-white border-gray-100 text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {comp}
                            {data.transversalCompetencies.includes(comp) && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                      {data.transversalCompetencies.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic">Si no seleccionas ninguna, la IA sugerirá las más pertinentes.</p>
                      )}
                    </div>
                  )}

                  {isFieldVisible('transversalApproaches') && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enfoques Transversales</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ENFOQUES_TRANSVERSALES.map(approach => (
                          <button
                            key={approach}
                            onClick={() => toggleTransversalApproach(approach)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left text-sm font-medium",
                              data.transversalApproaches.includes(approach) 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                : "bg-white border-gray-100 text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {approach}
                            {data.transversalApproaches.includes(approach) && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                      {data.transversalApproaches.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic">Si no seleccionas ninguno, la IA sugerirá los más pertinentes.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {isFieldVisible('specialNeeds') && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">5</div>
                    <h2 className="text-lg font-bold">Inclusión (NEE)</h2>
                  </div>
                  <button 
                    onClick={addSpecialNeed}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
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
                        className="bg-white border border-gray-200 rounded-2xl p-6 relative group"
                      >
                        <button 
                          onClick={() => removeSpecialNeed(student.id)}
                          className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre del alumno</label>
                            <input 
                              type="text" 
                              value={student.name}
                              onChange={(e) => updateSpecialNeed(student.id, 'name', e.target.value)}
                              placeholder="Nombre..."
                              className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condición</label>
                            <select 
                              value={student.condition}
                              onChange={(e) => updateSpecialNeed(student.id, 'condition', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                            >
                              <option value="">Seleccionar condición...</option>
                              {CONDICIONES_NEE.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actividad Sugerida</label>
                            <select 
                              value={student.activity}
                              onChange={(e) => updateSpecialNeed(student.id, 'activity', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                            >
                              <option value="">Seleccionar actividad...</option>
                              {ACTIVIDADES_NEE.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {data.specialNeeds.length === 0 && (
                    <div className="border-2 border-dashed border-gray-100 rounded-2xl py-10 flex flex-col items-center justify-center text-gray-300">
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
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">6</div>
                    <h2 className="text-lg font-bold">Lista de Alumnos (Opcional)</h2>
                  </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={saveCurrentList}
                    className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Guardar lista
                  </button>
                  {currentListName && (
                    <button 
                      onClick={() => deleteList(currentListName)}
                      className="text-[10px] font-bold bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seleccionar lista guardada</label>
                  <select 
                    value={currentListName}
                    onChange={(e) => loadList(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="">-- Seleccionar lista guardada --</option>
                    {Object.keys(savedLists).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre de la lista (para guardar)</label>
                  <input 
                    type="text"
                    value={currentListName}
                    onChange={(e) => setCurrentListName(e.target.value)}
                    placeholder="Ej. 2do A - Matemática"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombres de alumnos (uno por línea)</label>
                  <textarea 
                    value={data.studentList}
                    onChange={(e) => setData(prev => ({ ...prev, studentList: e.target.value }))}
                    rows={6}
                    placeholder="Juan Pérez García&#10;María López Rodríguez&#10;..."
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-400">Los nombres aparecerán en el instrumento de evaluación del documento Word.</p>
                </div>
              </div>
            </section>
          )}

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">7</div>
                <h2 className="text-lg font-bold">Opciones de Contenido Adicional</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                  data.generateTheory ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 hover:border-gray-300"
                )}>
                  <input 
                    type="checkbox"
                    checked={data.generateTheory}
                    onChange={(e) => setData(prev => ({ ...prev, generateTheory: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block font-bold text-gray-800">Generar Teoría del Tema</span>
                    <span className="text-xs text-gray-500">Crea un resumen teórico detallado para la sesión.</span>
                  </div>
                </label>
                <label className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                  data.generateApplication ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 hover:border-gray-300"
                )}>
                  <input 
                    type="checkbox"
                    checked={data.generateApplication}
                    onChange={(e) => setData(prev => ({ ...prev, generateApplication: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block font-bold text-gray-800">Generar Ficha de Aplicación</span>
                    <span className="text-xs text-gray-500">Crea preguntas y actividades de evaluación.</span>
                  </div>
                </label>
              </div>
            </section>

            <div className="pt-6">
              <button 
                onClick={generateSession}
                disabled={isGenerating}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
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
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50">
                <div className="bg-gray-900 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vista Previa del Documento</span>
                </div>
                
                <div className="p-8 min-h-[600px] flex flex-col">
                  {!generatedContent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <FileText size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-400">Sin contenido generado</p>
                        <p className="text-xs text-gray-300 max-w-[200px] mx-auto mt-1">Completa el formulario y presiona generar para ver el resultado aquí.</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black leading-tight">{generatedContent.sessionTitle}</h3>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{data.area} • {data.grade}</p>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Propósito Resumido</h4>
                            <p className="text-sm text-gray-600 leading-relaxed italic">"{generatedContent.purpose.summary}"</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-200/50">
                            <div>
                              <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Situación Significativa</h5>
                              <p className="text-[11px] text-gray-500 leading-tight">{generatedContent.purpose.significantSituationRelation}</p>
                            </div>
                            <div>
                              <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Desarrollo Integral</h5>
                              <p className="text-[11px] text-gray-500 leading-tight">{generatedContent.purpose.integralDevelopmentRelation}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Elementos Transversales</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl">
                              <p className="text-[9px] font-bold text-emerald-700 uppercase mb-1">Competencias</p>
                              <p className="text-[10px] text-gray-600 line-clamp-2">
                                {generatedContent.transversalCompetencies?.map((c: any) => c.competency).join(', ') || "Sugeridas por IA"}
                              </p>
                            </div>
                            <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl">
                              <p className="text-[9px] font-bold text-emerald-700 uppercase mb-1">Enfoques</p>
                              <p className="text-[10px] text-gray-600 line-clamp-2">
                                {generatedContent.transversalApproaches?.map((a: any) => a.approach).join(', ') || "Sugeridos por IA"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {generatedContent.customData && Object.keys(generatedContent.customData).length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Datos del Formato Detectado</h4>
                            <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl space-y-2">
                              {Object.entries(generatedContent.customData).map(([key, val]) => (
                                <div key={key} className="flex justify-between gap-4">
                                  <span className="text-[10px] font-bold text-blue-700 uppercase">{key}:</span>
                                  <span className="text-[10px] text-gray-600 text-right">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secuencia Didáctica</h4>
                          <div className="space-y-3">
                            {['inicio', 'desarrollo', 'cierre'].map((moment) => (
                              <div key={moment} className="p-4 bg-white border border-gray-100 rounded-xl space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold uppercase">
                                    {moment[0]}
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 uppercase">{moment}</span>
                                </div>
                                {generatedContent.didacticSequence[moment]?.map((item: any, idx: number) => (
                                  <div key={idx} className="space-y-1">
                                    <p className="text-[10px] font-bold text-emerald-600">{item.process}</p>
                                    <p className="text-[11px] text-gray-500 line-clamp-3">{item.activities}</p>
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
                          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-300"
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
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Sparkles className="text-emerald-500 mb-2" size={18} />
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">IA Optimizada</p>
                  <p className="text-[10px] text-emerald-600 mt-1">Generación basada en el CNEB 2026.</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Target className="text-blue-500 mb-2" size={18} />
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Enfoque DUA</p>
                  <p className="text-[10px] text-blue-600 mt-1">Adaptaciones curriculares automáticas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-30 grayscale">
            <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
              <GraduationCap className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">EduGen</span>
          </div>
          <p className="text-xs text-gray-400 font-medium">© 2026 Juan Caicedo • Potenciado por Google Gemini</p>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Servidor Activo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
