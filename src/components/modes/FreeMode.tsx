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
  Loader2
} from 'lucide-react';
import { SessionData, SpecialNeedStudent } from '../../types';
import { cn } from '../../lib/utils';
import { MySessionForm } from './MySessionForm';

interface FreeModeProps {
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
}

export const FreeMode: React.FC<FreeModeProps> = ({
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
  savedLists
}) => {
  return (
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
      primaryColor="purple"
    />
  );
};
