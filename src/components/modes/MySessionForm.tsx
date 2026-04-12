import React from 'react';
import { 
  User, 
  School, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Target, 
  Plus,
  Trash2,
  Clock,
  Loader2,
  ChevronRight,
  Trash
} from 'lucide-react';
import { SessionData, SpecialNeedStudent, SessionMoment } from '../../types';
import { cn } from '../../lib/utils';
import { 
  NIVELES, 
  GRADOS_POR_NIVEL, 
  AREAS_POR_NIVEL, 
  COMPETENCIAS_POR_AREA, 
  COMPETENCIAS_TRANSVERSALES, 
  ENFOQUES_TRANSVERSALES, 
  INSTRUMENTOS_EVALUACION,
  CONDICIONES_NEE,
  ACTIVIDADES_NEE
} from '../../constants';

interface MySessionFormProps {
  data: SessionData;
  setData: React.Dispatch<React.SetStateAction<SessionData>>;
  theme: 'dark' | 'light';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestTitle: () => Promise<void>;
  isSuggestingTitle: boolean;
  suggestContext: () => Promise<void>;
  isSuggestingContext: boolean;
  isFieldVisible: (fieldName: string) => boolean;
  toggleCompetency: (comp: string) => void;
  toggleTransversalCompetency: (comp: string) => void;
  toggleTransversalApproach: (approach: string) => void;
  updateLearningTableRow: (index: number, field: string, value: any) => void;
  addLearningTableRow: () => void;
  removeLearningTableRow: (index: number) => void;
  updateLearningGuide: (field: string, value: any) => void;
  updateApplicationSheet: (field: string, value: any) => void;
  updateResourceRow: (index: number, field: string, value: any) => void;
  addResourceRow: () => void;
  removeResourceRow: (index: number) => void;
  addSpecialNeed: () => void;
  updateSpecialNeed: (id: string, field: keyof SpecialNeedStudent, value: string) => void;
  removeSpecialNeed: (id: string) => void;
  saveCurrentList: () => void;
  deleteList: (name: string) => void;
  loadList: (name: string) => void;
  currentListName: string;
  setCurrentListName: (name: string) => void;
  savedLists: Record<string, string>;
  primaryColor?: 'emerald' | 'blue' | 'purple' | 'orange';
}

