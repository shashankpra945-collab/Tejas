import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  Sparkles,
  Shield,
  FileCheck,
  Stethoscope,
  Leaf,
  Layers,
  Search,
  Lock,
  ChevronRight,
  AlertOctagon,
  Users,
  Compass,
  MapPin,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import {
  UserRole,
  NavigationTab,
  PatientProfile,
  GisEnvironment,
  SymptomItem,
  HardwareVitals,
  AdaptiveQuestion,
  PrakritiParikshaState,
  RedFlagAssessment,
  LongitudinalVisitNode,
  MedicationAdherenceItem,
  MedicationDoseStatus,
  ScannedMedicineRecord,
  StoredMedicineInfo,
  PrescriptionExplanationItem,
  ClinicalPatientSummary,
  IntakeSessionAnalysis,
  UploadedMedicalDocument,
} from './types';
import { GIS_PRESET_CITIES, SYMPTOM_CATALOG } from './data/medicalCorpus';
import {
  getStoredPatients,
  appendVisitToPatientRecord,
  INITIAL_PATIENTS,
  createCleanEmptyPatient,
  clearAllPatientSessionData,
  updateMedicationDoseStatus,
  saveDoctorAdherenceIntervention,
  addMedicationToPatientSchedule,
  addMultipleMedicationsToPatientSchedule,
  saveScannedMedicineToPatient,
  addStoredMedicineToPatient,
  savePrescriptionExplanationToPatient,
  snoozeMedicationDose,
  recordActiveMedicationDose,
  updateMedicationInPatientSchedule,
  deleteMedicationFromPatientSchedule,
  toggleMedicationReminder,
} from './data/patientRegistry';
import { assessTriageRules } from './utils/deterministicRuleEngine';
import { Navbar } from './components/Navbar';
import { BodyMapSelector } from './components/BodyMapSelector';
import { AdaptiveQuestioningView } from './components/AdaptiveQuestioningView';
import { HardwareVitalsBridge } from './components/HardwareVitalsBridge';
import { AntiHallucinationView } from './components/AntiHallucinationView';
import { AyushPrakritiView } from './components/AyushPrakritiView';
import { PrescriptionOcrView } from './components/PrescriptionOcrView';
import { DoctorWorkstation } from './components/DoctorWorkstation';
import { SecurityAuditView } from './components/SecurityAuditView';
import { RedFlagAlertModal } from './components/RedFlagAlertModal';
import { PatientRegistryModal } from './components/PatientRegistryModal';
import { MedicineScannerView } from './components/MedicineScannerView';
import { PrescriptionAssistantView } from './components/PrescriptionAssistantView';
import { MedicineReminderScheduleView } from './components/MedicineReminderScheduleView';
import { MedicineInfoDatabaseView } from './components/MedicineInfoDatabaseView';
import { EmergencyView } from './components/EmergencyView';

