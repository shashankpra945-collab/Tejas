export type UserRole = 'PATIENT' | 'ASHA_WORKER' | 'DOCTOR' | 'SECURITY_OFFICER';

export type NavigationTab =
  | 'PATIENT_KIOSK'
  | 'BODY_MAP'
  | 'ADAPTIVE_QUESTIONING'
  | 'HARDWARE_VITALS'
  | 'AYUSH_PRAKRITI'
  | 'ANTI_HALLUCINATION'
  | 'PRESCRIPTION_OCR'
  | 'DOCTOR_WORKSTATION'
  | 'SECURITY_AUDIT'
  | 'MEDICINE_SCANNER'
  | 'PRESCRIPTION_ASSISTANT'
  | 'MEDICINE_SCHEDULE'
  | 'MEDICINE_INFO'
  | 'EMERGENCY_ASSIST';

export type LanguageDialect =
  | 'Hindi'
  | 'Bhojpuri'
  | 'Awadhi'
  | 'Braj'
  | 'Haryanvi'
  | 'Bengali'
  | 'Marathi'
  | 'Tamil'
  | 'Telugu'
  | 'Gujarati'
  | 'Punjabi'
  | 'Kannada'
  | 'Malayalam'
  | 'Odia'
  | 'English';

export interface EmergencyContactPerson {
  name: string;
  relationship: string;
  phone: string;
}

export interface DoctorContactPerson {
  name: string;
  specialty: string;
  clinic: string;
  phone: string;
  address?: string;
}

export interface ScannedMedicineRecord {
  id: string;
  scannedAt: string;
  imageUrl?: string;
  medicineName: string;
  genericName: string;
  strength: string;
  formType: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops' | 'Powder / Churna';
  manufacturer: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  isExpired: boolean;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  openCvFiltersApplied: string[];
  ocrConfidence: number;
  notes?: string;
  extractedRawText?: string;
  verifiedByDoctorOrUser?: boolean;
}

export interface PrescriptionTimelineItem {
  slot: 'Morning' | 'Afternoon' | 'Night';
  timeLabel: string;
  iconType: 'morning' | 'afternoon' | 'night';
  medicines: {
    name: string;
    dosage: string;
    relationToFood: 'Before Breakfast' | 'After Breakfast' | 'Before Lunch' | 'After Lunch' | 'Before Dinner' | 'After Dinner' | 'At Bedtime' | 'With Food';
    actionText: string;
    instructions: string;
    isUnclear?: boolean;
  }[];
}

export interface PrescriptionExplanationItem {
  id: string;
  prescriptionId?: string;
  generatedAt: string;
  doctorName?: string;
  doctorSpecialty?: string;
  prescribedMedicines: {
    medicineName: string;
    genericFormula?: string;
    dosage: string;
    timingSummary: string;
    mealTiming: 'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach';
    frequency: 'Once Daily (OD)' | 'Twice Daily (BD)' | 'Thrice Daily (TDS)' | 'As Needed (SOS)' | 'Four Times Daily (QID)';
    duration: string;
    specialInstructions: string;
    timelineSlot: 'Morning' | 'Afternoon' | 'Night';
    isUnclear?: boolean;
  }[];
  timeline: PrescriptionTimelineItem[];
  disclaimer: string;
  verificationRequested: boolean;
  unclearItems?: string[];
}

export interface StoredMedicineInfo {
  id: string;
  name: string;
  genericName: string;
  purpose: string;
  prescribedDosage: string;
  patientInstructions: string;
  commonSideEffects: string[];
  importantWarnings: string[];
  interactions: {
    interactingDrug: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
    description: string;
  }[];
  allergiesAndContraindications: string[];
  previousPrescriptionCount: number;
  lastPrescribedDate: string;
  prescribedByDoctor: string;
  usageHistory: {
    date: string;
    event: string;
    notes: string;
  }[];
  isCurrentlyActive: boolean;
  source: 'DOCTOR_PRESCRIPTION' | 'SCANNER' | 'MANUAL_ENTRY';
}

export interface HospitalEmergencyFacility {
  id: string;
  name: string;
  type: 'Government Civil Hospital' | 'Trauma Center' | 'Community Health Centre' | 'Private Super-Specialty';
  distanceKm: number;
  address: string;
  city: string;
  is24x7Emergency: boolean;
  phone: string;
  alternatePhone?: string;
  latitude: number;
  longitude: number;
  directionsUrl: string;
  icuAvailable: boolean;
  bloodBankAvailable: boolean;
  ambulanceAvailable: boolean;
}

