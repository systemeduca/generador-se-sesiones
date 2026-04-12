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
  GraduationCap,
  Eye,
  Sun,
  Moon
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
  VerticalAlign,
  TableBorders,
  ImageRun
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
import { SessionData, SpecialNeedStudent, SessionMoment } from './types';
import { FreeMode } from './components/modes/FreeMode';
import { UnitMode } from './components/modes/UnitMode';
import { BooksMode } from './components/modes/BooksMode';
import { TemplateMode } from './components/modes/TemplateMode';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [view, setView] = useState<'landing' | 'form'>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mode, setMode] = useState<'UNIT' | 'BOOKS' | 'FREE' | 'TEMPLATE' | null>(null);
  const [unitTab, setUnitTab] = useState<'upload' | 'current'>('upload');
  const [templateTab, setTemplateTab] = useState<'SUBIR' | 'MI_SESION'>('SUBIR');
  const [data, setData] = useState<SessionData>({
    teacherName: '',
    teacherGender: 'male',
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
    generateActivities: true,
    generateApplication: true,
    schoolLogo: '',
    unitPurpose: '',
    inclusion2026: 'Ninguno',
    resources2026: 'Ninguno',
    resources2026Custom: '',
    diversity2026: 'Ninguno',
    diversity2026Custom: '',
    learningPurposeMode: 'auto',
    manualLearningPurpose: '',
    dynamicFieldsValues: {},
    moments: {
      inicio: { activity: '', resources: '', time: '15' },
      desarrollo: { activity: '', resources: '', time: '60' },
      cierre: { activity: '', resources: '', time: '15' }
    },
    learningTable: [],
    transversalCompetencyData: [],
    transversalApproachData: [],
    learningGuide: null,
    applicationSheet: null,
    resources: [],
    specialNeedsData: []
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setData(prev => ({ ...prev, schoolLogo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'UNIT' | 'SCHEMA' | 'TEMPLATE' = 'TEMPLATE') => {
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
        mimeType = 'text/plain';
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      } else {
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      const fileObj = {
        data: base64Data || textContent,
        mimeType: mimeType,
        name: file.name
      };

      setData(prev => {
        const newData = { ...prev };
        if (fileType === 'UNIT') newData.unitFile = fileObj;
        else if (fileType === 'SCHEMA') newData.sessionSchemaFile = fileObj;
        else newData.templateFile = fileObj;
        return newData;
      });
      
      if (fileType === 'UNIT') {
        await analyzeTemplate(base64Data || textContent, mimeType, 'UNIT');
      } else if (fileType === 'SCHEMA' || fileType === 'TEMPLATE') {
        await analyzeTemplate(base64Data || textContent, mimeType, 'SCHEMA');
      }
    } catch (err) {
      console.error(err);
      setError("Error al procesar el archivo.");
      setIsAnalyzingTemplate(false);
    }
  };

  const analyzeTemplate = async (dataOrText: string, mimeType: string, analysisType: 'UNIT' | 'SCHEMA') => {
    setIsAnalyzingTemplate(true);
    setError(null);

    try {
      let prompt = '';
      
      if (analysisType === 'UNIT') {
        prompt = `Analiza esta UNIDAD DE APRENDIZAJE y extrae la información específica para la SESIÓN Nº ${data.sessionNumber || '1'}.
        
        Debes buscar en la secuencia de sesiones de la unidad y extraer:
        1. "sessionTitle": El título de la sesión ${data.sessionNumber || '1'}.
        2. "topic": El tema o campo temático de esa sesión.
        3. "area": El área curricular de la unidad.
        4. "level": El nivel educativo.
        5. "grade": El grado.
        6. "unit": El título de la unidad completa.
        7. "competencies": Las competencias y capacidades asociadas a esta sesión específica.
        8. "studentContext": Si menciona contexto o situación significativa, extráelo.
        9. "learningTable": Genera una matriz con la competencia, capacidades, desempeño precisado y evidencia que se menciona para esta sesión ${data.sessionNumber || '1'}.
        10. "moments": Si la unidad describe brevemente actividades para esta sesión, extráelas para Inicio, Desarrollo y Cierre.
        
        IMPORTANTE: Mapea todo a los campos estándar. No inventes campos nuevos si puedes ponerlos en los existentes.
        
        Devuelve un objeto JSON con esta estructura:
        {
          "sessionTitle": "...",
          "topic": "...",
          "area": "...",
          "level": "...",
          "grade": "...",
          "unit": "...",
          "sessionNumber": "${data.sessionNumber || '1'}",
          "studentContext": "...",
          "learningTable": [
            {
              "competency": "...",
              "capacities": ["...", "..."],
              "desempeño_precisado": "...",
              "evidence": "...",
              "instruments": ["..."]
            }
          ],
          "moments": {
            "inicio": { "activity": "...", "resources": "...", "time": "15" },
            "desarrollo": { "activity": "...", "resources": "...", "time": "60" },
            "cierre": { "activity": "...", "resources": "...", "time": "15" }
          }
        }`;
      } else {
        prompt = `Analiza este archivo (esquema o formato de sesión de aprendizaje). 
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
      }

      let parts: any[] = [{ text: prompt }];
      if (mimeType === 'text/plain') {
        parts.push({ text: `Contenido del archivo:\n${dataOrText}` });
      } else {
        parts.push({ inlineData: { data: dataOrText, mimeType } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (analysisType === 'UNIT') {
        setData(prev => ({
          ...prev,
          sessionTitle: result.sessionTitle || prev.sessionTitle,
          topic: result.topic || prev.topic,
          area: result.area || prev.area,
          level: result.level || prev.level,
          grade: result.grade || prev.grade,
          unit: result.unit || prev.unit,
          sessionNumber: result.sessionNumber || prev.sessionNumber,
          studentContext: result.studentContext || prev.studentContext,
          learningTable: result.learningTable || prev.learningTable,
          moments: result.moments || prev.moments,
          detectedSchema: null 
        }));
      } else {
        const schema = result;
        const standardCategories = [
          'teacherName', 'institution', 'level', 'grade', 'bimestre', 'area', 
          'topic', 'sessionTitle', 'unit', 'sessionNumber', 'date', 'duration', 
          'instrument', 'studentContext', 'competencies', 'transversalCompetencies', 
          'transversalApproaches'
        ];

        const dynamicFields = (schema.missingFields || [])
          .filter((field: string) => {
            if (standardCategories.includes(field)) return false;
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
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo analizar el documento automáticamente.");
    } finally {
      setIsAnalyzingTemplate(false);
    }
  };

  const renderMySessionTab = () => {
    return (
      <div className="space-y-12">
        {/* I. DATOS INFORMATIVOS */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">I</div>
            <h2 className="text-2xl font-bold tracking-tight">Datos Informativos</h2>
          </div>
          
          <div className="glass-panel rounded-[32px] p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-1/3 space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Upload size={14} /> Insignia del Colegio
                </label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label 
                    htmlFor="logo-upload"
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden",
                      data.schoolLogo ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04]"
                    )}
                  >
                    {data.schoolLogo ? (
                      <img src={data.schoolLogo} alt="Logo" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Plus className="text-slate-400 w-6 h-6" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Subir Logo</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Institución Educativa</label>
                  <input 
                    type="text" 
                    name="institution"
                    value={data.institution}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Docente</label>
                  <input 
                    type="text" 
                    name="teacherName"
                    value={data.teacherName}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grado y Sección</label>
                  <input 
                    type="text" 
                    name="grade"
                    value={data.grade}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Área Curricular</label>
                  <input 
                    type="text" 
                    name="area"
                    value={data.area}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Director(a)</label>
                  <input 
                    type="text" 
                    name="directorName"
                    value={data.directorName}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidad</label>
                  <input 
                    type="text" 
                    name="unit"
                    value={data.unit}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej: Unidad 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nº Sesión</label>
                  <input 
                    type="text" 
                    name="sessionNumber"
                    value={data.sessionNumber}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej: 05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
                  <input 
                    type="date" 
                    name="date"
                    value={data.date}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duración (min)</label>
                  <input 
                    type="text" 
                    name="duration"
                    value={data.duration}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAMPOS PERSONALIZADOS (Si se detectaron en el esquema) */}
        {Object.keys(data.dynamicFieldsValues).length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                <Sparkles size={16} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Campos del Esquema Detectados</h2>
            </div>
            <div className="glass-panel rounded-[32px] p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(data.dynamicFieldsValues).map((field) => (
                <div key={field} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{field}</label>
                  <textarea 
                    value={data.dynamicFieldsValues[field]}
                    onChange={(e) => handleDynamicFieldChange(field, e.target.value)}
                    rows={2}
                    className="minimal-input w-full resize-none"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* II. TÍTULO Y PROPÓSITO */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">II</div>
            <h2 className="text-2xl font-bold tracking-tight">Título y Propósito</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Sesión</label>
              <textarea 
                name="sessionTitle"
                value={data.sessionTitle}
                onChange={handleInputChange}
                rows={2}
                className="minimal-input w-full resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Propósito de Aprendizaje</label>
              <textarea 
                name="unitPurpose"
                value={data.unitPurpose}
                onChange={handleInputChange}
                rows={3}
                className="minimal-input w-full resize-none"
              />
            </div>
          </div>
        </section>

        {/* IV. COMPETENCIAS TRANSVERSALES */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">IV</div>
            <h2 className="text-2xl font-bold tracking-tight">Competencias Transversales</h2>
          </div>
          <div className="overflow-x-auto rounded-[32px] border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Competencia/Capacidad</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Desempeño Precisado</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">¿Cómo se evidencia?</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Instrumento</th>
                </tr>
              </thead>
              <tbody>
                {data.transversalCompetencyData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border border-white/10">
                      <div className="space-y-2">
                        <textarea 
                          value={row.competency}
                          onChange={(e) => {
                            const newData = [...data.transversalCompetencyData];
                            newData[idx].competency = e.target.value;
                            setData(prev => ({ ...prev, transversalCompetencyData: newData }));
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-indigo-400 resize-none"
                          rows={2}
                        />
                        <textarea 
                          value={Array.isArray(row.capacities) ? row.capacities.join('\n') : row.capacities}
                          onChange={(e) => {
                            const newData = [...data.transversalCompetencyData];
                            newData[idx].capacities = e.target.value.split('\n');
                            setData(prev => ({ ...prev, transversalCompetencyData: newData }));
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none text-slate-400"
                          rows={2}
                        />
                      </div>
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.desempeño_precisado}
                        onChange={(e) => {
                          const newData = [...data.transversalCompetencyData];
                          newData[idx].desempeño_precisado = e.target.value;
                          setData(prev => ({ ...prev, transversalCompetencyData: newData }));
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={3}
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.evidence}
                        onChange={(e) => {
                          const newData = [...data.transversalCompetencyData];
                          newData[idx].evidence = e.target.value;
                          setData(prev => ({ ...prev, transversalCompetencyData: newData }));
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={3}
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={Array.isArray(row.instruments) ? row.instruments.join('\n') : row.instruments}
                        onChange={(e) => {
                          const newData = [...data.transversalCompetencyData];
                          newData[idx].instruments = e.target.value.split('\n');
                          setData(prev => ({ ...prev, transversalCompetencyData: newData }));
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* V. ENFOQUES TRANSVERSALES */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">V</div>
            <h2 className="text-2xl font-bold tracking-tight">Enfoques Transversales</h2>
          </div>
          <div className="overflow-x-auto rounded-[32px] border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Enfoque Transversal</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Acciones Observables</th>
                </tr>
              </thead>
              <tbody>
                {data.transversalApproachData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.approach}
                        onChange={(e) => {
                          const newData = [...data.transversalApproachData];
                          newData[idx].approach = e.target.value;
                          setData(prev => ({ ...prev, transversalApproachData: newData }));
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-amber-400 resize-none"
                        rows={2}
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.actions}
                        onChange={(e) => {
                          const newData = [...data.transversalApproachData];
                          newData[idx].actions = e.target.value;
                          setData(prev => ({ ...prev, transversalApproachData: newData }));
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={3}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* III. TABLA DE APRENDIZAJE */}
        <section className="space-y-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">III</div>
              <h2 className="text-2xl font-bold tracking-tight">Matriz de Competencias</h2>
            </div>
            <button 
              onClick={addLearningTableRow}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Agregar Fila
            </button>
          </div>
          <div className="overflow-x-auto rounded-[32px] border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Competencia/Capacidad</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Desempeño Precisado</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Evidencia (Producto)</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">Instrumento</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.learningTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border border-white/10">
                      <div className="space-y-2">
                        <textarea 
                          value={row.competency}
                          onChange={(e) => updateLearningTableRow(idx, 'competency', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-emerald-400 resize-none"
                          placeholder="Competencia..."
                          rows={2}
                        />
                        <textarea 
                          value={Array.isArray(row.capacities) ? row.capacities.join('\n') : row.capacities}
                          onChange={(e) => updateLearningTableRow(idx, 'capacities', e.target.value.split('\n'))}
                          className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none text-slate-400"
                          placeholder="Capacidades..."
                          rows={3}
                        />
                      </div>
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.desempeño_precisado}
                        onChange={(e) => updateLearningTableRow(idx, 'desempeño_precisado', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={4}
                        placeholder="Desempeño precisado..."
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={row.evidence}
                        onChange={(e) => updateLearningTableRow(idx, 'evidence', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={4}
                        placeholder="Evidencia..."
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <textarea 
                        value={Array.isArray(row.instruments) ? row.instruments.join('\n') : row.instruments}
                        onChange={(e) => updateLearningTableRow(idx, 'instruments', e.target.value.split('\n'))}
                        className="w-full bg-transparent border-none focus:ring-0 text-[10px] resize-none"
                        rows={3}
                        placeholder="Instrumentos..."
                      />
                    </td>
                    <td className="p-4 border border-white/10">
                      <button 
                        onClick={() => removeLearningTableRow(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.learningTable.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 italic text-sm">
                      No hay competencias generadas aún. Genera una sesión para ver los campos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* IV. MOMENTOS */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">IV</div>
            <h2 className="text-2xl font-bold tracking-tight">Momentos de la Sesión</h2>
          </div>
          
          <div className="space-y-6">
            {['inicio', 'desarrollo', 'cierre'].map((moment) => (
              <div key={moment} className="glass-panel rounded-[32px] p-8 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold capitalize text-emerald-400">{moment}</h3>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <input 
                      type="text"
                      value={data.moments[moment as keyof typeof data.moments].time}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        moments: {
                          ...prev.moments,
                          [moment]: { ...prev.moments[moment as keyof typeof prev.moments], time: e.target.value }
                        }
                      }))}
                      className="w-12 bg-white/5 border border-white/10 rounded-lg text-center text-xs py-1"
                    />
                    <span className="text-[10px] text-slate-500 uppercase font-bold">min</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividades</label>
                    <textarea 
                      value={data.moments[moment as keyof typeof data.moments].activity}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        moments: {
                          ...prev.moments,
                          [moment]: { ...prev.moments[moment as keyof typeof prev.moments], activity: e.target.value }
                        }
                      }))}
                      rows={6}
                      className="minimal-input w-full resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recursos</label>
                    <textarea 
                      value={data.moments[moment as keyof typeof data.moments].resources}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        moments: {
                          ...prev.moments,
                          [moment]: { ...prev.moments[moment as keyof typeof prev.moments], resources: e.target.value }
                        }
                      }))}
                      rows={6}
                      className="minimal-input w-full resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* V. GUÍA DE APRENDIZAJE */}
        {data.learningGuide && (
          <section className="space-y-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">V</div>
              <h2 className="text-2xl font-bold tracking-tight">Guía de Aprendizaje</h2>
            </div>
            <div className="glass-panel rounded-[32px] p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Guía</label>
                <input 
                  type="text"
                  value={data.learningGuide.title}
                  onChange={(e) => updateLearningGuide('title', e.target.value)}
                  className="minimal-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Introducción</label>
                <textarea 
                  value={data.learningGuide.introduction}
                  onChange={(e) => updateLearningGuide('introduction', e.target.value)}
                  rows={3}
                  className="minimal-input w-full resize-none"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pasos de la Guía</label>
                {data.learningGuide.steps.map((step: any, idx: number) => (
                  <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">Paso {step.stepNumber}</span>
                      <input 
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...data.learningGuide.steps];
                          newSteps[idx] = { ...newSteps[idx], title: e.target.value };
                          updateLearningGuide('steps', newSteps);
                        }}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-right"
                      />
                    </div>
                    <textarea 
                      value={step.instructions}
                      onChange={(e) => {
                        const newSteps = [...data.learningGuide.steps];
                        newSteps[idx] = { ...newSteps[idx], instructions: e.target.value };
                        updateLearningGuide('steps', newSteps);
                      }}
                      rows={2}
                      className="minimal-input w-full text-xs"
                      placeholder="Instrucciones..."
                    />
                    <textarea 
                      value={step.detailedActivity}
                      onChange={(e) => {
                        const newSteps = [...data.learningGuide.steps];
                        newSteps[idx] = { ...newSteps[idx], detailedActivity: e.target.value };
                        updateLearningGuide('steps', newSteps);
                      }}
                      rows={3}
                      className="minimal-input w-full text-xs"
                      placeholder="Actividad detallada..."
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Producto Final</label>
                <input 
                  type="text"
                  value={data.learningGuide.finalProduct}
                  onChange={(e) => updateLearningGuide('finalProduct', e.target.value)}
                  className="minimal-input w-full"
                />
              </div>
            </div>
          </section>
        )}

        {/* VI. FICHA DE APLICACIÓN */}
        {data.applicationSheet && (
          <section className="space-y-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">VI</div>
              <h2 className="text-2xl font-bold tracking-tight">Ficha de Aplicación</h2>
            </div>
            <div className="glass-panel rounded-[32px] p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Ficha</label>
                <input 
                  type="text"
                  value={data.applicationSheet.title}
                  onChange={(e) => updateApplicationSheet('title', e.target.value)}
                  className="minimal-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Situación Contextualizada</label>
                <textarea 
                  value={data.applicationSheet.contextualizedSituation}
                  onChange={(e) => updateApplicationSheet('contextualizedSituation', e.target.value)}
                  rows={4}
                  className="minimal-input w-full resize-none"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividades de Aplicación</label>
                {data.applicationSheet.activities.map((activity: any, idx: number) => (
                  <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <input 
                      type="text"
                      value={activity.title}
                      onChange={(e) => {
                        const newActivities = [...data.applicationSheet.activities];
                        newActivities[idx] = { ...newActivities[idx], title: e.target.value };
                        updateApplicationSheet('activities', newActivities);
                      }}
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold text-emerald-400 w-full"
                    />
                    <textarea 
                      value={activity.instructions}
                      onChange={(e) => {
                        const newActivities = [...data.applicationSheet.activities];
                        newActivities[idx] = { ...newActivities[idx], instructions: e.target.value };
                        updateApplicationSheet('activities', newActivities);
                      }}
                      rows={2}
                      className="minimal-input w-full text-xs"
                      placeholder="Instrucciones..."
                    />
                    <textarea 
                      value={activity.content}
                      onChange={(e) => {
                        const newActivities = [...data.applicationSheet.activities];
                        newActivities[idx] = { ...newActivities[idx], content: e.target.value };
                        updateApplicationSheet('activities', newActivities);
                      }}
                      rows={3}
                      className="minimal-input w-full text-xs"
                      placeholder="Contenido del reto..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* VII. RECURSOS */}
        <section className="space-y-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">VII</div>
              <h2 className="text-2xl font-bold tracking-tight">Recursos y Materiales</h2>
            </div>
            <button 
              onClick={addResourceRow}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Agregar Recurso
            </button>
          </div>
          <div className="glass-panel rounded-[32px] p-8">
            <div className="space-y-4">
              {data.resources.map((resource, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="w-full md:w-1/4 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoría</label>
                    <input 
                      type="text"
                      value={resource.category}
                      onChange={(e) => updateResourceRow(idx, 'category', e.target.value)}
                      className="minimal-input w-full text-xs"
                    />
                  </div>
                  <div className="w-full md:w-1/4 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Material</label>
                    <input 
                      type="text"
                      value={resource.material}
                      onChange={(e) => updateResourceRow(idx, 'material', e.target.value)}
                      className="minimal-input w-full text-xs"
                    />
                  </div>
                  <div className="w-full md:w-2/5 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uso</label>
                    <input 
                      type="text"
                      value={resource.use}
                      onChange={(e) => updateResourceRow(idx, 'use', e.target.value)}
                      className="minimal-input w-full text-xs"
                    />
                  </div>
                  <button 
                    onClick={() => removeResourceRow(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors mb-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {data.resources.length === 0 && (
                <p className="text-center text-slate-500 italic text-sm py-8">No hay recursos listados.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const isFieldVisible = (fieldName: string) => {
    if (mode === 'TEMPLATE' && templateTab === 'SUBIR') {
      const allowedFields = [
        'teacherName', 'institution', 'level', 'grade', 'area', 
        'topic', 'unitPurpose', 'directorName', 'unit', 'sessionNumber', 
        'date', 'duration', 'sessionTitle', 'studentContext', 'competencies',
        'transversalCompetencies', 'transversalApproaches', 'instrument'
      ];
      return allowedFields.includes(fieldName);
    }
    if (!data.detectedSchema) return true;
    return !data.detectedSchema.hiddenStandardFields?.includes(fieldName);
  };

  const updateLearningTableRow = (index: number, field: string, value: any) => {
    setData(prev => {
      const newTable = [...prev.learningTable];
      newTable[index] = { ...newTable[index], [field]: value };
      return { ...prev, learningTable: newTable };
    });
  };

  const addLearningTableRow = () => {
    setData(prev => ({
      ...prev,
      learningTable: [...prev.learningTable, { competency: '', capacities: [], criteria: [], instruments: [], evidence: '' }]
    }));
  };

  const removeLearningTableRow = (index: number) => {
    setData(prev => ({
      ...prev,
      learningTable: prev.learningTable.filter((_, i) => i !== index)
    }));
  };

  const updateLearningGuide = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      learningGuide: { ...prev.learningGuide, [field]: value }
    }));
  };

  const updateApplicationSheet = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      applicationSheet: { ...prev.applicationSheet, [field]: value }
    }));
  };

  const updateResourceRow = (index: number, field: string, value: any) => {
    setData(prev => {
      const newResources = [...prev.resources];
      newResources[index] = { ...newResources[index], [field]: value };
      return { ...prev, resources: newResources };
    });
  };

  const addResourceRow = () => {
    setData(prev => ({
      ...prev,
      resources: [...prev.resources, { category: '', material: '', use: '' }]
    }));
  };

  const removeResourceRow = (index: number) => {
    setData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const handleDynamicFieldChange = (fieldName: string, value: string) => {
    setData(prev => ({
      ...prev,
      dynamicFieldsValues: {
        ...prev.dynamicFieldsValues,
        [fieldName]: value
      }
    }));
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
      const prompt = `Como experto pedagogo peruano, describe el contexto de los estudiantes para una sesión de aprendizaje.
      Considera:
      - Institución Educativa: ${data.institution || 'No especificada'}
      - Nivel Educativo: ${data.level}
      - Grado: ${data.grade}
      - Realidad: Basándote en el nombre de la institución (si existe) y el nivel educativo, describe el entorno socio-económico probable, necesidades de aprendizaje comunes en el Perú para ese nivel, e intereses típicos de estudiantes.
      - Enfoque DUA: Menciona brevemente la variabilidad del aprendizaje en este grupo.
      Responde con un párrafo de máximo 80 palabras que sea realista, pedagógico y útil para un docente.`;

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

  const clearFiles = () => {
    setData(prev => ({
      ...prev,
      unitFile: undefined,
      sessionSchemaFile: undefined,
      detectedSchema: undefined,
      sessionTitle: '',
      topic: '',
      unit: '',
      learningTable: [],
      specialNeedsData: [],
      moments: {
        inicio: { activity: '', resources: '', time: '15' },
        desarrollo: { activity: '', resources: '', time: '60' },
        cierre: { activity: '', resources: '', time: '15' }
      }
    }));
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
    if (mode !== 'TEMPLATE' || templateTab !== 'SUBIR') {
      if (!data.aiSuggestCompetency && data.competencies.length === 0) {
        setError("Por favor selecciona al menos una competencia o activa la sugerencia por IA.");
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const availableCompetencies = COMPETENCIAS_POR_AREA[data.area] || [];
      const competencyInstruction = (data.aiSuggestCompetency || (mode === 'TEMPLATE' && templateTab === 'SUBIR'))
        ? `Analiza el tema "${data.topic}" y el área "${data.area}" para seleccionar la competencia más pertinente de esta lista oficial: [${availableCompetencies.join(', ')}]. Justifica pedagógicamente la elección en el contenido.`
        : `Usa estas competencias seleccionadas: ${data.competencies.join(', ')}`;

      const dynamicFieldsInstruction = Object.entries(data.dynamicFieldsValues)
        .filter(([_, v]) => String(v).trim() !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

      let templateInstruction = "";
      let contents: any = [];

      const schemaToUse = mode === 'UNIT' ? data.sessionSchemaFile : data.templateFile;

      if (schemaToUse) {
        templateInstruction = `
          SISTEMA ULTRA-INTELIGENTE DE ADAPTACIÓN (MODO SUBIR):
          1. El usuario ha subido un modelo/esquema de sesión. 
          2. TU MISIÓN: Detectar internamente TODA la estructura del archivo (tablas, encabezados, secciones, pies de página).
          3. NO muestres campos técnicos al usuario. Él solo ha proporcionado datos básicos (Docente, Institución, Nivel, Grado, Área, Tema y Propósito).
          4. USA TU INTELIGENCIA para completar TODO el contenido pedagógico (competencias, capacidades, desempeños, criterios, evidencia, secuencia didáctica, etc.) basándote en el modelo subido.
          5. El resultado debe ser DINÁMICO: si el modelo pide "Eje articulador", invéntalo coherentemente. Si pide "Instrumento", selecciónalo tú.
          6. El JSON de respuesta debe ser lo más completo posible para que el generador de Word pueda reconstruir el modelo del usuario con el nuevo contenido.
          7. Si detectas campos personalizados en el modelo, inclúyelos en una propiedad "customData" en el JSON.
        `;
        
        if (schemaToUse.mimeType === 'text/plain') {
          contents = [
            { text: `Contenido del esquema (Word):\n${schemaToUse.data}` },
            { text: `Genera la sesión siguiendo este esquema.` }
          ];
        } else {
          contents = [
            { inlineData: { data: schemaToUse.data, mimeType: schemaToUse.mimeType } },
            { text: `Genera la sesión siguiendo este formato visual.` }
          ];
        }
      }

      const prompt = `
        Genera una sesión de aprendizaje completa para el nivel ${data.level} en Perú, siguiendo la estructura del CNEB.
        ${templateInstruction}
        
        IDENTIDAD DEL DOCENTE:
        - Género del docente: ${data.teacherGender === 'male' ? 'Masculino (El profesor / El docente)' : 'Femenino (La profesora / La docente)'}
        - IMPORTANTE: Mantén la concordancia de género en toda la sesión de forma natural y fluida.
        - EVITA LA REDUNDANCIA: No repitas "el docente" o "la profesora" en cada párrafo. Usa sujetos tácitos, pronombres o variaciones naturales para que el texto sea profesional y directo, tal como se generaba anteriormente.
        - NO incluyas el nombre propio ("${data.teacherName}") dentro del desarrollo de las actividades.
        
        ESTUDIANTES CON NEE (CRÍTICO):
        - Lista de estudiantes: ${data.specialNeeds.map(s => `${s.name} (${s.condition})`).join(', ') || 'Ninguno'}
        - Si hay estudiantes con NEE, debes generar una estrategia específica para cada uno dentro de la sesión, detallando cómo el docente ajustará consignas, tiempos y materiales.
        
        Datos:
        - Área: ${data.area}
        - Grado: ${data.grade}
        - Tema: ${data.topic}
        - Competencias: ${competencyInstruction}
        - Competencias Transversales: ${data.transversalCompetencies.length > 0 ? data.transversalCompetencies.join(', ') : 'Sugiérelas tú (TIC o Autonomía)'}
        - Enfoques Transversales: ${data.transversalApproaches.length > 0 ? data.transversalApproaches.join(', ') : 'Sugiérelos tú según el tema'}
        - Contexto: ${data.studentContext}
        - Propósito de Aprendizaje (Alineación): ${data.learningPurposeMode === 'manual' ? data.manualLearningPurpose : 'Sugiérelo tú basándote en las competencias seleccionadas para esta sesión.'}
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
              "desempeño_precisado": "Desempeño precisado para esta sesión",
              "criteria": ["Criterio 1", "Criterio 2"],
              "instruments": ["Lista de cotejo", "Rúbrica"],
              "evidence": "Evidencia de aprendizaje (Producto)"
            }
          ],
          "transversalCompetencies": [
            {
              "competency": "Nombre de la competencia transversal",
              "capacities": ["Capacidad 1", "Capacidad 2"],
              "desempeño_precisado": "Desempeño precisado transversal",
              "evidence": "Descripción de cómo se evidencia el aprendizaje",
              "instruments": ["Lista de cotejo"]
            }
          ],
          "transversalApproaches": [
            { "approach": "Enfoque", "actions": "Acciones observables" }
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
          "learningGuide": {
            "title": "Título de la Guía de Aprendizaje",
            "introduction": "Breve introducción motivadora",
            "steps": [
              {
                "stepNumber": 1,
                "title": "Nombre del paso/actividad",
                "didacticProcess": "Proceso didáctico de la competencia al que corresponde",
                "instructions": "Instrucciones claras y precisas para el estudiante",
                "detailedActivity": "Desarrollo paso a paso de lo que el estudiante debe hacer",
                "resources": "Materiales necesarios para este paso"
              }
            ],
            "finalProduct": "Descripción del producto o evidencia de aprendizaje final"
          },
          "applicationSheet": {
            "title": "Título de la Ficha de Aplicación",
            "contextualizedSituation": "Situación problemática basada en el contexto del estudiante para aplicar lo aprendido",
            "activities": [
              {
                "title": "Nombre del ejercicio/reto",
                "instructions": "Instrucciones claras y precisas para el estudiante",
                "content": "Desarrollo detallado del ejercicio o reto propuesto",
                "alignment": "Criterio de evaluación con el que se relaciona directamente"
              }
            ],
            "selfEvaluation": [
              { "criterion": "Criterio de evaluación", "indicator": "Lo logré / Estoy en proceso" }
            ]
          },
          "customData": {},
          "specialNeedsActivities": [
            { "studentName": "Nombre del alumno", "condition": "Condición", "strategy": "Descripción detallada de la actividad/ajuste dentro de la sesión" }
          ]
        }
        Asegúrate de que el contenido sea pedagógicamente sólido y adaptado al grado.
        IMPORTANTE (Lineamientos MINEDU):
        1. La **Evidencia de Aprendizaje** debe ser el resultado directo del **Propósito de Aprendizaje** establecido. Debe demostrar claramente el logro de las **Competencias y Capacidades priorizadas**.
        2. Para las **Competencias Transversales** (especialmente la Competencia 28: "Se desenvuelve en entornos virtuales..."), la evidencia NO debe ser genérica. Debe describir claramente cómo los recursos tecnológicos o programas seleccionados contribuyen a obtener la evidencia de aprendizaje que se integra con la competencia del área, detallando el uso pedagógico de la tecnología.
        3. Las actividades y la evidencia deben integrar y reflejar el uso de los **Recursos y Materiales Educativos** seleccionados.
        4. Si se solicita la "Guía de Actividades de aprendizaje", esta debe ser MUY ROBUSTA, detallada paso a paso, con instrucciones claras y precisas, organizada secuencialmente siguiendo estrictamente los procesos didácticos de la competencia seleccionada, hasta obtener un producto o evidencia de aprendizaje que responda al propósito.
        5. La "Ficha de Aplicación" debe ser modernizada y robusta, funcionando como una guía de práctica para obtener evidencias de aprendizaje. Debe incluir ejercicios contextualizados a la realidad del estudiante, alineados estrictamente con el propósito, el instrumento de evaluación (${data.instrument}) y los criterios de evaluación establecidos.
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
      
      // Map AI response to structured state for editing
      setData(prev => ({ 
        ...prev, 
        sessionTitle: content.sessionTitle || prev.sessionTitle,
        unitPurpose: content.purpose?.summary || prev.unitPurpose,
        learningTable: content.learningTable || [],
        transversalCompetencyData: content.transversalCompetencies || [],
        transversalApproachData: content.transversalApproaches || [],
        learningGuide: content.learningGuide || null,
        applicationSheet: content.applicationSheet || null,
        resources: content.resources || [],
        specialNeedsData: content.specialNeedsActivities || [],
        moments: {
          inicio: { 
            activity: content.didacticSequence?.inicio?.map((p: any) => `${p.process}: ${p.activities}`).join('\n\n') || '',
            resources: content.didacticSequence?.inicio?.map((p: any) => p.resources).filter(Boolean).join(', ') || '',
            time: '15'
          },
          desarrollo: { 
            activity: content.didacticSequence?.desarrollo?.map((p: any) => `${p.process}: ${p.activities}`).join('\n\n') || '',
            resources: content.didacticSequence?.desarrollo?.map((p: any) => p.resources).filter(Boolean).join(', ') || '',
            time: '60'
          },
          cierre: { 
            activity: content.didacticSequence?.cierre?.map((p: any) => `${p.process}: ${p.activities}`).join('\n\n') || '',
            resources: content.didacticSequence?.cierre?.map((p: any) => p.resources).filter(Boolean).join(', ') || '',
            time: '15'
          }
        }
      }));
    } catch (err) {
      console.error(err);
      setError("Error al generar la sesión. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadWord = async () => {
    if (!generatedContent) return;

    const children: any[] = [];

    // HEADER WITH LOGO
    if (data.schoolLogo) {
      try {
        const logoBuffer = await fetch(data.schoolLogo).then(res => res.arrayBuffer());
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TableBorders.NONE,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: logoBuffer,
                            transformation: { width: 60, height: 60 },
                          } as any),
                        ],
                      }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: data.institution.toUpperCase(), bold: true, size: 24 })],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: "SESIÓN DE APRENDIZAJE - 2026", bold: true, size: 20 })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 80, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                ],
              }),
            ],
          })
        );
      } catch (e) {
        console.error("Error loading logo for Word:", e);
      }
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: data.institution.toUpperCase(), bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "SESIÓN DE APRENDIZAJE - 2026", bold: true, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "TÍTULO: ", bold: true }),
          new TextRun({ text: (data.sessionTitle || data.topic || generatedContent?.sessionTitle || "").toUpperCase(), underline: {} })
        ],
        spacing: { before: 200, after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DOCENTE", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GRADO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UNIDAD", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nº SESIÓN", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "FECHA", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TIEMPO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
            ],
          }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (data.teacherName || "").toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (data.grade || "").toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (data.unit || "").toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (data.sessionNumber || "").toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (data.date || "").toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.duration || "90"} min`, size: 18 })], alignment: AlignmentType.CENTER })] }),
        ],
      }),
        ],
      }),
      new Paragraph({ spacing: { before: 200 } })
    );

    // PROPÓSITOS DE APRENDIZAJE TABLE (Image 1 style)
    const learningRows = [
      // Main Header
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "PROPÓSITOS DE APRENDIZAJE", bold: true })], alignment: AlignmentType.CENTER })], 
            columnSpan: 4,
            shading: { fill: "f3f4f6" }
          }),
        ],
      }),
      // Sub Header 1
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPETENCIA/ CAPACIDAD", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESEMPEÑO PRECISADO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "EVIDENCIAS DE APRENDIZAJE Producto", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INSTRUMENTO EVALUACIÓN", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
        ],
      }),
      // Main Competencies Data
      ...data.learningTable.map(row => new TableRow({
        children: [
          new TableCell({ 
            children: [
              new Paragraph({ children: [new TextRun({ text: row.competency || "", bold: true, size: 18 })] }),
              ...(Array.isArray(row.capacities) ? row.capacities : [row.capacities]).filter(Boolean).map((c: string) => new Paragraph({ children: [new TextRun({ text: c || "", size: 16 })], bullet: { level: 0 } }))
            ] 
          }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.desempeño_precisado || "", size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.evidence || "", size: 18 })] })] }),
          new TableCell({ children: (Array.isArray(row.instruments) ? row.instruments : [row.instruments]).filter(Boolean).map((i: string) => new Paragraph({ children: [new TextRun({ text: i || "", size: 18 })] })) }),
        ],
      })),
      // Transversal Header
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPETENCIA TRANSV/ CAPACIDAD", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESEMPEÑO PRECISADO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "¿Cómo se evidencia el aprendizaje?", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INSTRUMENTO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } }),
        ],
      }),
      // Transversal Data
      ...(data.transversalCompetencyData.length > 0 ? data.transversalCompetencyData : [{ competency: "Gestiona su aprendizaje de manera autónoma", capacities: ["Define metas de aprendizaje"], desempeño_precisado: "Comprende la importancia de los procedimientos que le permitan lograr una meta.", evidence: "Define metas personales respaldándose en sus potencialidades.", instruments: ["Lista de cotejo"] }]).map(row => new TableRow({
        children: [
          new TableCell({ 
            children: [
              new Paragraph({ children: [new TextRun({ text: row.competency || "", bold: true, size: 18 })] }),
              ...(Array.isArray(row.capacities) ? row.capacities : [row.capacities]).filter(Boolean).map((c: string) => new Paragraph({ children: [new TextRun({ text: c || "", size: 16 })], bullet: { level: 0 } }))
            ] 
          }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.desempeño_precisado || "", size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.evidence || "", size: 18 })] })] }),
          new TableCell({ children: (Array.isArray(row.instruments) ? row.instruments : [row.instruments]).filter(Boolean).map((i: string) => new Paragraph({ children: [new TextRun({ text: i || "", size: 18 })] })) }),
        ],
      })),
      // Enfoque Header
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ENFOQUE TRANSVERSAL", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, columnSpan: 1 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACCIONES", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, columnSpan: 3 }),
        ],
      }),
      // Enfoque Data
      ...(data.transversalApproachData.length > 0 ? data.transversalApproachData : [{ approach: "Enfoque de Derechos", actions: "Los docentes promueven el conocimiento de los Derechos Humanos." }]).map(row => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.approach, size: 18 })] })], columnSpan: 1 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.actions, size: 18 })] })], columnSpan: 3 }),
        ],
      })),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: learningRows,
      })
    );

    // IV. MOMENTOS
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "IV. MOMENTOS DE LA SESIÓN", bold: true, color: "1a5f7a" })],
        spacing: { before: 400, after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MOMENTOS", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, width: { size: 15, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACTIVIDADES", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, width: { size: 60, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RECURSOS", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, width: { size: 15, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TIEMPO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" }, width: { size: 10, type: WidthType.PERCENTAGE } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INICIO", bold: true, size: 18 })] })] }),
              new TableCell({ children: data.moments.inicio.activity.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 18 })] })) }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.moments.inicio.resources, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.moments.inicio.time} min`, size: 18 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESARROLLO", bold: true, size: 18 })] })] }),
              new TableCell({ children: data.moments.desarrollo.activity.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 18 })] })) }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.moments.desarrollo.resources, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.moments.desarrollo.time} min`, size: 18 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CIERRE", bold: true, size: 18 })] })] }),
              new TableCell({ children: data.moments.cierre.activity.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 18 })] })) }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.moments.cierre.resources, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.moments.cierre.time} min`, size: 18 })] })] }),
            ],
          }),
        ],
      })
    );

    // VII. ESTUDIANTES CON NEE
    if (data.specialNeedsData && data.specialNeedsData.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "VII. ESTUDIANTE CON NECESIDADES EDUCATIVAS ESPECIALES (NEE)", bold: true, color: "1a5f7a" })],
          spacing: { before: 400, after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: "NOMBRE DEL ALUMNO", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], 
                  shading: { fill: "1a5f7a" },
                  width: { size: 30, type: WidthType.PERCENTAGE }
                }),
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: "ACTIVIDAD DENTRO DE LA SESIÓN", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], 
                  shading: { fill: "1a5f7a" },
                  width: { size: 70, type: WidthType.PERCENTAGE }
                }),
              ],
            }),
            ...data.specialNeedsData.map((item: any) => new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: `${item.studentName || ""} — ${item.condition || ""}`, size: 18 })] })],
                  shading: { fill: "f3f4f6" }
                }),
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: item.strategy || "", size: 18 })] })] 
                }),
              ],
            }))
          ]
        })
      );
    }

    // VII. GUÍA DE ACTIVIDADES DE APRENDIZAJE
    if (data.generateActivities && data.learningGuide) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "VII. GUÍA DE ACTIVIDADES DE APRENDIZAJE", bold: true, color: "1a5f7a" })],
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: data.learningGuide.title, bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: data.learningGuide.introduction, italics: true })],
          spacing: { after: 300 }
        })
      );

      data.learningGuide.steps.forEach((step: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Paso ${step.stepNumber}: ${step.title}`, bold: true, color: "1a5f7a" })
            ],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Proceso Didáctico: ", bold: true }),
              new TextRun({ text: step.didacticProcess })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Instrucciones: ", bold: true }),
              new TextRun({ text: step.instructions })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: step.detailedActivity,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Recursos: ", bold: true, size: 18 }),
              new TextRun({ text: step.resources, size: 18 })
            ],
            spacing: { after: 200 }
          })
        );
      });

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "PRODUCTO / EVIDENCIA FINAL: ", bold: true, color: "1a5f7a" }),
            new TextRun({ text: data.learningGuide.finalProduct, bold: true })
          ],
          spacing: { before: 300, after: 200 }
        })
      );
    }

    // VIII. INSTRUMENTO DE EVALUACIÓN
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `VIII. INSTRUMENTO DE EVALUACIÓN: ${data.instrument.toUpperCase()}`, bold: true })],
        spacing: { before: 400, after: 100 },
      })
    );

    if (data.studentList.trim()) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "N°", bold: true })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Apellidos y Nombres", bold: true })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                ...(data.learningTable[0]?.criteria && Array.isArray(data.learningTable[0].criteria) 
                  ? data.learningTable[0].criteria.slice(0, 3).map((_: any, idx: number) => 
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Criterio ${idx + 1}`, bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } })
                    ) 
                  : [])
              ],
            }),
            ...data.studentList.split('\n').filter(name => name.trim()).map((name, idx) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph((idx + 1).toString())] }),
                new TableCell({ children: [new Paragraph(name.trim())] }),
                ...Array(Math.min(Array.isArray(data.learningTable[0]?.criteria) ? data.learningTable[0].criteria.length : 0, 3)).fill(0).map(() => 
                  new TableCell({ children: [new Paragraph("")] })
                )
              ],
            })),
          ],
        })
      );
    } else {
      children.push(new Paragraph("Se adjunta el instrumento seleccionado para la evaluación de las evidencias de aprendizaje."));
    }

    // IX. FICHA DE APLICACIÓN (GUÍA DE PRÁCTICA)
    if (data.generateApplication && data.applicationSheet) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "IX. FICHA DE APLICACIÓN (GUÍA DE PRÁCTICA)", bold: true, color: "1a5f7a" })],
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: data.applicationSheet.title, bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "Situación Contextualizada:", bold: true })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: data.applicationSheet.contextualizedSituation,
          spacing: { after: 200 }
        })
      );

      data.applicationSheet.activities.forEach((activity: any, idx: number) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Actividad ${idx + 1}: ${activity.title}`, bold: true, color: "1a5f7a" })
            ],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Instrucciones: ", bold: true }),
              new TextRun({ text: activity.instructions })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: activity.content,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Alineación: ", italics: true, size: 18 }),
              new TextRun({ text: activity.alignment, italics: true, size: 18 })
            ],
            spacing: { after: 200 }
          })
        );
      });

      children.push(
        new Paragraph({
          children: [new TextRun({ text: "AUTOEVALUACIÓN", bold: true, color: "1a5f7a" })],
          spacing: { before: 300, after: 100 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Criterios de Evaluación", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "¿Lo logré?", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "¿Qué puedo mejorar?", bold: true })] })] }),
              ]
            }),
            ...data.applicationSheet.selfEvaluation.map((item: any) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.criterion)] }),
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({ children: [new Paragraph("")] }),
              ]
            }))
          ]
        })
      );
    }

    // X. RECURSOS
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "X. RECURSOS Y MATERIALES", bold: true, color: "1a5f7a" })],
        spacing: { before: 400, after: 100 },
      }),
      ...data.resources.map((r: any) => new Paragraph({
        children: [
          new TextRun({ text: `${r.category}: `, bold: true }),
          new TextRun({ text: `${r.material} (${r.use})` })
        ],
        spacing: { after: 100 }
      }))
    );

    // SIGNATURES
    children.push(
      new Paragraph({ spacing: { before: 800 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TableBorders.NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ text: "__________________________", alignment: AlignmentType.CENTER }),
                  new Paragraph({ 
                    children: [new TextRun({ text: data.teacherName || "Docente de Aula", bold: true })],
                    alignment: AlignmentType.CENTER 
                  }),
                  new Paragraph({ text: "Docente", alignment: AlignmentType.CENTER }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: "__________________________", alignment: AlignmentType.CENTER }),
                  new Paragraph({ 
                    children: [new TextRun({ text: data.directorName || "Director(a)", bold: true })],
                    alignment: AlignmentType.CENTER 
                  }),
                  new Paragraph({ text: "Director(a)", alignment: AlignmentType.CENTER }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Sesion_${data.topic.replace(/\s+/g, '_')}.docx`);
  };

  const resetSessionData = () => {
    setData(prev => ({
      ...prev,
      sessionTitle: '',
      topic: '',
      area: '',
      level: 'Primaria',
      grade: '1er Grado',
      unit: '',
      sessionNumber: '',
      studentContext: '',
      learningPurposeMode: 'ai',
      manualLearningPurpose: '',
      learningTable: [],
      transversalCompetencyData: [],
      transversalApproaches: [],
      moments: {
        inicio: { activity: '', resources: '', time: '15' },
        desarrollo: { activity: '', resources: '', time: '60' },
        cierre: { activity: '', resources: '', time: '15' }
      },
      learningGuide: { title: '', sections: [] },
      applicationSheet: { title: '', questions: [] },
      resources: [],
      specialNeedsData: [],
      templateFile: undefined,
      unitFile: undefined,
      sessionSchemaFile: undefined,
      detectedSchema: undefined,
      dynamicFieldsValues: {}
    }));
  };

  const selectMode = (m: 'UNIT' | 'BOOKS' | 'FREE' | 'TEMPLATE') => {
    setMode(m);
    setView('form');
    resetSessionData();
  };

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-500 selection:bg-emerald-500/30 selection:text-emerald-200",
      theme === 'dark' ? "bg-[#050505] text-slate-300" : "light-theme bg-slate-50 text-slate-900"
    )}>
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-screen text-center transition-colors duration-500",
              theme === 'dark' ? "bg-[#050505]" : "bg-slate-50"
            )}
          >
            {/* Floating Theme Toggle for Landing */}
            <div className="fixed top-8 right-8 z-50">
              <div className={cn(
                "flex items-center gap-1 p-1 rounded-2xl border backdrop-blur-xl transition-all shadow-2xl",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white/80 border-slate-200"
              )}>
                <button 
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    theme === 'light' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Sun size={14} /> MODO CLARO
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    theme === 'dark' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
                  )}
                >
                  <Moon size={14} /> MODO OSCURO
                </button>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3">
                  <GraduationCap className="text-black w-12 h-12" />
                </div>
              </div>
              <h1 className="text-6xl font-black tracking-tighter mb-6 leading-[0.9]">
                Generador de Sesiones <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  de Aprendizaje
                </span>
              </h1>
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className={cn(
                  "px-3 py-1 border rounded-full text-xs font-bold tracking-widest uppercase transition-colors",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                )}>
                  V-5.4 • CNEB 2026
                </span>
              </div>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto font-light leading-relaxed">
                Una herramienta creada por <span className="text-emerald-400/80 font-medium">Juan Caicedo</span> y potenciada por <span className="text-cyan-400/80 font-medium">Gemini AI</span>
              </p>
            </div>

            <div className={cn(
              "w-full glass-panel rounded-[48px] p-8 md:p-16 shadow-2xl transition-all",
              theme === 'dark' ? "shadow-black/50" : "shadow-slate-200"
            )}>
              <div className="flex flex-col items-center justify-center gap-4 mb-12">
                <h2 className="text-3xl font-bold tracking-tight">¿Cómo quieres crear la sesión?</h2>
                <p className="text-slate-500 text-sm">Selecciona una modalidad para comenzar tu planificación.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => selectMode('UNIT')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-[32px] glass-card hover:border-emerald-500/30"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle2 className="text-emerald-400 w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Unidad de Aprendizaje</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Genera sesiones a partir de tu unidad ya planificada.</p>
                </button>

                <button 
                  onClick={() => selectMode('BOOKS')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-[32px] glass-card hover:border-blue-500/30"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle2 className="text-blue-400 w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Libros del Estado</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Genera Matemática y Comunicación si usas los libros del Estado.</p>
                </button>

                <button 
                  onClick={() => selectMode('FREE')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-[32px] glass-card hover:border-purple-500/30"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle2 className="text-purple-400 w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Sesión libre</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Genera cualquier curso sin información previa.</p>
                </button>

                <button 
                  onClick={() => selectMode('TEMPLATE')}
                  className="group relative flex flex-col items-center text-center p-8 rounded-[32px] glass-card hover:border-cyan-500/30"
                >
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle2 className="text-cyan-400 w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Usar mi Formato</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Sube tu propio esquema o modelo y la IA generará la sesión completa adaptándose a él.</p>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "min-h-screen transition-colors duration-500",
              theme === 'dark' ? "bg-[#050505]" : "bg-slate-50"
            )}
          >
            {/* Header */}
            <header className={cn(
              "sticky top-0 z-50 border-b transition-colors duration-500",
              theme === 'dark' ? "glass-panel border-white/5" : "bg-white/80 backdrop-blur-xl border-slate-200"
            )}>
              <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('landing')}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-transform",
                      mode === 'UNIT' ? "bg-emerald-500 shadow-emerald-500/20" : 
                      mode === 'BOOKS' ? "bg-blue-500 shadow-blue-500/20" : 
                      mode === 'FREE' ? "bg-purple-500 shadow-purple-500/20" : 
                      "bg-orange-500 shadow-orange-500/20"
                    )}
                  >
                    <GraduationCap className="text-black w-7 h-7" />
                  </button>
                  <div>
                    <h1 className={cn(
                      "text-xl font-bold tracking-tight transition-colors",
                      theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>EduGen <span className={cn(
                      mode === 'UNIT' ? "text-emerald-400" : 
                      mode === 'BOOKS' ? "text-blue-400" : 
                      mode === 'FREE' ? "text-purple-400" : 
                      "text-orange-400"
                    )}>AI</span></h1>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CNEB 2026</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest opacity-80",
                        mode === 'UNIT' ? "text-emerald-400" : 
                        mode === 'BOOKS' ? "text-blue-400" : 
                        mode === 'FREE' ? "text-purple-400" : 
                        "text-orange-400"
                      )}>
                        {mode === 'UNIT' ? 'Unidad' : mode === 'BOOKS' ? 'Libros' : mode === 'FREE' ? 'Libre' : 'Plantilla'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {/* Theme Toggle */}
                  <div className={cn(
                    "flex items-center gap-1 p-1 rounded-xl border transition-colors",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                  )}>
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        theme === 'light' ? cn(
                          "bg-white shadow-sm",
                          mode === 'UNIT' ? "text-emerald-600" : 
                          mode === 'BOOKS' ? "text-blue-600" : 
                          mode === 'FREE' ? "text-purple-600" : 
                          "text-orange-600"
                        ) : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      <Sun size={16} />
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        theme === 'dark' ? cn(
                          "text-white shadow-lg",
                          mode === 'UNIT' ? "bg-emerald-500 shadow-emerald-500/20" : 
                          mode === 'BOOKS' ? "bg-blue-500 shadow-blue-500/20" : 
                          mode === 'FREE' ? "bg-purple-500 shadow-purple-500/20" : 
                          "bg-orange-500 shadow-orange-500/20"
                        ) : "text-slate-500 hover:text-white"
                      )}
                    >
                      <Moon size={16} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setView('landing')}
                    className={cn(
                      "text-sm font-medium text-slate-500 transition-colors",
                      mode === 'UNIT' ? "hover:text-emerald-500" : 
                      mode === 'BOOKS' ? "hover:text-blue-500" : 
                      mode === 'FREE' ? "hover:text-purple-500" : 
                      "hover:text-orange-500"
                    )}
                  >
                    Volver al inicio
                  </button>
                  <div className="h-4 w-px bg-slate-700/30" />
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-2 border rounded-xl transition-colors",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
                  )}>
                    <User className="w-4 h-4 text-slate-400" />
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      theme === 'dark' ? "text-slate-300" : "text-slate-700"
                    )}>Juan Caicedo</span>
                  </div>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Form Section */}
                <div className="lg:col-span-7 space-y-12">
                  {mode === 'FREE' && (
                    <FreeMode 
                      data={data}
                      setData={setData}
                      theme={theme}
                      handleInputChange={handleInputChange}
                      handleLogoUpload={handleLogoUpload}
                      suggestTitle={suggestTitle}
                      isSuggestingTitle={isSuggestingTitle}
                      suggestContext={suggestContext}
                      isSuggestingContext={isSuggestingContext}
                      isFieldVisible={isFieldVisible}
                      toggleCompetency={toggleCompetency}
                      toggleTransversalCompetency={toggleTransversalCompetency}
                      toggleTransversalApproach={toggleTransversalApproach}
                      updateLearningTableRow={updateLearningTableRow}
                      addLearningTableRow={addLearningTableRow}
                      removeLearningTableRow={removeLearningTableRow}
                      updateLearningGuide={updateLearningGuide}
                      updateApplicationSheet={updateApplicationSheet}
                      updateResourceRow={updateResourceRow}
                      addResourceRow={addResourceRow}
                      removeResourceRow={removeResourceRow}
                      addSpecialNeed={addSpecialNeed}
                      updateSpecialNeed={updateSpecialNeed}
                      removeSpecialNeed={removeSpecialNeed}
                      saveCurrentList={saveCurrentList}
                      deleteList={deleteList}
                      loadList={loadList}
                      currentListName={currentListName}
                      setCurrentListName={setCurrentListName}
                      savedLists={savedLists}
                    />
                  )}
                  {mode === 'UNIT' && (
                    <UnitMode 
                      data={data}
                      setData={setData}
                      theme={theme}
                      handleInputChange={handleInputChange}
                      handleLogoUpload={handleLogoUpload}
                      handleFileUpload={handleFileUpload}
                      suggestTitle={suggestTitle}
                      isSuggestingTitle={isSuggestingTitle}
                      suggestContext={suggestContext}
                      isSuggestingContext={isSuggestingContext}
                      isFieldVisible={isFieldVisible}
                      unitTab={unitTab}
                      setUnitTab={setUnitTab}
                      isAnalyzingTemplate={isAnalyzingTemplate}
                      toggleCompetency={toggleCompetency}
                      toggleTransversalCompetency={toggleTransversalCompetency}
                      toggleTransversalApproach={toggleTransversalApproach}
                      updateLearningTableRow={updateLearningTableRow}
                      addLearningTableRow={addLearningTableRow}
                      removeLearningTableRow={removeLearningTableRow}
                      updateLearningGuide={updateLearningGuide}
                      updateApplicationSheet={updateApplicationSheet}
                      updateResourceRow={updateResourceRow}
                      addResourceRow={addResourceRow}
                      removeResourceRow={removeResourceRow}
                      addSpecialNeed={addSpecialNeed}
                      updateSpecialNeed={updateSpecialNeed}
                      removeSpecialNeed={removeSpecialNeed}
                      saveCurrentList={saveCurrentList}
                      deleteList={deleteList}
                      loadList={loadList}
                      currentListName={currentListName}
                      setCurrentListName={setCurrentListName}
                      savedLists={savedLists}
                      resetSessionData={resetSessionData}
                      clearFiles={clearFiles}
                    />
                  )}
                  {mode === 'BOOKS' && (
                    <BooksMode 
                      data={data}
                      setData={setData}
                      handleInputChange={handleInputChange}
                      handleLogoUpload={handleLogoUpload}
                      handleFileUpload={handleFileUpload}
                      suggestTitle={suggestTitle}
                      isSuggestingTitle={isSuggestingTitle}
                      suggestContext={suggestContext}
                      isSuggestingContext={isSuggestingContext}
                      isFieldVisible={isFieldVisible}
                      toggleCompetency={toggleCompetency}
                      toggleTransversalCompetency={toggleTransversalCompetency}
                      toggleTransversalApproach={toggleTransversalApproach}
                      updateLearningTableRow={updateLearningTableRow}
                      addLearningTableRow={addLearningTableRow}
                      removeLearningTableRow={removeLearningTableRow}
                      updateLearningGuide={updateLearningGuide}
                      updateApplicationSheet={updateApplicationSheet}
                      updateResourceRow={updateResourceRow}
                      addResourceRow={addResourceRow}
                      removeResourceRow={removeResourceRow}
                      addSpecialNeed={addSpecialNeed}
                      updateSpecialNeed={updateSpecialNeed}
                      removeSpecialNeed={removeSpecialNeed}
                      saveCurrentList={saveCurrentList}
                      deleteList={deleteList}
                      loadList={loadList}
                      currentListName={currentListName}
                      setCurrentListName={setCurrentListName}
                      savedLists={savedLists}
                    />
                  )}
                  {mode === 'TEMPLATE' && (
                    <TemplateMode 
                      data={data}
                      setData={setData}
                      theme={theme}
                      handleInputChange={handleInputChange}
                      handleLogoUpload={handleLogoUpload}
                      handleFileUpload={handleFileUpload}
                      suggestTitle={suggestTitle}
                      isSuggestingTitle={isSuggestingTitle}
                      suggestContext={suggestContext}
                      isSuggestingContext={isSuggestingContext}
                      isFieldVisible={isFieldVisible}
                      templateTab={templateTab}
                      setTemplateTab={setTemplateTab}
                      isAnalyzingTemplate={isAnalyzingTemplate}
                      toggleCompetency={toggleCompetency}
                      toggleTransversalCompetency={toggleTransversalCompetency}
                      toggleTransversalApproach={toggleTransversalApproach}
                      updateLearningTableRow={updateLearningTableRow}
                      addLearningTableRow={addLearningTableRow}
                      removeLearningTableRow={removeLearningTableRow}
                      updateLearningGuide={updateLearningGuide}
                      updateApplicationSheet={updateApplicationSheet}
                      updateResourceRow={updateResourceRow}
                      addResourceRow={addResourceRow}
                      removeResourceRow={removeResourceRow}
                      addSpecialNeed={addSpecialNeed}
                      updateSpecialNeed={updateSpecialNeed}
                      removeSpecialNeed={removeSpecialNeed}
                      saveCurrentList={saveCurrentList}
                      deleteList={deleteList}
                      loadList={loadList}
                      currentListName={currentListName}
                      setCurrentListName={setCurrentListName}
                      savedLists={savedLists}
                    />
                  )}

                  {data.detectedSchema && data.detectedSchema.missingFields && data.detectedSchema.missingFields.length > 0 && (mode !== 'TEMPLATE' || templateTab !== 'SUBIR') && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "border rounded-2xl p-5 space-y-4 backdrop-blur-xl",
                        mode === 'UNIT' ? "bg-emerald-500/10 border-emerald-500/20" : 
                        mode === 'BOOKS' ? "bg-blue-500/10 border-blue-500/20" : 
                        mode === 'FREE' ? "bg-purple-500/10 border-purple-500/20" : 
                        "bg-orange-500/10 border-orange-500/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className={cn(
                          mode === 'UNIT' ? "text-emerald-400" : 
                          mode === 'BOOKS' ? "text-blue-400" : 
                          mode === 'FREE' ? "text-purple-400" : 
                          "text-orange-400"
                        )} size={16} />
                        <h3 className={cn(
                          "text-xs font-bold uppercase tracking-wider",
                          mode === 'UNIT' ? "text-emerald-200" : 
                          mode === 'BOOKS' ? "text-blue-200" : 
                          mode === 'FREE' ? "text-purple-200" : 
                          "text-orange-200"
                        )}>Campos Adicionales Detectados</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.detectedSchema.missingFields.map((field) => (
                          <div key={field} className="space-y-1">
                            <label className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              mode === 'UNIT' ? "text-emerald-400" : 
                              mode === 'BOOKS' ? "text-blue-400" : 
                              mode === 'FREE' ? "text-purple-400" : 
                              "text-orange-400"
                            )}>{field}</label>
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
                              className={cn(
                                "w-full px-3 py-2 bg-slate-800/50 border rounded-lg outline-none text-xs transition-all placeholder:text-slate-600 transition-colors",
                                mode === 'UNIT' ? "border-emerald-500/20 focus:ring-emerald-500" : 
                                mode === 'BOOKS' ? "border-blue-500/20 focus:ring-blue-500" : 
                                mode === 'FREE' ? "border-purple-500/20 focus:ring-purple-500" : 
                                "border-orange-500/20 focus:ring-orange-500"
                              )}
                              style={{ color: 'var(--text-heading)' }}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-12">
                    <button 
                      onClick={generateSession}
                      disabled={isGenerating}
                      className={cn(
                        "w-full py-6 text-xl font-bold flex items-center justify-center gap-4 group rounded-xl transition-all shadow-lg active:scale-95",
                        mode === 'UNIT' ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20" : 
                        mode === 'BOOKS' ? "bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/20" : 
                        mode === 'FREE' ? "bg-purple-500 text-white hover:bg-purple-400 shadow-purple-500/20" : 
                        "bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20"
                      )}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin w-6 h-6" />
                          Generando Sesión...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                          Generar Sesión Educativa
                        </>
                      )}
                    </button>
                    {error && (
                      <div className="mt-6 p-6 bg-red-500/10 text-red-400 rounded-[32px] flex items-center gap-4 text-sm font-medium border border-red-500/20">
                        <AlertCircle size={20} />
                        {error}
                      </div>
                    )}
                    <p className="text-center text-[10px] text-slate-600 mt-6 uppercase tracking-[0.2em]">IA Optimizada para CNEB 2026</p>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-5">
                  <div className="sticky top-32 space-y-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                        <Eye className={cn(
                          "w-5 h-5",
                          mode === 'UNIT' ? "text-emerald-400" : 
                          mode === 'BOOKS' ? "text-blue-400" : 
                          mode === 'FREE' ? "text-purple-400" : 
                          "text-orange-400"
                        )} />
                        Vista Previa
                      </h2>
                      {generatedContent && (
                        <button 
                          onClick={downloadWord}
                          className={cn(
                            "py-2 px-4 text-xs font-bold rounded-xl border transition-all flex items-center gap-2",
                            mode === 'UNIT' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : 
                            mode === 'BOOKS' ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" : 
                            mode === 'FREE' ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20" : 
                            "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                          )}
                        >
                          <Download size={14} /> Descargar Word
                        </button>
                      )}
                    </div>
                    
                    <div className="glass-panel rounded-[40px] p-10 min-h-[600px] border border-white/5 relative overflow-hidden">
                      <div className={cn(
                        "absolute top-0 right-0 w-64 h-64 blur-[100px] -mr-32 -mt-32",
                        mode === 'UNIT' ? "bg-emerald-500/5" : 
                        mode === 'BOOKS' ? "bg-blue-500/5" : 
                        mode === 'FREE' ? "bg-purple-500/5" : 
                        "bg-orange-500/5"
                      )} />
                      
                      {!generatedContent && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                          <div className="w-20 h-20 rounded-[32px] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                            <FileText className="text-slate-700 w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-400 mb-2">Listo para generar</h3>
                            <p className="text-sm text-slate-600 max-w-[280px] leading-relaxed">Completa el formulario y presiona el botón para ver tu sesión aquí.</p>
                          </div>
                        </div>
                      )}

                      {isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                          <div className="relative">
                            <div className={cn(
                              "w-24 h-24 rounded-[32px] border-2 animate-pulse",
                              mode === 'UNIT' ? "border-emerald-500/20" : 
                              mode === 'BOOKS' ? "border-blue-500/20" : 
                              mode === 'FREE' ? "border-purple-500/20" : 
                              "border-orange-500/20"
                            )} />
                            <Loader2 className={cn(
                              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 animate-spin",
                              mode === 'UNIT' ? "text-emerald-400" : 
                              mode === 'BOOKS' ? "text-blue-400" : 
                              mode === 'FREE' ? "text-purple-400" : 
                              "text-orange-400"
                            )} />
                          </div>
                          <div className="space-y-3">
                            <h3 className={cn(
                              "text-xl font-bold",
                              mode === 'UNIT' ? "text-emerald-400" : 
                              mode === 'BOOKS' ? "text-blue-400" : 
                              mode === 'FREE' ? "text-purple-400" : 
                              "text-orange-400"
                            )}>Creando tu sesión</h3>
                            <p className="text-sm text-slate-500 animate-pulse">Alineando con lineamientos MINEDU...</p>
                          </div>
                        </div>
                      )}
                      {generatedContent && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-8"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-widest",
                                mode === 'UNIT' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                                mode === 'BOOKS' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                                mode === 'FREE' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : 
                                "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              )}>Documento Generado</span>
                            </div>
                            <h3 className="text-3xl font-bold leading-tight tracking-tight">{generatedContent.sessionTitle}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed italic">"{generatedContent.purpose.summary}"</p>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Competencia</p>
                              <p className="text-sm font-bold text-slate-300 line-clamp-2">{generatedContent.learningTable?.[0]?.competency || 'General'}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Duración</p>
                              <p className="text-sm font-bold text-slate-300">{data.duration} min</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                              <CheckCircle2 size={14} className={cn(
                                mode === 'UNIT' ? "text-emerald-400" : 
                                mode === 'BOOKS' ? "text-blue-400" : 
                                mode === 'FREE' ? "text-purple-400" : 
                                "text-orange-400"
                              )} />
                              Evidencia de Aprendizaje
                            </h4>
                            <div className={cn(
                              "p-6 rounded-3xl border",
                              mode === 'UNIT' ? "bg-emerald-500/5 border-emerald-500/10" : 
                              mode === 'BOOKS' ? "bg-blue-500/5 border-blue-500/10" : 
                              mode === 'FREE' ? "bg-purple-500/5 border-purple-500/10" : 
                              "bg-orange-500/5 border-orange-500/10"
                            )}>
                              <p className="text-sm text-slate-300 leading-relaxed italic">"{generatedContent.learningTable?.[0]?.evidence || "No especificada"}"</p>
                            </div>
                          </div>

                          {generatedContent.learningGuide && (
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <Plus size={14} className={cn(
                                  mode === 'UNIT' ? "text-emerald-400" : 
                                  mode === 'BOOKS' ? "text-blue-400" : 
                                  mode === 'FREE' ? "text-purple-400" : 
                                  "text-orange-400"
                                )} />
                                Guía de Actividades
                              </h4>
                              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                                <p className={cn(
                                  "text-sm font-bold mb-2",
                                  mode === 'UNIT' ? "text-emerald-400" : 
                                  mode === 'BOOKS' ? "text-blue-400" : 
                                  mode === 'FREE' ? "text-purple-400" : 
                                  "text-orange-400"
                                )}>{generatedContent.learningGuide.title}</p>
                                <p className="text-xs text-slate-500 line-clamp-3">{generatedContent.learningGuide.introduction}</p>
                              </div>
                            </div>
                          )}

                          <div className="pt-6 border-t border-white/5">
                            <button 
                              onClick={downloadWord}
                              className={cn(
                                "w-full py-4 flex items-center justify-center gap-3 rounded-xl font-bold transition-all shadow-lg active:scale-95",
                                mode === 'UNIT' ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20" : 
                                mode === 'BOOKS' ? "bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/20" : 
                                mode === 'FREE' ? "bg-purple-500 text-white hover:bg-purple-400 shadow-purple-500/20" : 
                                "bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20"
                              )}
                            >
                              <Download size={20} />
                              Descargar Planificación Completa
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Tips */}
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className={cn(
                        "p-4 rounded-2xl border",
                        mode === 'UNIT' ? "bg-emerald-500/5 border-emerald-500/10" : 
                        mode === 'BOOKS' ? "bg-blue-500/5 border-blue-500/10" : 
                        mode === 'FREE' ? "bg-purple-500/5 border-purple-500/10" : 
                        "bg-orange-500/5 border-orange-500/10"
                      )}>
                        <Sparkles className={cn(
                          "mb-2",
                          mode === 'UNIT' ? "text-emerald-400" : 
                          mode === 'BOOKS' ? "text-blue-400" : 
                          mode === 'FREE' ? "text-purple-400" : 
                          "text-orange-400"
                        )} size={18} />
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          mode === 'UNIT' ? "text-emerald-400" : 
                          mode === 'BOOKS' ? "text-blue-400" : 
                          mode === 'FREE' ? "text-purple-400" : 
                          "text-orange-400"
                        )}>IA Optimizada</p>
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

            <footer className={cn(
              "max-w-5xl mx-auto px-6 py-12 border-t transition-colors duration-500",
              theme === 'dark' ? "border-slate-800" : "border-slate-200"
            )}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className={cn(
                  "flex items-center gap-2 transition-all",
                  theme === 'dark' ? "opacity-30 grayscale invert" : "opacity-50"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center",
                    theme === 'dark' ? "bg-white" : "bg-slate-900"
                  )}>
                    <GraduationCap className={cn(
                      "w-4 h-4",
                      theme === 'dark' ? "text-slate-900" : "text-white"
                    )} />
                  </div>
                  <span className={cn(
                    "text-sm font-bold tracking-tight",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                  )}>EduGen</span>
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
