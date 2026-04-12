import React from 'react';
import { 
  FileText, 
  Upload,
  Calendar,
  CheckCircle2,
  Loader2,
  Trash2
} from 'lucide-react';
import { SessionData, SpecialNeedStudent } from '../../types';
import { cn } from '../../lib/utils';
import { MySessionForm } from './MySessionForm';

interface UnitModeProps {
  data: SessionData;
  setData: React.Dispatch<React.SetStateAction<SessionData>>;
  theme: 'dark' | 'light';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, fileType?: 'UNIT' | 'SCHEMA' | 'TEMPLATE') => void;
  suggestTitle: () => Promise<void>;
  isSuggestingTitle: boolean;
  suggestContext: () => Promise<void>;
  isSuggestingContext: boolean;
  isFieldVisible: (fieldName: string) => boolean;
  unitTab: 'upload' | 'current';
  setUnitTab: (tab: 'upload' | 'current') => void;
  isAnalyzingTemplate: boolean;
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
  resetSessionData: () => void;
  clearFiles: () => void;
}

export const UnitMode: React.FC<UnitModeProps> = ({
  data,
  setData,
  theme,
  handleInputChange,
  handleLogoUpload,
  handleFileUpload,
  suggestTitle,
  isSuggestingTitle,
  suggestContext,
  isSuggestingContext,
  isFieldVisible,
  unitTab,
  setUnitTab,
  isAnalyzingTemplate,
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
  resetSessionData,
  clearFiles
}) => {
  const onTabChange = (tab: 'upload' | 'current') => {
    setUnitTab(tab);
    if (tab === 'current') {
      resetSessionData();
    }
  };

  return (
    <div className="space-y-12">
      <section className="glass-panel rounded-[32px] p-8 space-y-6">
        <div className="flex p-1 bg-white/5 rounded-2xl mb-6">
          <button 
            onClick={() => onTabChange('upload')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              unitTab === 'upload' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Upload size={14} />
            Subir Unidad
          </button>
          <button 
            onClick={() => onTabChange('current')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              unitTab === 'current' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Calendar size={14} />
            Sesión Establecida
          </button>
        </div>

        {unitTab === 'upload' ? (
          <>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold transition-colors" style={{ color: 'var(--text-heading)' }}>
                    Subir Unidad de Aprendizaje
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sube tu unidad para que la IA extraiga la secuencia.
                  </p>
                </div>
              </div>
              
              {(data.unitFile || data.sessionSchemaFile) && (
                <button 
                  onClick={clearFiles}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                >
                  <Trash2 size={14} />
                  Limpiar Todo
                </button>
              )}
            </div>

            <div className="space-y-8">
              {/* STEP 1: SESSION NUMBER & GENDER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px]">1</span>
                    Nº de Sesión a extraer
                  </label>
                  <div className="relative group">
                    <input 
                      type="text"
                      name="sessionNumber"
                      value={data.sessionNumber}
                      onChange={handleInputChange}
                      placeholder="Ej: 1"
                      className="minimal-input w-full px-6 py-4 text-xl font-black border-emerald-500/20 focus:border-emerald-500/50 transition-all text-emerald-400 placeholder:text-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Indica qué sesión quieres que la IA busque en tu unidad.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px]">2</span>
                    Identidad del Docente
                  </label>
                  <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 h-[60px]">
                    <button 
                      onClick={() => setData(prev => ({ ...prev, teacherGender: 'male' }))}
                      className={cn(
                        "flex-1 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                        data.teacherGender === 'male' ? "bg-emerald-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      EL PROFESOR
                    </button>
                    <button 
                      onClick={() => setData(prev => ({ ...prev, teacherGender: 'female' }))}
                      className={cn(
                        "flex-1 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                        data.teacherGender === 'female' ? "bg-emerald-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      LA PROFESORA
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    La IA redactará la sesión en función a tu género.
                  </p>
                </div>
              </div>

              {/* STEP 2: UPLOAD UNIT */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px]">3</span>
                  Subir Unidad de Aprendizaje
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileUpload(e, 'UNIT')}
                  className="hidden"
                  id="unit-file-upload"
                />
                <label 
                  htmlFor="unit-file-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[24px] cursor-pointer transition-all duration-300 group relative overflow-hidden",
                    data.unitFile ? "bg-emerald-500/5 border-emerald-500/40" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-emerald-500/30"
                  )}
                >
                  {isAnalyzingTemplate && !data.sessionSchemaFile ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin text-emerald-400 w-5 h-5" />
                      <span className="text-xs font-bold text-emerald-400">Analizando Unidad...</span>
                    </div>
                  ) : data.unitFile ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-400 w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-emerald-100 block truncate max-w-[200px]">{data.unitFile.name}</span>
                        <span className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-widest">Unidad Cargada</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Upload className="text-slate-400 w-5 h-5" />
                      <span className="text-xs font-bold text-slate-300">Seleccionar Unidad (PDF/Word)</span>
                    </div>
                  )}
                </label>
              </div>

              {/* STEP 3: UPLOAD SCHEMA (OPTIONAL) */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-slate-700 text-slate-500 flex items-center justify-center text-[10px]">4</span>
                  Modelo de Sesión (Opcional)
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileUpload(e, 'SCHEMA')}
                  className="hidden"
                  id="schema-file-upload"
                />
                <label 
                  htmlFor="schema-file-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[24px] cursor-pointer transition-all duration-300 group relative overflow-hidden",
                    data.sessionSchemaFile ? "bg-blue-500/5 border-blue-500/40" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-blue-500/30"
                  )}
                >
                  {data.sessionSchemaFile ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <CheckCircle2 className="text-blue-400 w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-blue-100 block truncate max-w-[200px]">{data.sessionSchemaFile.name}</span>
                        <span className="text-[9px] text-blue-400/60 font-bold uppercase tracking-widest">Esquema Cargado</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <FileText className="text-slate-400 w-5 h-5" />
                      <span className="text-xs font-bold text-slate-300">Subir Esquema de Sesión</span>
                    </div>
                  )}
                </label>
                <p className="text-[9px] text-slate-600">
                  Si subes un esquema, la sesión se generará siguiendo ese formato específico.
                </p>
              </div>
            </div>
            
            {data.detectedSchema && (
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Campos Detectados:</p>
                <div className="flex flex-wrap gap-2">
                  {data.detectedSchema.detectedFields?.map((f: string) => (
                    <span key={f} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-medium border border-emerald-500/10">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold transition-colors" style={{ color: 'var(--text-heading)' }}>Sesión Establecida</h2>
                <p className="text-xs text-slate-500">Configura los detalles de la sesión actual de tu unidad.</p>
              </div>
            </div>
            
            <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título de la Unidad</label>
                <input 
                  type="text"
                  name="unit"
                  value={data.unit}
                  onChange={handleInputChange}
                  placeholder="Ej: Unidad 1"
                  className="minimal-input w-full"
                />
              </div>
              <p className="text-[10px] text-slate-600 italic">
                * Esta información se sincroniza con el formulario principal.
              </p>
            </div>
          </div>
        )}
      </section>

      <MySessionForm 
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
        primaryColor="emerald"
      />
    </div>
  );
};