export interface DoctorEmergencyListing {
  id: string;
  name: string;
  specialization: string;
  clinic: string;
  phone: string;
  address: string;
  city: string;
  availableHours: string;
  isAvailableNow: boolean;
  consultationType: 'Walk-in & Emergency' | 'On-Call' | 'Tele-Consultation';
}

export interface PatientProfile {
  id: string;
  abhaId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  phoneNumber?: string;
  district: string;
  state: string;
  dialect: LanguageDialect;
  literacyLevel: 'Non-literate (Visual/Voice only)' | 'Semi-literate' | 'Literate';
  isSensitiveMode: boolean;
  registeredAt: string;
  pastVisitsCount: number;
  visitHistory?: LongitudinalVisitNode[];
  currentAdherenceSchedule?: MedicationAdherenceItem[];
  longitudinalAdherenceSummary?: LongitudinalAdherenceSummary;
  bloodGroup?: string;
  knownAllergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: EmergencyContactPerson;
  primaryDoctorContact?: DoctorContactPerson;
  storedMedicines?: StoredMedicineInfo[];
  scannedMedicineRecords?: ScannedMedicineRecord[];
  prescriptionExplanations?: PrescriptionExplanationItem[];
  activeIntakeComplaint?: string;
  extractedOcrText?: string;
  ocrFindingsSummary?: string;
  clinicalAnalysis?: IntakeSessionAnalysis;
  onePageDoctorSummary?: ClinicalPatientSummary;
}

export type MedicationDoseStatus = 'TAKEN' | 'MISSED' | 'DELAYED' | 'SKIPPED' | 'SNOOZED';

export interface MedicationDoseLog {
  date: string;
  dayOfWeek: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  status: MedicationDoseStatus;
  loggedAt?: string;
  notes?: string;
}

export interface MedicationAdherenceItem {
  id: string;
  medicationName: string;
  genericFormula: string;
  category?: 'Hypertension' | 'Diabetes' | 'Acid Peptic Disease' | 'Arthritis / AYUSH' | 'Respiratory' | 'Cardiology' | 'Antibiotic / Infection' | 'General' | string;
  dosageRegimen: string;
  dosage?: string;
  timing: string;
  mealRelation?: 'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach' | string;
  frequency: string;
  duration?: string;
  specialInstructions?: string;
  startDate: string;
  durationDays: number;
  totalPrescribedDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherencePercent: number;
  adherenceTier: 'HIGH_ADHERENCE' | 'MODERATE_ADHERENCE' | 'CRITICAL_NON_COMPLIANCE';
  primaryNonComplianceReason?: 'Forgetfulness' | 'Side Effects / Gastric Pain' | 'Felt Better / Stopped Early' | 'Financial / Pharmacy Stock' | 'Complex Regimen' | 'None' | string;
  recentDailyLogs: MedicationDoseLog[];
  refillDueInDays: number;
  isChronic: boolean;
  remindersEnabled?: boolean;
  doctorInterventionNotes?: string;
  prescribedByVisitId?: string;
}

export interface LongitudinalAdherenceSummary {
  overallAdherenceRate: number;
  activePrescriptionCount: number;
  highComplianceCount: number;
  moderateComplianceCount: number;
  criticalNonComplianceCount: number;
  nonComplianceRiskFlag: boolean;
  adherenceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  lastComplianceCheckDate: string;
  topBarriers: string[];
}

export type BodyRegionId =
  | 'head'
  | 'eyes'
  | 'ears'
  | 'throat'
  | 'chest'
  | 'stomach'
  | 'upper_back'
  | 'spine_lower_back'
  | 'hips_pelvis'
  | 'limbs_joints'
  | 'skin'
  | 'pelvis_sensitive'
  | 'eyes_ent'
  | 'back';

export interface SymptomItem {
  id: string;
  nameEn: string;
  nameHi: string;
  nameDialect?: string;
  bodyRegion: BodyRegionId;
  iconName: string;
  severityDefault: 'mild' | 'moderate' | 'severe';
  snomedCode: string;
  icd11Code: string;
  isRedFlagTrigger?: boolean;
  description: string;
}