export const MySessionForm: React.FC<MySessionFormProps> = ({
  data,
  setData,
  theme,
  handleInputChange,
  handleLogoUpload,
  suggestTitle,
  isSuggestingTitle,
  suggestContext,
  isSuggestingContext,
  isFieldVisible,
  toggleCompetency,
  toggleTransversalCompetency,
  toggleTransversalApproach,
  updateLearningTableRow,
  addLearningTableRow,
  removeLearningTableRow,
  updateLearningGuide,
  updateApplicationSheet,
  updateResourceRow,
  addResourceRow,
  removeResourceRow,
  addSpecialNeed,
  updateSpecialNeed,
  removeSpecialNeed,
  saveCurrentList,
  deleteList,
  loadList,
  currentListName,
  setCurrentListName,
  savedLists,
  primaryColor = 'emerald'
}) => {
  const colors = {
    emerald: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-500/10',
      bgHover: 'hover:bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      ring: 'focus:ring-emerald-500',
      borderDashed: 'hover:border-emerald-500/30',
      button: 'bg-emerald-500 text-white',
      buttonGhost: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
      shadow: 'shadow-emerald-500/20'
    },
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-500/10',
      bgHover: 'hover:bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      ring: 'focus:ring-blue-500',
      borderDashed: 'hover:border-blue-500/30',
      button: 'bg-blue-500 text-white',
      buttonGhost: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
      shadow: 'shadow-blue-500/20'
    },
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-500/10',
      bgHover: 'hover:bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      ring: 'focus:ring-purple-500',
      borderDashed: 'hover:border-purple-500/30',
      button: 'bg-purple-500 text-white',
      buttonGhost: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
      shadow: 'shadow-purple-500/20'
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-500/10',
      bgHover: 'hover:bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/20',
      ring: 'focus:ring-orange-500',
      borderDashed: 'hover:border-orange-500/30',
      button: 'bg-orange-500 text-white',
      buttonGhost: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
      shadow: 'shadow-orange-500/20'
    }
  }[primaryColor];

  return (
    <div className="space-y-12">
      <section className="space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>1</div>
          <h2 className="text-2xl font-bold tracking-tight">Datos Informativos</h2>
        </div>
        
        <div className="glass-panel rounded-[32px] p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Logo Column */}
            <div className={cn("w-full lg:w-1/4 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[32px] p-6 transition-all group relative overflow-hidden bg-white/[0.02]", colors.borderDashed)}>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload-mysession"
              />
              <label 
                htmlFor="logo-upload-mysession"
                className="cursor-pointer flex flex-col items-center gap-4 w-full h-full min-h-[180px] justify-center text-center"
              >
                {data.schoolLogo ? (
                  <img src={data.schoolLogo} alt="Logo" className="w-full h-full object-contain max-h-[160px]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform", colors.bgLight, colors.text, colors.border)}>
                      <Plus size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subir Insignia</span>
                  </div>
                )}
              </label>
            </div>

            {/* Fields Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {isFieldVisible('teacherName') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Nombre del Docente
                    </label>
                    <input 
                      type="text" 
                      name="teacherName"
                      value={data.teacherName}
                      onChange={handleInputChange}
                      className="minimal-input w-full"
                      placeholder="Ej. Juan Caicedo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identidad del Docente</label>
                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 h-[46px]">
                      <button 
                        onClick={() => setData(prev => ({ ...prev, teacherGender: 'male' }))}
                        className={cn(
                          "flex-1 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                          data.teacherGender === 'male' ? cn(colors.bg, "text-black shadow-lg") : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        EL PROFESOR
                      </button>
                      <button 
                        onClick={() => setData(prev => ({ ...prev, teacherGender: 'female' }))}
                        className={cn(
                          "flex-1 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                          data.teacherGender === 'female' ? cn(colors.bg, "text-black shadow-lg") : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        LA PROFESORA
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {isFieldVisible('institution') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <School size={14} /> Institución Educativa
                  </label>
                  <input 
                    type="text" 
                    name="institution"
                    value={data.institution}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej. I.E. Martín de la Riva"
                  />
                </div>
              )}
              {isFieldVisible('level') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nivel</label>
                  <div className="relative">
                    <select 
                      name="level"
                      value={data.level}
                      onChange={handleInputChange}
                      className="minimal-input w-full appearance-none pr-10"
                    >
                      {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}
              {isFieldVisible('grade') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grado y Sección</label>
                  <div className="relative">
                    <select 
                      name="grade"
                      value={data.grade}
                      onChange={handleInputChange}
                      className="minimal-input w-full appearance-none pr-10"
                    >
                      {GRADOS_POR_NIVEL[data.level].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}
              {isFieldVisible('area') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Área Curricular</label>
                  <div className="relative">
                    <select 
                      name="area"
                      value={data.area}
                      onChange={handleInputChange}
                      className="minimal-input w-full appearance-none pr-10"
                    >
                      {AREAS_POR_NIVEL[data.level].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}
              {isFieldVisible('directorName') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Director(a)</label>
                  <input 
                    type="text" 
                    name="directorName"
                    value={data.directorName}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Nombre del director..."
                  />
                </div>
              )}
              {isFieldVisible('unit') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidad</label>
                  <input 
                    type="text" 
                    name="unit"
                    value={data.unit}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej. Unidad 01"
                  />
                </div>
              )}
              {isFieldVisible('sessionNumber') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nº Sesión</label>
                  <input 
                    type="text" 
                    name="sessionNumber"
                    value={data.sessionNumber}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej. Sesión 05"
                  />
                </div>
              )}
              {isFieldVisible('date') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
                  <input 
                    type="date" 
                    name="date"
                    value={data.date}
                    onChange={handleInputChange}
                    className="minimal-input w-full [color-scheme:dark]"
                  />
                </div>
              )}
              {isFieldVisible('duration') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duración (min)</label>
                  <input 
                    type="text" 
                    name="duration"
                    value={data.duration}
                    onChange={handleInputChange}
                    className="minimal-input w-full"
                    placeholder="Ej. 90 minutos"
                  />
                </div>
              )}
              {isFieldVisible('instrument') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Instrumento de Evaluación</label>
                  <div className="relative">
                    <select 
                      name="instrument"
                      value={data.instrument}
                      onChange={handleInputChange}
                      className="minimal-input w-full appearance-none pr-10"
                    >
                      {INSTRUMENTOS_EVALUACION.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>2</div>
          <h2 className="text-2xl font-bold tracking-tight">Contexto y Planificación</h2>
        </div>
        <div className="space-y-8">
          {isFieldVisible('topic') && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} /> Tema Específico
              </label>
              <input 
                type="text" 
                name="topic"
                value={data.topic}
                onChange={handleInputChange}
                placeholder="Ej. Las Fracciones en la vida diaria"
                className="minimal-input w-full"
              />
            </div>
          )}

          {isFieldVisible('sessionTitle') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className={colors.text} /> Título de la sesión
                </label>
                <button 
                  onClick={suggestTitle}
                  disabled={isSuggestingTitle}
                  className={cn("text-[10px] font-bold px-3 py-1 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer", colors.buttonGhost)}
                >
                  {isSuggestingTitle ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Sugerir con IA
                </button>
              </div>
              <textarea 
                name="sessionTitle"
                value={data.sessionTitle}
                onChange={handleInputChange}
                rows={2}
                placeholder="Título de la sesión..."
                className="minimal-input w-full resize-none"
              />
            </div>
          )}

          {isFieldVisible('studentContext') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} /> Contexto de los estudiantes (DUA)
                </label>
                <button 
                  onClick={suggestContext}
                  disabled={isSuggestingContext}
                  className={cn("text-[10px] font-bold px-3 py-1 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer", colors.buttonGhost)}
                >
                  {isSuggestingContext ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Sugerir con IA
                </button>
              </div>
              <textarea 
                name="studentContext"
                value={data.studentContext}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe el entorno, necesidades e intereses de tus alumnos..."
                className="minimal-input w-full resize-none"
              />
            </div>
          )}

          {isFieldVisible('unitPurpose') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Target size={14} /> Propósito de aprendizaje
                </label>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button 
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, learningPurposeMode: 'auto' }))}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                      data.learningPurposeMode === 'auto' ? colors.button : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Automático
                  </button>
                  <button 
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, learningPurposeMode: 'manual' }))}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                      data.learningPurposeMode === 'manual' ? colors.button : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Manual
                  </button>
                </div>
              </div>
              
              {data.learningPurposeMode === 'manual' ? (
                <textarea 
                  name="manualLearningPurpose"
                  value={data.manualLearningPurpose}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Escribe el propósito de aprendizaje o pega el de tu unidad..."
                  className={cn("minimal-input w-full resize-none border", colors.border)}
                />
              ) : (
                <div className={cn("p-4 border rounded-2xl", colors.bgLight, colors.border)}>
                  <p className={cn("text-xs italic", colors.text)}>
                    El propósito se generará automáticamente basándose en las competencias y capacidades seleccionadas.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isFieldVisible('competencies') && (
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>3</div>
            <h2 className="text-2xl font-bold tracking-tight">Competencias a Desarrollar</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8 space-y-6">
            <div className={cn(
              "flex items-center gap-4 p-4 rounded-2xl mb-4 transition-colors",
              theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-slate-100 border border-slate-300"
            )}>
              <input 
                type="checkbox" 
                id="aiSuggestCompetency-mysession"
                checked={data.aiSuggestCompetency}
                onChange={(e) => setData(prev => ({ ...prev, aiSuggestCompetency: e.target.checked, competencies: e.target.checked ? [] : prev.competencies }))}
                className={cn("w-5 h-5 rounded-lg bg-white/5 border-white/10", colors.text, colors.ring)}
              />
              <label htmlFor="aiSuggestCompetency-mysession" className={cn("text-sm font-bold cursor-pointer", colors.text)}>
                Dejar que la IA sugiera la competencia
              </label>
            </div>
            
            {!data.aiSuggestCompetency && (
              <div className="space-y-4">
                <p className={cn(
                  "text-xs font-medium italic transition-colors",
                  theme === 'dark' ? "text-slate-500" : "text-slate-600"
                )}>Selecciona hasta 3 competencias para esta sesión:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COMPETENCIAS_POR_AREA[data.area]?.map(comp => (
                    <button 
                      key={comp}
                      onClick={() => toggleCompetency(comp)}
                      className={cn(
                        "text-left p-4 rounded-2xl border text-xs font-medium transition-all duration-300",
                        data.competencies.includes(comp) 
                          ? cn(colors.bgLight, colors.text, colors.border, "shadow-lg", colors.shadow) 
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      )}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {isFieldVisible('transversalCompetencies') && (
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>4</div>
            <h2 className="text-2xl font-bold tracking-tight">Competencias Transversales</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPETENCIAS_TRANSVERSALES.map(comp => (
                <button 
                  key={comp}
                  onClick={() => toggleTransversalCompetency(comp)}
                  className={cn(
                    "text-left p-4 rounded-2xl border text-xs font-medium transition-all duration-300",
                    data.transversalCompetencies.includes(comp) 
                      ? cn(colors.bgLight, colors.text, colors.border, "shadow-lg", colors.shadow) 
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  )}
                >
                  {comp}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {isFieldVisible('transversalApproaches') && (
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>5</div>
            <h2 className="text-2xl font-bold tracking-tight">Enfoques Transversales</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ENFOQUES_TRANSVERSALES.map(approach => (
                <button 
                  key={approach}
                  onClick={() => toggleTransversalApproach(approach)}
                  className={cn(
                    "text-left p-4 rounded-2xl border text-xs font-medium transition-all duration-300",
                    data.transversalApproaches.includes(approach) 
                      ? cn(colors.bgLight, colors.text, colors.border, "shadow-lg", colors.shadow) 
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  )}
                >
                  {approach}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* III. PROPÓSITOS DE APRENDIZAJE TABLE */}
      <section className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>III</div>
            <h2 className="text-2xl font-bold tracking-tight">Propósitos de Aprendizaje</h2>
          </div>
          <button 
            onClick={addLearningTableRow}
            className={cn("px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2", colors.buttonGhost)}
          >
            <Plus size={14} /> Agregar Competencia
          </button>
        </div>
        <div className="glass-panel rounded-[32px] p-8 overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Competencias</th>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Capacidades</th>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Desempeño Precisado</th>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Criterios</th>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Evidencia</th>
                <th className="p-3 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5">Instrumento</th>
                <th className="p-3 border border-white/10 bg-white/5"></th>
              </tr>
            </thead>
            <tbody>
              {data.learningTable.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.competency} 
                      onChange={(e) => updateLearningTableRow(idx, 'competency', e.target.value)}
                      className="minimal-input w-full text-xs min-h-[60px]"
                    />
                  </td>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.capacities?.join('\n')} 
                      onChange={(e) => updateLearningTableRow(idx, 'capacities', e.target.value.split('\n'))}
                      className="minimal-input w-full text-xs min-h-[60px]"
                      placeholder="Una por línea..."
                    />
                  </td>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.desempeño_precisado} 
                      onChange={(e) => updateLearningTableRow(idx, 'desempeño_precisado', e.target.value)}
                      className="minimal-input w-full text-xs min-h-[60px]"
                    />
                  </td>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.criteria?.join('\n')} 
                      onChange={(e) => updateLearningTableRow(idx, 'criteria', e.target.value.split('\n'))}
                      className="minimal-input w-full text-xs min-h-[60px]"
                      placeholder="Uno por línea..."
                    />
                  </td>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.evidence} 
                      onChange={(e) => updateLearningTableRow(idx, 'evidence', e.target.value)}
                      className="minimal-input w-full text-xs min-h-[60px]"
                    />
                  </td>
                  <td className="p-2 border border-white/10">
                    <textarea 
                      value={row.instruments?.join('\n')} 
                      onChange={(e) => updateLearningTableRow(idx, 'instruments', e.target.value.split('\n'))}
                      className="minimal-input w-full text-xs min-h-[60px]"
                      placeholder="Uno por línea..."
                    />
                  </td>
                  <td className="p-2 border border-white/10 text-center">
                    <button onClick={() => removeLearningTableRow(idx)} className="text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* IV. MOMENTOS DE LA SESIÓN */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>IV</div>
          <h2 className="text-2xl font-bold tracking-tight">Momentos de la Sesión</h2>
        </div>
        <div className="glass-panel rounded-[32px] p-8 space-y-8">
          {(Object.entries(data.moments) as [string, SessionMoment][]).map(([key, moment]) => (
            <div key={key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", colors.text)}>{key}</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <Clock size={12} className="text-slate-500" />
                  <input 
                    type="text"
                    value={moment.time}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      moments: { ...prev.moments, [key]: { ...prev.moments[key as keyof typeof prev.moments], time: e.target.value } }
                    }))}
                    className="bg-transparent border-none text-[10px] font-bold text-slate-400 w-8 focus:ring-0 p-0"
                  />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">min</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividades</label>
                  <textarea 
                    value={moment.activity}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      moments: { ...prev.moments, [key]: { ...prev.moments[key as keyof typeof prev.moments], activity: e.target.value } }
                    }))}
                    rows={4}
                    className="minimal-input w-full text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recursos</label>
                  <textarea 
                    value={moment.resources}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      moments: { ...prev.moments, [key]: { ...prev.moments[key as keyof typeof prev.moments], resources: e.target.value } }
                    }))}
                    rows={4}
                    className="minimal-input w-full text-xs"
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
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>V</div>
            <h2 className="text-2xl font-bold tracking-tight">Guía de Aprendizaje</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Guía</label>
              <input 
                type="text"
                value={data.learningGuide.title}
                onChange={(e) => updateLearningGuide('title', e.target.value)}
                className="minimal-input w-full text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Introducción</label>
              <textarea 
                value={data.learningGuide.introduction}
                onChange={(e) => updateLearningGuide('introduction', e.target.value)}
                rows={3}
                className="minimal-input w-full text-xs"
              />
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pasos de la Actividad</p>
              {data.learningGuide.steps?.map((step: any, idx: number) => (
                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", colors.text)}>Paso {step.stepNumber}</span>
                    <input 
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const newSteps = [...data.learningGuide.steps];
                        newSteps[idx].title = e.target.value;
                        updateLearningGuide('steps', newSteps);
                      }}
                      className="minimal-input text-xs w-2/3"
                      placeholder="Título del paso..."
                    />
                  </div>
                  <textarea 
                    value={step.detailedActivity}
                    onChange={(e) => {
                      const newSteps = [...data.learningGuide.steps];
                      newSteps[idx].detailedActivity = e.target.value;
                      updateLearningGuide('steps', newSteps);
                    }}
                    rows={3}
                    className="minimal-input w-full text-xs"
                    placeholder="Descripción detallada..."
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VI. FICHA DE APLICACIÓN */}
      {data.applicationSheet && (
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>VI</div>
            <h2 className="text-2xl font-bold tracking-tight">Ficha de Aplicación</h2>
          </div>
          <div className="glass-panel rounded-[32px] p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Ficha</label>
              <input 
                type="text"
                value={data.applicationSheet.title}
                onChange={(e) => updateApplicationSheet('title', e.target.value)}
                className="minimal-input w-full text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Situación Contextualizada</label>
              <textarea 
                value={data.applicationSheet.contextualizedSituation}
                onChange={(e) => updateApplicationSheet('contextualizedSituation', e.target.value)}
                rows={3}
                className="minimal-input w-full text-xs"
              />
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retos / Ejercicios</p>
              {data.applicationSheet.activities?.map((activity: any, idx: number) => (
                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <input 
                    type="text"
                    value={activity.title}
                    onChange={(e) => {
                      const newActs = [...data.applicationSheet.activities];
                      newActs[idx].title = e.target.value;
                      updateApplicationSheet('activities', newActs);
                    }}
                    className="minimal-input text-xs w-full font-bold"
                    placeholder="Título del reto..."
                  />
                  <textarea 
                    value={activity.content}
                    onChange={(e) => {
                      const newActs = [...data.applicationSheet.activities];
                      newActs[idx].content = e.target.value;
                      updateApplicationSheet('activities', newActs);
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
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>VII</div>
            <h2 className="text-2xl font-bold tracking-tight">Recursos y Materiales</h2>
          </div>
          <button 
            onClick={addResourceRow}
            className={cn("px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2", colors.buttonGhost)}
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

      {/* VIII. ESTUDIANTES CON NEE */}
      <section className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>VIII</div>
            <h2 className="text-2xl font-bold tracking-tight">Estudiantes con NEE</h2>
          </div>
          <button 
            onClick={addSpecialNeed}
            className={cn("px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2", colors.buttonGhost)}
          >
            <Plus size={14} /> Agregar Estudiante
          </button>
        </div>
        <div className="glass-panel rounded-[32px] p-8">
          <div className="space-y-4">
            {data.specialNeeds.map((student) => (
              <div key={student.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4 relative group">
                <button 
                  onClick={() => removeSpecialNeed(student.id)}
                  className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Estudiante</label>
                    <input 
                      type="text"
                      value={student.name}
                      onChange={(e) => updateSpecialNeed(student.id, 'name', e.target.value)}
                      className="minimal-input w-full text-xs"
                      placeholder="Nombre completo..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condición</label>
                    <div className="relative">
                      <select 
                        value={CONDICIONES_NEE.includes(student.condition) ? student.condition : "Escribir (personalizado)"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Escribir (personalizado)") {
                            updateSpecialNeed(student.id, 'condition', '');
                          } else {
                            updateSpecialNeed(student.id, 'condition', val);
                          }
                        }}
                        className="minimal-input w-full text-xs appearance-none pr-10"
                      >
                        <option value="" disabled>Seleccionar condición...</option>
                        {CONDICIONES_NEE.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                    </div>
                    {(!CONDICIONES_NEE.includes(student.condition) || student.condition === "Escribir (personalizado)") && (
                      <input 
                        type="text"
                        value={student.condition === "Escribir (personalizado)" ? "" : student.condition}
                        onChange={(e) => updateSpecialNeed(student.id, 'condition', e.target.value)}
                        className="minimal-input w-full text-xs mt-2"
                        placeholder="Especificar condición..."
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividad Diferenciada</label>
                    <div className="relative">
                      <select 
                        value={ACTIVIDADES_NEE.includes(student.activity) ? student.activity : "Escribir (personalizado)"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Escribir (personalizado)") {
                            updateSpecialNeed(student.id, 'activity', '');
                          } else {
                            updateSpecialNeed(student.id, 'activity', val);
                          }
                        }}
                        className="minimal-input w-full text-xs appearance-none pr-10"
                      >
                        <option value="" disabled>Seleccionar actividad...</option>
                        {ACTIVIDADES_NEE.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                    </div>
                    {(!ACTIVIDADES_NEE.includes(student.activity) || student.activity === "Escribir (personalizado)") && (
                      <textarea 
                        value={student.activity === "Escribir (personalizado)" ? "" : student.activity}
                        onChange={(e) => updateSpecialNeed(student.id, 'activity', e.target.value)}
                        rows={2}
                        className="minimal-input w-full text-xs mt-2"
                        placeholder="Especificar actividad..."
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data.specialNeeds.length === 0 && (
              <p className="text-center text-slate-500 italic text-sm py-8">No hay estudiantes con NEE registrados.</p>
            )}
          </div>

          {/* Generated NEE Strategies Table (Image 2 Style) */}
          {data.specialNeedsData && data.specialNeedsData.length > 0 && (
            <div className="mt-12 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Estrategias Generadas por IA</h3>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 w-1/3">Nombre del Alumno</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">Actividad dentro de la Sesión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.specialNeedsData.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 align-top">
                          <div className="font-bold text-slate-200 text-xs">{item.studentName}</div>
                          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">{item.condition}</div>
                        </td>
                        <td className="p-4">
                          <textarea
                            value={item.strategy}
                            onChange={(e) => {
                              const newData = [...data.specialNeedsData];
                              newData[idx] = { ...item, strategy: e.target.value };
                              setData({ ...data, specialNeedsData: newData });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-xs text-slate-400 leading-relaxed resize-none"
                            rows={4}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* IX. LISTA DE ESTUDIANTES */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border", colors.bgLight, colors.text, colors.border)}>IX</div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de Estudiantes</h2>
        </div>
        <div className="glass-panel rounded-[32px] p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre de la Lista</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={currentListName}
                  onChange={(e) => setCurrentListName(e.target.value)}
                  className="minimal-input flex-1 text-xs"
                  placeholder="Ej. 2do Grado A 2026"
                />
                <button 
                  onClick={saveCurrentList}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all", colors.button)}
                >
                  Guardar
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cargar Lista Guardada</label>
              <div className="relative">
                <select 
                  onChange={(e) => loadList(e.target.value)}
                  className="minimal-input w-full appearance-none pr-10 text-xs"
                  value={currentListName}
                >
                  <option value="">Seleccionar lista...</option>
                  {Object.keys(savedLists).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estudiantes (Uno por línea)</label>
            <textarea 
              name="studentList"
              value={data.studentList}
              onChange={handleInputChange}
              rows={10}
              className="minimal-input w-full text-xs font-mono"
              placeholder="1. Apellidos, Nombres&#10;2. Apellidos, Nombres..."
            />
          </div>
          {Object.keys(savedLists).length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Listas Guardadas:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(savedLists).map(name => (
                  <div key={name} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full group">
                    <span className="text-[10px] font-medium text-slate-400">{name}</span>
                    <button 
                      onClick={() => deleteList(name)}
                      className="text-slate-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
