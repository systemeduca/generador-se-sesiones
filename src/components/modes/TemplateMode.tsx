import React from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  Layout,
  FileUp
} from 'lucide-react';
import { SessionData, SpecialNeedStudent } from '../../types';
import { cn } from '../../lib/utils';
import { MySessionForm } from './MySessionForm';

interface TemplateModeProps {
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
  isAnalyzingTemplate: boolean;
  templateTab: 'SUBIR' | 'MI_SESION';
  setTemplateTab: (tab: 'SUBIR' | 'MI_SESION') => void;
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
}

export const TemplateMode: React.FC<TemplateModeProps> = ({
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
  isAnalyzingTemplate,
  templateTab,
  setTemplateTab,
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
  savedLists
}) => {
  return (
    <div className="space-y-12">
      <div className="flex justify-center mb-8">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setTemplateTab('SUBIR')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              templateTab === 'SUBIR' ? "bg-orange-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Upload size={16} /> SUBIR PLANTILLA
          </button>
          <button 
            onClick={() => setTemplateTab('MI_SESION')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              templateTab === 'MI_SESION' ? "bg-orange-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Layout size={16} /> MI SESIÓN
          </button>
        </div>
      </div>

      {templateTab === 'SUBIR' ? (
        <section className="glass-panel rounded-[32px] p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
              <FileUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold transition-colors" style={{ color: 'var(--text-heading)' }}>Plantilla Personalizada</h2>
              <p className="text-xs text-slate-500">Sube tu propio formato de sesión para que la IA lo aprenda.</p>
            </div>
          </div>

          <div className="relative">
            <input 
              type="file" 
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
              id="template-upload-mode"
            />
            <label 
              htmlFor="template-upload-mode"
              className={cn(
                "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[32px] cursor-pointer transition-all duration-300",
                data.templateFile ? "bg-orange-500/5 border-orange-500/50" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-orange-500/30"
              )}
            >
              {isAnalyzingTemplate ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-orange-400 w-8 h-8" />
                  <span className="text-sm font-bold text-orange-400">Analizando estructura...</span>
                </div>
              ) : data.templateFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-2">
                    <CheckCircle2 className="text-orange-400 w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-orange-200">{data.templateFile.name}</span>
                  <span className="text-xs text-orange-400/60">Plantilla cargada con éxito</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                    <Upload className="text-slate-400 w-7 h-7" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">Seleccionar Word (.docx)</span>
                  <span className="text-xs text-slate-500">Sube tu formato actual de sesión</span>
                </div>
              )}
            </label>
          </div>

          {data.detectedSchema && (
            <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-orange-400" size={16} />
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Estructura Detectada</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.detectedSchema.detectedFields?.map((f: string) => (
                  <span key={f} className="text-[10px] bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full font-medium border border-orange-500/10">{f}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
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
          primaryColor="orange"
        />
      )}
    </div>
  );
};