export interface GisEnvironment {
  city: string;
  state: string;
  lat: number;
  lng: number;
  tempC: number;
  humidityPercent: number;
  aqi: number;
  aqiCategory: 'Good' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  activeOutbreaks: {
    disease: string;
    level: 'Moderate Alert' | 'High Alert' | 'Critical Outbreak';
    casesThisWeek: number;
    recommendedScreening: string;
  }[];
  season: 'Monsoon / Post-Monsoon' | 'Summer' | 'Winter';
}

export interface AdaptiveQuestion {
  id: string;
  questionNumber: number;
  questionEn: string;
  questionLocal: string;
  clinicalRationale: string;
  snomedCode: string;
  icd11Code: string;
  options: string[];
  selectedAnswer?: string;
  answeredAt?: string;
}

export interface RedFlagAssessment {
  isCriticalAlert: boolean;
  isRedFlagTriggered: boolean;
  triggeredRules: string[];
  severityScore: number; // 0 - 100
  priorityLevel: 'GREEN (Routine)' | 'YELLOW (Urgent)' | 'RED (Immediate Emergency)';
  ruleEngineSource: 'Deterministic WHO ETAT / Manchester' | 'ML Classifier + LLM Hybrid';
  alertPayload?: {
    emergencyType: string;
    recommendedImmediateAction: string;
    dispatchedTo: string;
    timestamp: string;
    bypassLLM: boolean;
  };
}

export interface AntiHallucinationDefense {
  layer1_RAG_RetrievedCorpus: {
    source: string;
    guidelineTitle: string;
    matchedParagraphSnippet: string;
    similarityScore: number;
  }[];
  layer2_GroundingCitation: string[];
  layer3_NeMoGuardrailStatus: 'PASSED' | 'BLOCKED_UNSAFE' | 'SUPPRESSED_UNVERIFIED';
  layer4_ConfidenceScore: number; // e.g. 0.95
  isApprovedForDisplay: boolean;
  humanReviewFlag: boolean;
}

export interface HardwareVitals {
  deviceId: string;
  deviceName: string;
  deviceType: 'BLE Omron BP Monitor' | 'BLE Contec Pulse Oximeter' | 'BLE Accu-Chek Glucometer' | 'BLE Digital Thermometer' | 'Nadi Pulse Wave Sensor';
  isConnected: boolean;
  batteryPercent: number;
  lastSyncTime: string;
  vitals: {
    systolicBP: number;
    diastolicBP: number;
    spo2Percent: number;
    pulseRateBpm: number;
    temperatureF: number;
    bloodGlucoseMgDl?: number;
    respiratoryRate?: number;
  };
  nadiWaveform: number[]; // real-time amplitude points
  hl7FhirObservationJson?: string;
}

export interface VaultSecurityState {
  isEncrypted: boolean;
  encryptionAlgorithm: 'AES-256-GCM';
  dataEncryptionKeyId: string;
  ephemeralSessionKeyExpiresInSeconds: number;
  activeRole: 'Patient (Self)' | 'Triage Nurse' | 'Doctor OPD' | 'Pharmacist' | 'EHR Administrator';
  auditTrailLogs: {
    timestamp: string;
    actor: string;
    role: string;
    action: string;
    resource: string;
    encryptionStatus: string;
    complianceStandard: 'DISHA / IT Act 2000 / ABDM M1-M3';
  }[];
}

export interface DrugOcrResult {
  rawOcr: string;
  standardizedName: string;
  cdscoId: string;
  similarityScore: number; // 0 - 100
  dosage: string;
  status: 'AUTO_VERIFIED' | 'NEEDS_PHARMACIST_REVIEW' | 'REJECTED';
}

export interface PrescriptionOcrState {
  imageUrl?: string;
  engine1_GoogleVision: { text: string; confidence: number };
  engine2_AzureDocAI: { text: string; confidence: number };
  engine3_GeminiVision: { text: string; confidence: number };
  consensusConfidence: number;
  extractedDrugs: DrugOcrResult[];
  pharmacistSignedOff: boolean;
  pharmacistReviewNotes?: string;
}

