export interface SessionData {
  teacherName: string;
  teacherGender: 'male' | 'female';
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
  generateActivities: boolean;
  generateApplication: boolean;
  schoolLogo?: string;
  templateFile?: {
    data: string;
    mimeType: string;
    name: string;
  };
  unitFile?: {
    data: string;
    mimeType: string;
    name: string;
  };
  sessionSchemaFile?: {
    data: string;
    mimeType: string;
    name: string;
  };
  detectedSchema?: {
    detectedFields: string[];
    structureDescription: string;
    customSections: { title: string; fields: string[] }[];
    mapping?: Record<string, string>;
    missingFields?: string[];
    hiddenStandardFields?: string[];
  };
  unitPurpose?: string;
  inclusion2026?: string;
  resources2026?: string;
  resources2026Custom?: string;
  diversity2026?: string;
  diversity2026Custom?: string;
  learningPurposeMode: 'auto' | 'manual';
  manualLearningPurpose: string;
  dynamicFieldsValues: Record<string, string>;
  moments: {
    inicio: SessionMoment;
    desarrollo: SessionMoment;
    cierre: SessionMoment;
  };
  learningTable: any[];
  transversalCompetencyData: any[];
  transversalApproachData: any[];
  learningGuide?: any;
  applicationSheet?: any;
  resources: any[];
  specialNeedsData: any[];
}

export interface SpecialNeedStudent {
  id: string;
  name: string;
  condition: string;
  activity: string;
}

export interface SessionMoment {
  activity: string;
  resources: string;
  time: string;
}