export function App() {
  // Navigation & Role States
  const [currentRole, setCurrentRole] = useState<UserRole>('ASHA_WORKER');
  const [activeTab, setActiveTab] = useState<NavigationTab>('BODY_MAP');

  // Dark Mode Theme State with Persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('arogya_theme_dark');
      if (saved !== null) return saved === 'true';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('arogya_theme_dark', isDarkMode ? 'true' : 'false');
    } catch {
      // Storage access restricted
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // GIS Context State
  const [gisContext, setGisContext] = useState<GisEnvironment>(GIS_PRESET_CITIES[0]); // Surat (Dengue outbreak active)

  // Registered Patients List & Active Patient Profile State
  const [allPatients, setAllPatients] = useState<PatientProfile[]>(() => {
    const stored = getStoredPatients();
    if (stored.length > 0) return stored;
    const cleanDefault = createCleanEmptyPatient('Hindi');
    return [cleanDefault];
  });
  const [patient, setPatient] = useState<PatientProfile>(() => {
    const list = getStoredPatients();
    return list[0] || createCleanEmptyPatient('Hindi');
  });
  const [isPatientRegistryOpen, setIsPatientRegistryOpen] = useState(false);

  // Clinical Data States (Starts completely clean & unpolluted)
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomItem[]>([]);

  const [vitals, setVitals] = useState<HardwareVitals['vitals']>({
    systolicBP: 0,
    diastolicBP: 0,
    spo2Percent: 0,
    pulseRateBpm: 0,
    temperatureF: 0,
    bloodGlucoseMgDl: 0,
  });

  const [adaptiveQuestionsHistory, setAdaptiveQuestionsHistory] = useState<AdaptiveQuestion[]>([]);

  const [prakritiState, setPrakritiState] = useState<PrakritiParikshaState>({
    isCompleted: false,
    primaryDosha: '',
    vataPercent: 0,
    pittaPercent: 0,
    kaphaPercent: 0,
    nadiGati: '',
    description: '',
    ayushRecommendations: {
      aharaDiet: [],
      viharaLifestyle: [],
      aushadhaHerbs: [],
    },
    clinicalCorrelation: '',
  });

  const [extractedOcrText, setExtractedOcrText] = useState<string>('');
  const [patientReportedText, setPatientReportedText] = useState<string>('');
  const [bodyRegionSelected, setBodyRegionSelected] = useState<string>('chest');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedMedicalDocument[]>([]);
  const [currentClinicalAnalysis, setCurrentClinicalAnalysis] = useState<IntakeSessionAnalysis | null>(null);
  const [currentDoctorSummary, setCurrentDoctorSummary] = useState<ClinicalPatientSummary | null>(null);

  // Auto-cache active session into localStorage for remote rural resilience
  useEffect(() => {
    try {
      const activeSessionData = {
        timestamp: new Date().toISOString(),
        patient,
        selectedSymptoms,
        vitals,
        adaptiveQuestionsHistory,
        prakritiState,
      };
      localStorage.setItem('arogyamitra_active_session_cache', JSON.stringify(activeSessionData));
    } catch (e) {
      console.warn('LocalStorage session auto-cache failed:', e);
    }
  }, [patient, selectedSymptoms, vitals, adaptiveQuestionsHistory, prakritiState]);

  // Deterministic Red Flag Assessment (Calculated in real-time)
  const redFlagAssessment: RedFlagAssessment = assessTriageRules(
    selectedSymptoms,
    vitals,
    gisContext
  );

  const [isRedFlagModalOpen, setIsRedFlagModalOpen] = useState(false);

  // Auto-prompt Red Flag alert when critical red flag conditions are met
  const isRedFlagActive = redFlagAssessment.isRedFlagTriggered;

  // Symptom Toggling Handler
  const handleToggleSymptom = (symptom: SymptomItem) => {
    setSelectedSymptoms((prev) => {
      const exists = prev.some((s) => s.id === symptom.id);
      if (exists) {
        return prev.filter((s) => s.id !== symptom.id);
      } else {
        const next = [...prev, symptom];
        // If critical symptom added, trigger modal
        if (symptom.isRedFlagTrigger) {
          setIsRedFlagModalOpen(true);
        }
        return next;
      }
    });
  };

  const handleClearSymptoms = () => {
    setSelectedSymptoms([]);
  };

  const handleAddAnsweredQuestion = (q: AdaptiveQuestion) => {
    setAdaptiveQuestionsHistory((prev) => [...prev, q]);
  };

  // Patient Check-in and Deduplication Handlers
  const handleSelectPatientForCheckup = (selected: PatientProfile, isNewVisitSession: boolean = true) => {
    setPatient(selected);
    if (isNewVisitSession) {
      // Clear live intake forms to record a fresh follow-up consultation
      setSelectedSymptoms([]);
      setAdaptiveQuestionsHistory([]);
      setExtractedOcrText('');
      setCurrentClinicalAnalysis(null);
      setCurrentDoctorSummary(null);
      setVitals({
        systolicBP: 0,
        diastolicBP: 0,
        spo2Percent: 0,
        pulseRateBpm: 0,
        temperatureF: 0,
        bloodGlucoseMgDl: 0,
      });
      setPrakritiState({
        isCompleted: false,
        primaryDosha: '',
        vataPercent: 0,
        pittaPercent: 0,
        kaphaPercent: 0,
        nadiGati: '',
        description: '',
        ayushRecommendations: {
          aharaDiet: [],
          viharaLifestyle: [],
          aushadhaHerbs: [],
        },
        clinicalCorrelation: '',
      });
    }
  };

  const handleStartCleanPatientSession = () => {
    const freshPat = createCleanEmptyPatient(patient.dialect || 'Hindi');
    setPatient(freshPat);
    setSelectedSymptoms([]);
    setAdaptiveQuestionsHistory([]);
    setExtractedOcrText('');
    setPatientReportedText('');
    setBodyRegionSelected('chest');
    setUploadedDocuments([]);
    setCurrentClinicalAnalysis(null);
    setCurrentDoctorSummary(null);
    setVitals({
      systolicBP: 0,
      diastolicBP: 0,
      spo2Percent: 0,
      pulseRateBpm: 0,
      temperatureF: 0,
      bloodGlucoseMgDl: 0,
    });
    setPrakritiState({
      isCompleted: false,
      primaryDosha: '',
      vataPercent: 0,
      pittaPercent: 0,
      kaphaPercent: 0,
      nadiGati: '',
      description: '',
      ayushRecommendations: {
        aharaDiet: [],
        viharaLifestyle: [],
        aushadhaHerbs: [],
      },
      clinicalCorrelation: '',
    });
    setActiveTab('BODY_MAP');
    try {
      localStorage.removeItem('arogyamitra_active_session_cache');
    } catch {
      // storage
    }
  };

  const handleResetAllData = () => {
    clearAllPatientSessionData();
    const freshPat = createCleanEmptyPatient('Hindi');
    setAllPatients([freshPat]);
    setPatient(freshPat);
    setSelectedSymptoms([]);
    setAdaptiveQuestionsHistory([]);
    setExtractedOcrText('');
    setPatientReportedText('');
    setBodyRegionSelected('chest');
    setUploadedDocuments([]);
    setCurrentClinicalAnalysis(null);
    setCurrentDoctorSummary(null);
    setVitals({
      systolicBP: 0,
      diastolicBP: 0,
      spo2Percent: 0,
      pulseRateBpm: 0,
      temperatureF: 0,
      bloodGlucoseMgDl: 0,
    });
    setPrakritiState({
      isCompleted: false,
      primaryDosha: '',
      vataPercent: 0,
      pittaPercent: 0,
      kaphaPercent: 0,
      nadiGati: '',
      description: '',
      ayushRecommendations: {
        aharaDiet: [],
        viharaLifestyle: [],
        aushadhaHerbs: [],
      },
      clinicalCorrelation: '',
    });
    setActiveTab('BODY_MAP');
  };

  const handleRegisterNewPatient = (newPat: PatientProfile) => {
    setAllPatients((prev) => [newPat, ...prev.filter((p) => p.id !== newPat.id)]);
    setPatient(newPat);
    setSelectedSymptoms([]);
    setAdaptiveQuestionsHistory([]);
    setExtractedOcrText('');
    setPatientReportedText('');
    setBodyRegionSelected('chest');
    setUploadedDocuments([]);
    setCurrentClinicalAnalysis(null);
    setCurrentDoctorSummary(null);
    setVitals({
      systolicBP: 0,
      diastolicBP: 0,
      spo2Percent: 0,
      pulseRateBpm: 0,
      temperatureF: 0,
      bloodGlucoseMgDl: 0,
    });
  };

  const handleCommitVisit = (newVisit: LongitudinalVisitNode) => {
    const { updatedPatient, updatedPatientsList } = appendVisitToPatientRecord(
      patient.id,
      newVisit,
      allPatients
    );
    setPatient(updatedPatient);
    setAllPatients(updatedPatientsList);
  };

  const handleUpdateDoseStatus = (medicationId: string, logIndex: number, newStatus: MedicationDoseStatus) => {
    const { updatedPatient, updatedPatientsList } = updateMedicationDoseStatus(
      patient.id,
      medicationId,
      logIndex,
      newStatus,
      allPatients
    );
    setPatient(updatedPatient);
    setAllPatients(updatedPatientsList);
  };

  const handleSaveDoctorIntervention = (medicationId: string, notes: string) => {
    const { updatedPatient, updatedPatientsList } = saveDoctorAdherenceIntervention(
      patient.id,
      medicationId,
      notes,
      allPatients
    );
    setPatient(updatedPatient);
    setAllPatients(updatedPatientsList);
  };

  const handleAddMedication = (newMed: MedicationAdherenceItem | MedicationAdherenceItem[]) => {
    setAllPatients((prevAll) => {
      const items = Array.isArray(newMed) ? newMed : [newMed];
      const { updatedPatient, updatedPatientsList } = addMultipleMedicationsToPatientSchedule(
        patient.id,
        items,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleSaveScannedMedicine = (record: ScannedMedicineRecord) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = saveScannedMedicineToPatient(
        patient.id,
        record,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleAddStoredMedicine = (medInfo: StoredMedicineInfo) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = addStoredMedicineToPatient(
        patient.id,
        medInfo,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleSavePrescriptionSchedule = (explanation: PrescriptionExplanationItem) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = savePrescriptionExplanationToPatient(
        patient.id,
        explanation,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleSnoozeDose = (medicationId: string, minutes: number) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = snoozeMedicationDose(
        patient.id,
        medicationId,
        minutes,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleEditMedication = (medId: string, updatedFields: Partial<MedicationAdherenceItem>) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = updateMedicationInPatientSchedule(
        patient.id,
        medId,
        updatedFields,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleDeleteMedication = (medId: string) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = deleteMedicationFromPatientSchedule(
        patient.id,
        medId,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  const handleToggleMedicationReminder = (medId: string) => {
    setAllPatients((prevAll) => {
      const { updatedPatient, updatedPatientsList } = toggleMedicationReminder(
        patient.id,
        medId,
        prevAll
      );
      setPatient(updatedPatient);
      return updatedPatientsList;
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Universal Top Header & Context Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gisContext={gisContext}
        onGisChange={setGisContext}
        patient={patient}
        onPatientChange={setPatient}
        redFlagActive={isRedFlagActive}
        onOpenPatientRegistry={() => setIsPatientRegistryOpen(true)}
        onStartCleanSession={handleStartCleanPatientSession}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Patient Intake: Step 1 - Body Map & Voice */}
        {activeTab === 'BODY_MAP' && (
          <BodyMapSelector
            patient={patient}
            gisContext={gisContext}
            selectedSymptoms={selectedSymptoms}
            onToggleSymptom={handleToggleSymptom}
            onClearSymptoms={handleClearSymptoms}
            onProceedToQuestioning={(payload) => {
              if (payload?.patientText) setPatientReportedText(payload.patientText);
              if (payload?.bodyRegion) setBodyRegionSelected(payload.bodyRegion);
              setActiveTab('ADAPTIVE_QUESTIONING');
            }}
            isRedFlagActive={isRedFlagActive}
          />
        )}

        {/* AI Medicine Scanner (OpenCV + Vision OCR) */}
        {activeTab === 'MEDICINE_SCANNER' && (
          <MedicineScannerView
            patient={patient}
            onSaveMedicineRecord={handleSaveScannedMedicine}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Prescription Assistant & Schedule Explainer */}
        {activeTab === 'PRESCRIPTION_ASSISTANT' && (
          <PrescriptionAssistantView
            patient={patient}
            onSaveScheduleToPatient={handleSavePrescriptionSchedule}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Medicine Reminder System & Dose Tracking */}
        {activeTab === 'MEDICINE_SCHEDULE' && (
          <MedicineReminderScheduleView
            patient={patient}
            onUpdateDoseStatus={(medId, status, slot) => {
              setAllPatients((prevAll) => {
                const { updatedPatient, updatedPatientsList } = recordActiveMedicationDose(
                  patient.id,
                  medId,
                  status,
                  prevAll,
                  slot
                );
                setPatient(updatedPatient);
                return updatedPatientsList;
              });
            }}
            onSnoozeDose={handleSnoozeDose}
            onAddMedication={handleAddMedication}
            onEditMedication={handleEditMedication}
            onDeleteMedication={handleDeleteMedication}
            onToggleReminder={handleToggleMedicationReminder}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* AI Medicine Information Database */}
        {activeTab === 'MEDICINE_INFO' && (
          <MedicineInfoDatabaseView
            patient={patient}
            onAddMedicineToPatient={handleAddStoredMedicine}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Emergency Assistance Page (SOS, Hospitals, Doctors, Profile) */}
        {activeTab === 'EMERGENCY_ASSIST' && (
          <EmergencyView patient={patient} onNavigateToTab={setActiveTab} />
        )}

        {/* Patient Intake: Step 2 - Adaptive GIS Questioning & Intelligent Analysis */}
        {activeTab === 'ADAPTIVE_QUESTIONING' && (
          <AdaptiveQuestioningView
            patient={patient}
            gisContext={gisContext}
            selectedSymptoms={selectedSymptoms}
            questionsHistory={adaptiveQuestionsHistory}
            bodyRegion={bodyRegionSelected}
            freeTextInput={patientReportedText}
            ocrText={extractedOcrText}
            vitals={vitals}
            clinicalAnalysis={currentClinicalAnalysis}
            doctorSummary={currentDoctorSummary}
            uploadedDocuments={uploadedDocuments}
            onUpdateUploadedDocuments={setUploadedDocuments}
            onUpdateAnalysis={(analysis, summary) => {
              setCurrentClinicalAnalysis(analysis);
              setCurrentDoctorSummary(summary);
            }}
            onAddAnsweredQuestion={handleAddAnsweredQuestion}
            onProceedToVitals={() => setActiveTab('HARDWARE_VITALS')}
            onViewDoctorSummary={() => setActiveTab('DOCTOR_WORKSTATION')}
          />
        )}

        {/* Patient Intake: Step 3 - Prescription & Doc OCR */}
        {activeTab === 'PRESCRIPTION_OCR' && (
          <PrescriptionOcrView
            initialOcrText={extractedOcrText}
            onUpdateExtractedOcr={(text) => setExtractedOcrText(text)}
            onProceedToAnalysis={() => setActiveTab('ADAPTIVE_QUESTIONING')}
          />
        )}

        {/* Patient Intake: Step 4 - AYUSH Prakriti Pariksha */}
        {activeTab === 'AYUSH_PRAKRITI' && (
          <AyushPrakritiView
            patient={patient}
            prakritiState={prakritiState}
            onUpdatePrakriti={setPrakritiState}
          />
        )}

        {/* Patient Intake: Step 5 - Hardware Vitals & FHIR Bridge */}
        {activeTab === 'HARDWARE_VITALS' && (
          <HardwareVitalsBridge
            patient={patient}
            selectedSymptoms={selectedSymptoms}
            vitals={vitals}
            onUpdateVitals={setVitals}
            prakriti={prakritiState}
          />
        )}

        {/* Doctor OPD Workstation */}
        {activeTab === 'DOCTOR_WORKSTATION' && (
          <DoctorWorkstation
            patient={patient}
            gisContext={gisContext}
            selectedSymptoms={selectedSymptoms}
            vitals={vitals}
            adaptiveHistory={adaptiveQuestionsHistory}
            prakritiState={prakritiState}
            redFlagData={redFlagAssessment}
            onePageSummary={currentDoctorSummary}
            onUpdateOnePageSummary={(summary) => setCurrentDoctorSummary(summary)}
            patientReportedText={patientReportedText}
            bodyRegionSelected={bodyRegionSelected}
            uploadedDocuments={uploadedDocuments}
            ocrText={extractedOcrText}
            onCommitVisit={handleCommitVisit}
            onUpdateDoseStatus={handleUpdateDoseStatus}
            onSaveDoctorIntervention={handleSaveDoctorIntervention}
            onAddNewMedication={handleAddMedication}
          />
        )}

        {/* 4-Layer Safety & Anti-Hallucination */}
        {activeTab === 'ANTI_HALLUCINATION' && <AntiHallucinationView />}

        {/* Security & Cryptographic Merkle Root Audit */}
        {activeTab === 'SECURITY_AUDIT' && (
          <SecurityAuditView patient={patient} vitals={vitals} />
        )}
      </main>

      {/* ABDM Unified Patient Registry & Deduplication Modal */}
      <PatientRegistryModal
        isOpen={isPatientRegistryOpen}
        onClose={() => setIsPatientRegistryOpen(false)}
        activePatient={patient}
        allPatients={allPatients}
        onSelectPatientForCheckup={handleSelectPatientForCheckup}
        onRegisterNewPatient={handleRegisterNewPatient}
      />

      {/* Emergency Red Flag Alert Modal (Zero Latency Deterministic Bypass) */}
      <RedFlagAlertModal
        isOpen={isRedFlagModalOpen}
        onClose={() => setIsRedFlagModalOpen(false)}
        redFlagData={redFlagAssessment}
        patient={patient}
        gisContext={gisContext}
      />

      {/* Footer / Tele-Triage System Bar */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              <strong>ArogyaMitra (MediKiosk)</strong> • National Health Mission & Ministry of Ayush
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>ABDM Sandbox: <strong>ACTIVE (M1-M3)</strong></span>
            <span>FHIR Profile: <strong>HL7 R4 IN-Core</strong></span>
            <span>AI Safety: <strong>4-Layer Guardrails</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