export interface PrakritiParikshaState {
  answers: Record<string, string>;
  isCompleted: boolean;
  primaryDosha: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Vata-Kapha' | 'Pitta-Kapha' | 'Tridoshic';
  vataPercent: number;
  pittaPercent: number;
  kaphaPercent: number;
  nadiGati: string;
  description: string;
  ayushRecommendations: {
    aharaDiet: string[];
    viharaLifestyle: string[];
    aushadhaHerbs: string[];
  };
  clinicalCorrelation: string;
}

export interface EvidenceFieldItem {
  id: string;
  category: 'Chief Complaint' | 'Onset & History' | 'GIS Epidemic Risk' | 'Vitals' | 'Prakriti Tag' | 'Prescription' | 'Triage Level';
  aiExtractedValue: string;
  evidenceSource: string;
  confidence: number;
  doctorAction: 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED';
  editedValue?: string;
  doctorNotes?: string;
}

export interface LongitudinalVisitNode {
  visitId: string;
  visitDate: string;
  opdDepartment: 'General Medicine' | 'AYUSH / Kayachikitsa' | 'Pulmonology' | 'Cardiology';
  chiefComplaint: string;
  vitalsSummary: string;
  triagePriority: 'GREEN' | 'YELLOW' | 'RED';
  prakritiDosha: string;
  doctorNotes: string;
  prescribedMeds: string[];
  adherenceScorePercent?: number;
  adherenceStatus?: 'EXCELLENT (>=90%)' | 'GOOD (75-89%)' | 'NEEDS_ATTENTION (50-74%)' | 'CRITICAL_POOR (<50%)';
  adherenceSchedule?: MedicationAdherenceItem[];
  complianceNotes?: string;
}

export interface ClinicalPatientSummary {
  patientInfo: {
    ageSex: string;
    backgroundInfo: string;
  };
  chiefComplaint: string;
  presentingSymptoms: {
    symptoms: string[];
    location: string;
    duration: string;
    severity: string;
    onsetProgression: string;
    associatedSymptoms: string[];
  };
  relevantHistory: {
    previousConditions: string;
    previousEpisodes: string;
    medications: string;
    allergies: string;
    familySocialHistory: string;
  };
  examinationFindings: {
    bodyRegionInfo: string;
    ocrReportFindings: string;
    patientReportedObservations: string;
    vitalsTelemetry?: string;
    otherCollectedInfo: string;
  };
  aiClinicalConcerns: {
    observations: string[]; // Clearly labeled as AI observations, not confirmed diagnosis
    patternsIdentified: string[];
  };
  redFlags: {
    hasEmergency: boolean;
    urgentSymptoms: string[];
    immediateActionRequired?: string;
  };
  missingImportantInformation: string[];
  recommendedNextStep: string;
  recommendedMedicines?: {
    medicineName: string;
    dosage: string;
    timing: string;
    mealRelation: string;
    frequency: string;
    duration: string;
    specialInstructions?: string;
  }[];
  uploadedDocuments?: UploadedMedicalDocument[];
  patientAnswersSummary?: { question: string; answer: string; time?: string }[];
  consultationStatus?: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  generatedAt: string;
  isDoctorVerified?: boolean;
}

export interface UploadedMedicalDocument {
  id: string;
  name: string;
  type?: 'Prescription' | 'Lab Report' | 'Scan / Imaging' | 'Discharge Summary' | 'Other Document' | string;
  documentType?: 'PRESCRIPTION' | 'LAB_REPORT' | 'SCAN_REPORT' | 'DISCHARGE_SUMMARY' | 'OTHER' | string;
  uploadDate: string;
  fileSize?: string;
  previewUrl?: string;
  ocrExtractedText?: string;
  ocrTextSnippet?: string;
  extractedSummary?: string;
  keyFindings?: string[];
}

export interface IntakeSessionAnalysis {
  understoodChiefComplaint: string;
  clinicalInformation: {
    duration: string;
    severity: string;
    location: string;
    onset: string;
    associatedSymptoms: string[];
    reportedHistory: string;
    reportedMedications: string;
    reportedAllergies: string;
  };
  missingInformation: string[];
  sufficientInfoCollected: boolean;
  emergencyDetected: boolean;
  emergencyGuidance?: string;
  nextFollowUpQuestion?: {
    english: string;
    local: string;
    clinicalRationale: string;
    snomedCode?: string;
    icd11Code?: string;
    suggestedOptions: string[];
  };
  patientReportedFacts: string[];
  aiObservations: string[];
  requiresDoctorConfirmation: string[];
}

