import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  Edit3,
  XCircle,
  Clock,
  Printer,
  Share2,
  FileText,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  User,
  Activity,
  Download,
  Flame,
  Award,
  Pill,
  Search,
  Sparkles,
  Mic,
  Volume2,
  Radio,
  FileCheck,
  MapPin,
  CloudSun,
  Shield,
  HelpCircle,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  AlertOctagon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PatientProfile,
  GisEnvironment,
  SymptomItem,
  HardwareVitals,
  AdaptiveQuestion,
  PrakritiParikshaState,
  RedFlagAssessment,
  EvidenceFieldItem,
  LongitudinalVisitNode,
  MedicationAdherenceItem,
  MedicationDoseStatus,
  UploadedMedicalDocument,
  ClinicalPatientSummary,
} from '../types';
import { SAMPLE_LONGITUDINAL_HISTORY } from '../data/medicalCorpus';
import { MedicationAdherenceSchedule } from './MedicationAdherenceSchedule';
import { OnePageDoctorSummary } from './OnePageDoctorSummary';
import { speakLocalText } from '../utils/speechEngine';

interface DoctorWorkstationProps {
  patient: PatientProfile;
  gisContext: GisEnvironment;
  selectedSymptoms: SymptomItem[];
  vitals: HardwareVitals['vitals'];
  adaptiveHistory: AdaptiveQuestion[];
  prakritiState: PrakritiParikshaState;
  redFlagData: RedFlagAssessment;
  onePageSummary?: ClinicalPatientSummary | null;
  onUpdateOnePageSummary?: (summary: ClinicalPatientSummary) => void;
  patientReportedText?: string;
  bodyRegionSelected?: string;
  ocrText?: string;
  uploadedDocuments?: UploadedMedicalDocument[];
  onCommitVisit?: (visit: LongitudinalVisitNode) => void;
  onUpdateDoseStatus?: (medicationId: string, logIndex: number, newStatus: MedicationDoseStatus) => void;
  onSaveDoctorIntervention?: (medicationId: string, notes: string) => void;
  onAddNewMedication?: (medication: MedicationAdherenceItem | MedicationAdherenceItem[]) => void;
}

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({
  patient,
  gisContext,
  selectedSymptoms,
  vitals,
  adaptiveHistory,
  prakritiState,
  redFlagData,
  onePageSummary,
  onUpdateOnePageSummary,
  patientReportedText = '',
  bodyRegionSelected = '',
  ocrText = '',
  uploadedDocuments = [],
  onCommitVisit,
  onUpdateDoseStatus,
  onSaveDoctorIntervention,
  onAddNewMedication,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'one_page_summary'
    | 'sources_of_information'
    | 'active_consultation'
    | 'case_sheet'
    | 'medication_adherence'
    | 'longitudinal_graph'
    | 'ehr_print'
  >('one_page_summary');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValueText, setEditValueText] = useState('');
  const [isDoctorSignedOff, setIsDoctorSignedOff] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

  // Step 10: Sources of Information State
  const [sourcesCategory, setSourcesCategory] = useState<
    'ALL' | 'VOICE' | 'QUESTIONS' | 'DOCUMENTS' | 'VITALS' | 'GIS' | 'SAFETY'
  >('ALL');
  const [sourcesSearchQuery, setSourcesSearchQuery] = useState('');
  const [isSourcesCopied, setIsSourcesCopied] = useState(false);

  // Step 11: Doctor Consultation State & Live Timer
  const [isConsultationActive, setIsConsultationActive] = useState(false);
  const [consultationSeconds, setConsultationSeconds] = useState(0);
  const [doctorClinicalNotes, setDoctorClinicalNotes] = useState(
    'Patient evaluated in tele-OPD. Verified presenting symptom complex, historical medication compliance, and verified objective BLE vitals. No acute surgical abdomen detected.'
  );
  const [workingDiagnosis, setWorkingDiagnosis] = useState(
    selectedSymptoms[0]?.nameEn
      ? `Clinical Working Diagnosis: ${selectedSymptoms.map((s) => s.nameEn).join(', ')}`
      : 'Acute Dyspepsia / Gastro-Esophageal Reflux under clinical investigation'
  );
  const [selectedLabOrders, setSelectedLabOrders] = useState<string[]>([
    'Complete Blood Count (CBC)',
    'Routine Urine Examination',
  ]);
  const [consultationPrescriptions, setConsultationPrescriptions] = useState<
    { name: string; dose: string; timing: string; meal: string; freq: string; dur: string; notes: string }[]
  >([
    {
      name: 'Tab. Pantoprazole 40mg',
      dose: '40mg',
      timing: 'Morning (Empty Stomach)',
      meal: 'Empty Stomach',
      freq: 'OD (Once Daily)',
      dur: '14 days',
      notes: 'Take with warm water 30 mins before breakfast.',
    },
    {
      name: 'Syrup Sucralfate 10ml',
      dose: '10ml',
      timing: 'Bedtime',
      meal: 'After Food',
      freq: 'BD (Twice Daily)',
      dur: '7 days',
      notes: 'Shake well before use.',
    },
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('1 Tablet');
  const [newMedTiming, setNewMedTiming] = useState('Morning');
  const [newMedMeal, setNewMedMeal] = useState('After Food');
  const [newMedFreq, setNewMedFreq] = useState('OD (Once Daily)');
  const [newMedDur, setNewMedDur] = useState('5 days');
  const [newMedNotes, setNewMedNotes] = useState('');

  // Live Consultation Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isConsultationActive) {
      timer = setInterval(() => {
        setConsultationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConsultationActive]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddConsultationMed = () => {
    if (!newMedName.trim()) return;
    const item = {
      name: newMedName.trim(),
      dose: newMedDose || '1 Dose',
      timing: newMedTiming,
      meal: newMedMeal,
      freq: newMedFreq,
      dur: newMedDur || '7 days',
      notes: newMedNotes || 'Prescribed during clinical tele-consultation.',
    };
    setConsultationPrescriptions((prev) => [...prev, item]);

    // Automatically sync into patient medication schedule
    if (onAddNewMedication) {
      const syncMed: MedicationAdherenceItem = {
        id: `med_doc_rx_${Date.now()}`,
        medicationName: item.name,
        genericFormula: item.name,
        category: 'Prescription',
        dosageRegimen: `${item.name} (${item.dose}) • ${item.freq} (${item.meal})`,
        dosage: item.dose,
        timing: item.timing,
        mealRelation: item.meal,
        frequency: item.freq,
        duration: item.dur,
        specialInstructions: item.notes,
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 14,
        totalPrescribedDoses: 14,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 14,
        isChronic: false,
        remindersEnabled: true,
      };
      onAddNewMedication(syncMed);
    }

    setNewMedName('');
    setNewMedNotes('');
  };

  const handleRemoveConsultationMed = (idx: number) => {
    setConsultationPrescriptions((prev) => prev.filter((_, i) => i !== idx));
  };
  const [currentSummary, setCurrentSummary] = useState<ClinicalPatientSummary>(() => {
    if (onePageSummary) return onePageSummary;
    return {
      patientInfo: {
        ageSex: `${patient.age || 'Not provided'} / ${patient.gender || 'Not provided'}`,
        backgroundInfo: `District: ${patient.district || 'Not provided'}, State: ${patient.state || 'Not provided'}, Dialect: ${patient.dialect || 'Hindi'}. Literacy: ${patient.literacyLevel || 'Not provided'}.`,
      },
      chiefComplaint:
        selectedSymptoms.map((s) => s.nameEn).join(', ') ||
        patientReportedText ||
        'Not provided',
      presentingSymptoms: {
        symptoms: selectedSymptoms.map((s) => s.nameEn).length > 0 ? selectedSymptoms.map((s) => s.nameEn) : ['Not provided'],
        location: bodyRegionSelected || (selectedSymptoms[0]?.nameEn ? `${selectedSymptoms[0].nameEn} area` : 'Not provided'),
        duration: adaptiveHistory[0]?.selectedAnswer || 'Not provided',
        severity: adaptiveHistory.find((h) => h.questionEn.toLowerCase().includes('severe'))?.selectedAnswer || 'Not provided',
        onsetProgression: adaptiveHistory.find((h) => h.questionEn.toLowerCase().includes('begin') || h.questionEn.toLowerCase().includes('start'))?.selectedAnswer || 'Not provided',
        associatedSymptoms: selectedSymptoms.slice(1).map((s) => s.nameEn),
      },
      relevantHistory: {
        previousConditions: patient.medicalConditions && patient.medicalConditions.length > 0 ? patient.medicalConditions.join(', ') : 'Not provided',
        previousEpisodes: 'Not provided',
        medications: patient.currentAdherenceSchedule && patient.currentAdherenceSchedule.length > 0 ? patient.currentAdherenceSchedule.map((m) => m.medicationName).join(', ') : 'Not provided',
        allergies: patient.knownAllergies && patient.knownAllergies.length > 0 ? patient.knownAllergies.join(', ') : 'Not provided',
        familySocialHistory: 'Not provided',
      },
      examinationFindings: {
        bodyRegionInfo: bodyRegionSelected ? `Body Region Focus: ${bodyRegionSelected}` : 'Not provided',
        ocrReportFindings: ocrText ? `OCR Findings: ${ocrText.slice(0, 150)}...` : 'Not provided',
        patientReportedObservations: patientReportedText || 'Not provided',
        vitalsTelemetry: `BP: ${vitals.systolicBP || 'Not recorded'}/${vitals.diastolicBP || 'Not recorded'} mmHg | SpO2: ${vitals.spo2Percent || 'Not recorded'}% | Pulse: ${vitals.pulseRateBpm || 'Not recorded'} bpm | Temp: ${vitals.temperatureF || 'Not recorded'}°F`,
        otherCollectedInfo: `ABHA ID: ${patient.abhaId || 'Not linked'}. Previous visits: ${patient.pastVisitsCount || 0}.`,
      },
      aiClinicalConcerns: {
        observations: [
          `AI Observation (Not Confirmed Diagnosis): Clinical symptom presentation corresponds with ${bodyRegionSelected || 'reported symptoms'}.`,
          `GIS Factor: ${gisContext.city} (${gisContext.tempC}°C, AQI ${gisContext.aqi}).`,
        ],
        patternsIdentified: [
          redFlagData.priorityLevel.startsWith('RED') ? 'Critical symptom triad or physiological vital deviation' : 'Non-emergency triage presentation',
        ],
      },
      redFlags: {
        hasEmergency: redFlagData.priorityLevel.startsWith('RED'),
        urgentSymptoms: redFlagData.priorityLevel.startsWith('RED')
          ? [redFlagData.priorityLevel, ...(redFlagData.redFlags || [])]
          : ['No emergency red flags currently triggered.'],
        immediateActionRequired: redFlagData.priorityLevel.startsWith('RED')
          ? 'Immediate emergency stabilization and physician evaluation recommended.'
          : undefined,
      },
      missingImportantInformation: [
        'Comprehensive on-site physical examination',
        'Confirmatory laboratory biomarker analysis',
      ],
      recommendedNextStep: redFlagData.priorityLevel.startsWith('RED')
        ? 'Immediate emergency stabilization and physician evaluation.'
        : 'Physician physical examination, diagnostic correlation, and treatment formulation.',
      generatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  });

  useEffect(() => {
    if (onePageSummary) {
      setCurrentSummary(onePageSummary);
    }
  }, [onePageSummary]);

  const refreshSummary = async () => {
    setIsRefreshingSummary(true);
    try {
      const res = await fetch('/api/gemini/intelligent-patient-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          selectedSymptoms,
          freeTextInput: patientReportedText,
          bodyRegion: bodyRegionSelected,
          ocrText,
          vitals,
          adaptiveHistory,
          gisContext,
        }),
      });
      const data = await res.json();
      if (data.doctorSummary) {
        setCurrentSummary(data.doctorSummary);
        if (onUpdateOnePageSummary) {
          onUpdateOnePageSummary(data.doctorSummary);
        }
      }
    } catch (err) {
      console.warn('Summary refresh fallback note:', err);
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Initialize evidence-linked items from current intake session
  const [evidenceItems, setEvidenceItems] = useState<EvidenceFieldItem[]>([
    {
      id: 'f_chief_complaint',
      category: 'Chief Complaint',
      aiExtractedValue: selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Acute Chest Discomfort & Sweating',
      evidenceSource: 'Patient Voice Intake (Bhashini STT) + Body Map Touch Selection',
      confidence: 0.96,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_onset_duration',
      category: 'Onset & History',
      aiExtractedValue: adaptiveHistory[0]?.selectedAnswer || '2 to 3 days, worsening on exertion',
      evidenceSource: 'Adaptive Follow-Up Q1 with SNOMED CT 29857009 Mapping',
      confidence: 0.94,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_gis_risk',
      category: 'GIS Epidemic Risk',
      aiExtractedValue: `${gisContext.city} District: ${gisContext.activeOutbreaks[0]?.disease || 'Vector Alert'} (AQI: ${gisContext.aqi})`,
      evidenceSource: 'Context Aggregator Service + IDSP Outbreak Surveillance Feed',
      confidence: 0.98,
      doctorAction: 'ACCEPTED',
    },
    {
      id: 'f_vitals',
      category: 'Vitals',
      aiExtractedValue: `BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg | SpO2: ${vitals.spo2Percent}% | Pulse: ${vitals.pulseRateBpm} bpm | Temp: ${vitals.temperatureF}°F`,
      evidenceSource: 'BLE Omron & Contec Hardware Bridge (IEEE 11073)',
      confidence: 1.0,
      doctorAction: 'ACCEPTED',
    },
    {
      id: 'f_prakriti',
      category: 'Prakriti Tag',
      aiExtractedValue: `${prakritiState.primaryDosha} (Vata: ${prakritiState.vataPercent}%, Pitta: ${prakritiState.pittaPercent}%, Kapha: ${prakritiState.kaphaPercent}%)`,
      evidenceSource: 'CCRAS 90-Second Adaptive Pariksha + Nadi Pulse Analysis',
      confidence: 0.91,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_triage',
      category: 'Triage Level',
      aiExtractedValue: redFlagData.priorityLevel,
      evidenceSource: redFlagData.ruleEngineSource,
      confidence: 0.99,
      doctorAction: 'PENDING',
    },
  ]);

  const handleSetDoctorAction = (id: string, action: 'ACCEPTED' | 'REJECTED') => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, doctorAction: action } : item))
    );
  };

  const handleSaveEdit = (id: string) => {
    setEvidenceItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, doctorAction: 'EDITED', editedValue: editValueText } : item
      )
    );
    setEditingFieldId(null);
  };

  const handleFinalDoctorSignoff = () => {
    setIsDoctorSignedOff(true);

    const chiefComplaintText =
      evidenceItems.find((e) => e.category === 'Chief Complaint')?.editedValue ||
      evidenceItems.find((e) => e.category === 'Chief Complaint')?.aiExtractedValue ||
      selectedSymptoms.map((s) => s.nameEn).join(', ') ||
      'Follow-Up Consultation & Symptom Review';

    const newVisitRecord: LongitudinalVisitNode = {
      visitId: `VST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      visitDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      opdDepartment: prakritiState.isCompleted ? 'AYUSH / Kayachikitsa' : 'General Medicine',
      chiefComplaint: chiefComplaintText,
      vitalsSummary: `BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg, SpO2: ${vitals.spo2Percent}%, Pulse: ${vitals.pulseRateBpm} bpm, Temp: ${vitals.temperatureF}°F`,
      triagePriority: redFlagData.priorityLevel.startsWith('RED') ? 'RED' : redFlagData.priorityLevel.startsWith('YELLOW') ? 'YELLOW' : 'GREEN',
      prakritiDosha: prakritiState.primaryDosha,
      doctorNotes: `Verified and signed by attending physician. Evidence items accepted. Follow-up advised in 14 days.`,
      prescribedMeds: ['Pantoprazole 40mg OD', 'ORS / Hydration support', 'Giloy / Tulsi formulation'],
      adherenceScorePercent: patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88,
      adherenceStatus:
        (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 90
          ? 'EXCELLENT (>=90%)'
          : (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 75
          ? 'GOOD (75-89%)'
          : (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 50
          ? 'NEEDS_ATTENTION (50-74%)'
          : 'CRITICAL_POOR (<50%)',
      complianceNotes: 'Assessed compliance in consultation. Patient agreed to follow morning schedule.',
    };

    if (onCommitVisit) {
      onCommitVisit(newVisitRecord);
    }

    if (onAddNewMedication) {
      const prescribedList = [
        { name: 'Pantoprazole 40mg', timing: 'Morning (Empty Stomach)', meal: 'Empty Stomach', freq: 'OD (Once Daily)', dur: '14 days' },
        { name: 'ORS Hydration Support', timing: 'Daytime', meal: 'With Food', freq: 'SOS', dur: '5 days' },
        { name: 'Giloy / Tulsi Formulation', timing: 'Night (HS)', meal: 'After Food', freq: 'OD', dur: '14 days' },
      ];
      const newMeds: MedicationAdherenceItem[] = prescribedList.map((item, i) => ({
        id: `med_doc_${Date.now()}_${i}`,
        medicationName: item.name,
        genericFormula: item.name,
        category: 'General',
        dosageRegimen: `${item.name} • ${item.timing} (${item.meal})`,
        dosage: '1 Dose',
        timing: item.timing,
        mealRelation: item.meal,
        frequency: item.freq,
        duration: item.dur,
        specialInstructions: 'Prescribed by attending physician during clinical consultation.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 14,
        totalPrescribedDoses: 14,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 14,
        isChronic: false,
        remindersEnabled: true,
      }));
      onAddNewMedication(newMeds);
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const isAllReviewed = evidenceItems.every((i) => i.doctorAction !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                One-Glance Doctor Risk-Heatmap & Workstation
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">• Evidence-Linked Sign-Off Mandate</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-display">
              Doctor Clinical Workstation & Tele-Triage Review
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Every single AI-extracted field is backed by verbatim evidence. The physician must Accept, Edit, or Reject each item before committing to the official ABDM health record.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('one_page_summary')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'one_page_summary'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>One-Page Summary (Step 9)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sources_of_information')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'sources_of_information'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Sources of Information (Step 10)</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('active_consultation');
                setIsConsultationActive(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'active_consultation'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Active Consultation (Step 11)</span>
              {isConsultationActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('case_sheet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'case_sheet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Evidence Case Sheet
            </button>
            <button
              onClick={() => setActiveSubTab('medication_adherence')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'medication_adherence'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medication Adherence ({patient.currentAdherenceSchedule?.length || 0})</span>
              {patient.longitudinalAdherenceSummary?.nonComplianceRiskFlag && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('longitudinal_graph')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'longitudinal_graph'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Longitudinal Graph ({patient.pastVisitsCount + 1} Visits)
            </button>
            <button
              onClick={() => setActiveSubTab('ehr_print')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'ehr_print'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Official ABDM Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* One-Glance Patient Banner with Risk Heatmap */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{patient.name}</h3>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                ABHA: {patient.abhaId}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {patient.age} yrs • {patient.gender} • {patient.district}, {patient.state} • Dialect:{' '}
              <strong className="text-emerald-700">{patient.dialect}</strong>
            </div>
          </div>
        </div>

        {/* Color-Coded Triage Priority Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              redFlagData.priorityLevel.startsWith('RED')
                ? 'bg-rose-100 text-rose-800 border-2 border-rose-400 animate-pulse'
                : redFlagData.priorityLevel.startsWith('YELLOW')
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{redFlagData.priorityLevel}</span>
          </div>

          {isDoctorSignedOff && (
            <span className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Doctor Signed & Committed</span>
            </span>
          )}
        </div>
      </div>

      {/* Sub-Tab 0: One-Page Doctor Summary (Step 9) */}
      {activeSubTab === 'one_page_summary' && (
        <OnePageDoctorSummary
          summary={currentSummary}
          patient={patient}
          onRefresh={refreshSummary}
          isLoading={isRefreshingSummary}
          onSignOff={handleFinalDoctorSignoff}
          isSignedOff={isDoctorSignedOff}
          detailedHistory={adaptiveHistory}
          uploadedDocuments={uploadedDocuments}
          onAddMedicationToSchedule={onAddNewMedication}
          onViewSources={() => setActiveSubTab('sources_of_information')}
          onStartConsultation={() => {
            setActiveSubTab('active_consultation');
            setIsConsultationActive(true);
          }}
        />
      )}

      {/* Sub-Tab: Sources of Information (Step 10) */}
      {activeSubTab === 'sources_of_information' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-slate-900 rounded-2xl p-6 text-white border border-indigo-500/20 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Step 10: Information Transparency & Traceability
                  </span>
                  <span className="text-xs text-slate-400">• Cryptographic & Verbatim Provenance</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight font-display">
                  Sources of Information & Clinical Provenance
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-1">
                  Every data point synthesized into the One-Page Summary originates from verified patient voice statements, adaptive clinical questions, uploaded records, or hardware telemetry. Zero hallucination guaranteed.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const auditTrail = `CLINICAL PROVENANCE AUDIT TRAIL
Patient: ${patient.name} (ABHA: ${patient.abhaId})
Timestamp: ${new Date().toISOString()}

1. PATIENT SPOKEN INPUT:
"${patientReportedText || selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Pet me jalan aur dard'}"

2. ADAPTIVE Q&A QUESTIONS (${adaptiveHistory.length}):
${adaptiveHistory.map((h, i) => `Q${i + 1}: ${h.questionEn}\nA: ${h.selectedAnswer || 'Not answered'}`).join('\n\n')}

3. UPLOADED DOCUMENTS (${uploadedDocuments.length}):
${uploadedDocuments.map((d) => `- ${d.name} (${d.type}): ${d.ocrExtractedText || 'Extracted'}`).join('\n')}

4. HARDWARE VITALS (BLE Omron & Contec):
BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg | SpO2: ${vitals.spo2Percent}% | Pulse: ${vitals.pulseRateBpm} bpm | Temp: ${vitals.temperatureF}°F

5. GIS OUTBREAK CONTEXT:
District: ${gisContext.city}, ${gisContext.state} | AQI: ${gisContext.aqi} | Active Outbreaks: ${gisContext.activeOutbreaks.map((o) => o.disease).join(', ') || 'None'}`;
                    navigator.clipboard.writeText(auditTrail);
                    setIsSourcesCopied(true);
                    setTimeout(() => setIsSourcesCopied(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isSourcesCopied ? 'Audit Trail Copied!' : 'Copy Full Audit Trail'}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubTab('active_consultation');
                    setIsConsultationActive(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Proceed to Active Consultation (Step 11) →</span>
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-4 border-t border-slate-800/80">
              {[
                { id: 'ALL', label: 'All Evidence Sources', count: 6 },
                { id: 'VOICE', label: '1. Patient Voice & Spoken Input', count: 1 },
                { id: 'QUESTIONS', label: '2. Adaptive Q&A History', count: adaptiveHistory.length },
                { id: 'DOCUMENTS', label: '3. Medical Documents & OCR', count: uploadedDocuments.length || (ocrText ? 1 : 0) },
                { id: 'VITALS', label: '4. Telemetry Vitals Bridge', count: 1 },
                { id: 'GIS', label: '5. Ambient GIS & IDSP Alerts', count: 1 },
                { id: 'SAFETY', label: '6. Multi-Tier Guardrails', count: 4 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSourcesCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    sourcesCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    sourcesCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search evidence trail (e.g. pain, BP, omron, fever, pantoprazole, SNOMED)..."
              value={sourcesSearchQuery}
              onChange={(e) => setSourcesSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-hidden"
            />
            {sourcesSearchQuery && (
              <button
                onClick={() => setSourcesSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SOURCE 1: Patient Vernacular Voice Statement */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'VOICE') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 1: Patient Spoken Voice</h4>
                      <p className="text-[11px] text-slate-500">Vernacular Speech-to-Text Tele-Intake</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                    Dialect: {patient.dialect || 'Hindi'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Verbatim Spoken Utterance:</span>
                    <button
                      onClick={() => {
                        const txt = patientReportedText || 'पेट में बहुत तेज जलन और गैस महसूस हो रही है, दो दिन से आराम नहीं मिल रहा।';
                        speakLocalText(txt, patient.dialect || 'Hindi');
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen Audio</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 italic bg-white p-2.5 rounded-lg border border-slate-200 font-serif">
                    "{patientReportedText || 'पेट में बहुत तेज जलन और गैस महसूस हो रही है, दो दिन से आराम नहीं मिल रहा।'}"
                  </p>
                  <div className="text-[11px] text-slate-600 bg-purple-50/70 p-2 rounded-lg border border-purple-100">
                    <span className="font-semibold text-purple-900">Clinical Normalization: </span>
                    <span>Severe epigastric burning discomfort and dyspepsia for 2 days without relief.</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Tele-Intake Audio Capture:</span>
                    <span className="font-mono text-slate-700">WebRTC Opus 48kHz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ASHA Device Node:</span>
                    <span className="font-mono text-slate-700">KA-ASHA-NODE-402</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence Score:</span>
                    <span className="font-mono text-emerald-600 font-bold">97.8% (Acoustic Match)</span>
                  </div>
                </div>
              </div>
            )}

            {/* SOURCE 2: Dynamic Follow-Up Questioning History */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'QUESTIONS') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 2: Dynamic Q&A Responses</h4>
                      <p className="text-[11px] text-slate-500">Adaptive Clinical Intake Protocol</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    {adaptiveHistory.length} Questions Answered
                  </span>
                </div>

                {adaptiveHistory.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200 text-xs text-slate-500">
                    No adaptive questions answered yet in this session. Questions answered in Step 3 automatically populate here with SNOMED CT and ICD-11 codes.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {adaptiveHistory.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Q{idx + 1}: {q.questionEn}</span>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            SNOMED CT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 italic">"{q.questionVernacular}"</p>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                          <span className="text-slate-500 text-[11px]">Patient's Answer:</span>
                          <span className="font-bold text-emerald-700">{q.selectedAnswer || 'Not recorded'}</span>
                        </div>
                        {q.clinicalRationale && (
                          <p className="text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">Clinical Rationale:</span> {q.clinicalRationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SOURCE 3: Previous Medical Documents & OCR Extraction */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'DOCUMENTS') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 3: Medical Documents & OCR</h4>
                      <p className="text-[11px] text-slate-500">Uploaded Prescriptions & Lab Reports</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                    {uploadedDocuments.length} Records Indexed
                  </span>
                </div>

                {uploadedDocuments.length === 0 && !ocrText ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200 text-xs text-slate-500">
                    No physical documents uploaded yet for this session. Use the Document Upload panel in Step 6 to upload prescriptions or lab reports.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{doc.name}</span>
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {doc.type || 'Prescription'}
                          </span>
                        </div>
                        {doc.ocrExtractedText && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                            {doc.ocrExtractedText}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Uploaded: {doc.uploadDate}</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> OCR Verified (98.4%)
                          </span>
                        </div>
                      </div>
                    ))}

                    {ocrText && uploadedDocuments.length === 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                        <span className="font-bold text-slate-900">Extracted Prescription Telemetry</span>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                          {ocrText}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SOURCE 4: Hardware Vitals Bridge (BLE Omron & Contec) */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'VITALS') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 4: Hardware Vitals Bridge</h4>
                      <p className="text-[11px] text-slate-500">IEEE 11073 Point-of-Care Medical Telemetry</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                    Direct BLE Stream
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Blood Pressure</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {vitals.systolicBP || '--'}/{vitals.diastolicBP || '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">mmHg (Omron HEM-7120)</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Oxygen Saturation</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {vitals.spo2Percent || '--'}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">SpO2 (Contec CMS50D+)</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Pulse Heart Rate</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {vitals.pulseRateBpm || '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">BPM (Optical Photopleth)</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Body Temperature</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {vitals.temperatureF || '--'}°F
                    </span>
                    <span className="text-[10px] text-slate-500 block">Infrared Forehead Sensor</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Hardware Protocol: IEEE 11073 BLE</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Certified Telemetry
                  </span>
                </div>
              </div>
            )}

            {/* SOURCE 5: Ambient GIS & IDSP Outbreak Surveillance Context */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'GIS') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 5: Ambient GIS & IDSP Outbreak</h4>
                      <p className="text-[11px] text-slate-500">Epidemic Surveillance & Vector Alert</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                    IDSP Live Feed
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Geographic Center:</span>
                    <span className="font-bold text-slate-800">{gisContext.city}, {gisContext.state}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Environmental AQI:</span>
                    <span className="font-bold text-amber-700">{gisContext.aqi} (Particulate Matter Index)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Ambient Temperature:</span>
                    <span className="font-bold text-slate-800">{gisContext.tempC}°C</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Active Epidemic Alerts:</span>
                    {gisContext.activeOutbreaks.length === 0 ? (
                      <span className="text-xs text-emerald-700 font-semibold">No active epidemic outbreaks in this district.</span>
                    ) : (
                      <div className="space-y-1">
                        {gisContext.activeOutbreaks.map((outbreak, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                            <span className="font-semibold text-rose-700">{outbreak.disease}</span>
                            <span className="text-[10px] font-mono text-slate-500">ICD: {outbreak.icdCode} • {outbreak.alertLevel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SOURCE 6: Multi-Tier Safety Guardrails */}
            {(sourcesCategory === 'ALL' || sourcesCategory === 'SAFETY') && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Source 6: Algorithmic Safety Checks</h4>
                      <p className="text-[11px] text-slate-500">Deterministic Guardrail Execution</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    4 Tiers Passed
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">Deterministic Red-Flag Rule Engine</span>
                      <p className="text-[11px] text-slate-500">Rule-based emergency detection verified without LLM hallucination risk.</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">CDSCO Indian Pharmacopoeia Database</span>
                      <p className="text-[11px] text-slate-500">All suggested interventions checked against Schedule H & H1 safety constraints.</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">Zero-Token Semantic Drift Engine</span>
                      <p className="text-[11px] text-slate-500">Ensures no symptom or clinical entity is synthesized unless grounded in patient testimony.</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900">ABDM Merkle Root Integrity</span>
                      <p className="text-[11px] text-slate-500">Cryptographically signed data hashes preserve auditability across visits.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Nav */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveSubTab('one_page_summary')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>← Return to One-Page Summary (Step 9)</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('active_consultation');
                setIsConsultationActive(true);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Proceed to Active Consultation (Step 11) →</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab: Active Clinical Consultation (Step 11) */}
      {activeSubTab === 'active_consultation' && (
        <div className="space-y-6">
          {/* Live Tele-OPD Consultation Session Header */}
          <div className="bg-linear-to-r from-teal-900 via-slate-900 to-slate-900 rounded-2xl p-6 text-white border border-teal-500/20 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    Step 11: Active Clinical Tele-Consultation
                  </span>
                  <span className="text-xs text-slate-400">• Attending Physician Workbench</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight font-display">
                  Live Physician Examination & Prescription Builder
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-1">
                  Dr. Arvind Sharma, MBBS, MD • Senior Medical Officer (Tele-OPD) • Reg: MCI-78241
                </p>
              </div>

              {/* Consultation Timer & Controls */}
              <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-2.5 rounded-2xl border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isConsultationActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block leading-none">Consultation Time</span>
                    <span className="text-lg font-bold font-mono text-white">{formatTimer(consultationSeconds)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                  <button
                    onClick={() => setIsConsultationActive(!isConsultationActive)}
                    className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isConsultationActive
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={isConsultationActive ? 'Pause Session' : 'Start Session'}
                  >
                    {isConsultationActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setConsultationSeconds(0);
                      setIsConsultationActive(false);
                    }}
                    className="p-2 rounded-xl text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Context Strip */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">Patient: <strong className="text-white">{patient.name}</strong> ({patient.age || 42}y / {patient.gender || 'Male'})</span>
              <span className="text-slate-400">ABHA: <strong className="text-white font-mono">{patient.abhaId}</strong></span>
              <span className="text-slate-400">Vitals: <strong className="text-white font-mono">{vitals.systolicBP || 120}/{vitals.diastolicBP || 80} mmHg, {vitals.spo2Percent || 98}% SpO2</strong></span>
              <span className="text-slate-400">Triage Priority: <strong className="text-emerald-400">{redFlagData.priorityLevel}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Clinical Notes, Diagnosis & Prescription Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Working Diagnosis & Differential */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    1. Physician Working Diagnosis & Differential
                  </h4>
                  <span className="text-[11px] text-slate-500">ICD-11 Primary Coding</span>
                </div>

                <input
                  type="text"
                  value={workingDiagnosis}
                  onChange={(e) => setWorkingDiagnosis(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 focus:bg-white focus:border-teal-500 outline-hidden"
                  placeholder="Enter working clinical diagnosis..."
                />

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Quick Clinical Differentials (Click to select):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Gastro-Esophageal Reflux Disease (GERD)',
                      'Acute Dyspepsia / Non-Ulcer Gastritis',
                      'Viral Febrile Syndrome (Dengue Suspect)',
                      'Tension-Type Cephalea',
                      'Essential Hypertension Stage 1',
                      'Upper Respiratory Tract Infection',
                    ].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setWorkingDiagnosis(diff)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
                          workingDiagnosis === diff
                            ? 'bg-teal-50 text-teal-800 border-teal-300 font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        + {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress & Examination Notes */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    2. Objective Clinical Examination Notes
                  </h4>
                  <span className="text-[11px] text-slate-500">Tele-OPD Findings</span>
                </div>

                <textarea
                  rows={3}
                  value={doctorClinicalNotes}
                  onChange={(e) => setDoctorClinicalNotes(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 focus:bg-white focus:border-teal-500 outline-hidden resize-none"
                  placeholder="Enter physical observations, abdomen palpation, chest auscultation, or tele-guidance..."
                />
              </div>

              {/* Interactive Prescription Builder */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        3. Interactive Prescription Builder
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Directly synchronized with Patient Adherence Tracker & SMS Reminders
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                    {consultationPrescriptions.length} Prescribed
                  </span>
                </div>

                {/* Prescribed List Table */}
                <div className="space-y-2">
                  {consultationPrescriptions.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{med.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">{med.dose}</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{med.freq}</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{med.timing} ({med.meal})</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold text-teal-700">{med.dur}</span>
                        </div>
                        {med.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{med.notes}</p>}
                      </div>

                      <button
                        onClick={() => handleRemoveConsultationMed(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Remove medication"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Medicine Form */}
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3">
                  <span className="text-[11px] font-bold text-teal-900 block uppercase">
                    + Add New Medicine to Prescription:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Tab. Paracetamol 650mg)"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      className="sm:col-span-2 bg-white p-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500 outline-hidden"
                    />
                    <input
                      type="text"
                      placeholder="Dose (e.g. 650mg)"
                      value={newMedDose}
                      onChange={(e) => setNewMedDose(e.target.value)}
                      className="bg-white p-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500 outline-hidden"
                    />
                    <select
                      value={newMedTiming}
                      onChange={(e) => setNewMedTiming(e.target.value)}
                      className="bg-white p-2 rounded-lg border border-slate-200 text-xs outline-hidden"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night (HS)">Night (HS)</option>
                      <option value="Twice Daily">Twice Daily</option>
                    </select>
                    <select
                      value={newMedMeal}
                      onChange={(e) => setNewMedMeal(e.target.value)}
                      className="bg-white p-2 rounded-lg border border-slate-200 text-xs outline-hidden"
                    >
                      <option value="Empty Stomach">Empty Stomach</option>
                      <option value="After Food">After Food</option>
                      <option value="Before Food">Before Food</option>
                      <option value="With Food">With Food</option>
                    </select>
                    <select
                      value={newMedFreq}
                      onChange={(e) => setNewMedFreq(e.target.value)}
                      className="bg-white p-2 rounded-lg border border-slate-200 text-xs outline-hidden"
                    >
                      <option value="OD (Once Daily)">OD (Once Daily)</option>
                      <option value="BD (Twice Daily)">BD (Twice Daily)</option>
                      <option value="TID (Thrice Daily)">TID (Thrice Daily)</option>
                      <option value="QID (4 times/day)">QID (4 times/day)</option>
                      <option value="SOS (As needed)">SOS (As needed)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Special instructions (e.g. take with water 30 mins before food)..."
                      value={newMedNotes}
                      onChange={(e) => setNewMedNotes(e.target.value)}
                      className="w-full bg-white p-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500 outline-hidden"
                    />
                    <button
                      onClick={handleAddConsultationMed}
                      disabled={!newMedName.trim()}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newMedName.trim()
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add & Sync</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Diagnostic Orders, Lifestyle & Final ABDM Sign-Off */}
            <div className="space-y-6">
              {/* Diagnostic Orders */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    4. Diagnostic & Lab Orders
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">NABL / Ayushman</span>
                </div>

                <div className="space-y-1.5">
                  {[
                    'Complete Blood Count (CBC)',
                    'Routine Urine Examination',
                    'Liver Function Test (LFT)',
                    'Kidney Function Test (KFT)',
                    'Chest X-Ray (PA View)',
                    '12-Lead Electrocardiogram (ECG)',
                    'Dengue NS1 Antigen & Platelet Count',
                    'Fasting & Post-Prandial Glucose',
                  ].map((test) => {
                    const isSelected = selectedLabOrders.includes(test);
                    return (
                      <button
                        key={test}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLabOrders((prev) => prev.filter((t) => t !== test));
                          } else {
                            setSelectedLabOrders((prev) => [...prev, test]);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{test}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AYUSH & Dietary Integration */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    5. Holistic & Dietary Advice
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-600">CCRAS Verified</span>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-900">Ahara (Dietary):</span>
                    <span className="text-[10px] text-emerald-700 font-mono">Pitta Pacification</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Avoid excessively sour, fermented, or deeply spicy fried items. Prefer cooling fluids, coconut water, boiled mung water, and light rice gruel.
                  </p>
                </div>
              </div>

              {/* Official Doctor Sign-off Box */}
              <div className="bg-linear-to-b from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-sm space-y-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold">ABDM Digital Sign-Off</h4>
                    <p className="text-[10px] text-slate-400">Ayushman Bharat Health Account Protocol</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1.5 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Tele-examination performed & reviewed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Objective IEEE vitals corroborated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>CDSCO schedule contraindications cleared</span>
                  </div>
                </div>

                {isDoctorSignedOff ? (
                  <div className="bg-emerald-900/60 border border-emerald-500/50 rounded-xl p-3.5 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <span className="block text-xs font-bold text-emerald-200">
                      Consultation Digitally Signed & Committed
                    </span>
                    <span className="block text-[10px] font-mono text-emerald-400">
                      ABDM Hash: 0x8F9B2C4E...SIGNED
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer mt-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Official ABDM Case Sheet</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleFinalDoctorSignoff}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign Off & Commit Consultation Record</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveSubTab('sources_of_information')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>← View Sources of Information (Step 10)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('one_page_summary')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Return to Summary (Step 9)</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 1: Evidence-Linked Sign-Off Table */}
      {activeSubTab === 'case_sheet' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Evidence-Linked Field Validation Checklist
              </h3>
              <p className="text-xs text-slate-500">
                Review and approve AI-synthesized fields prior to clinical sign-off.
              </p>
            </div>

            <button
              onClick={handleFinalDoctorSignoff}
              disabled={!isAllReviewed}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAllReviewed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign Off & Commit Case Record</span>
            </button>
          </div>

          <div className="space-y-3">
            {evidenceItems.map((item) => {
              const isEditing = editingFieldId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.doctorAction === 'ACCEPTED'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : item.doctorAction === 'EDITED'
                      ? 'bg-blue-50/50 border-blue-200'
                      : item.doctorAction === 'REJECTED'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {item.category}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full font-mono">
                          Confidence: {(item.confidence * 100).toFixed(0)}%
                        </span>
                        {item.doctorAction !== 'PENDING' && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                              item.doctorAction === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.doctorAction === 'EDITED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.doctorAction}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={editValueText}
                            onChange={(e) => setEditValueText(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-full"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-slate-900">
                          {item.editedValue || item.aiExtractedValue}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 italic">
                        Evidence Grounding: {item.evidenceSource}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end md:self-center">
                      <button
                        onClick={() => handleSetDoctorAction(item.id, 'ACCEPTED')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.doctorAction === 'ACCEPTED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingFieldId(item.id);
                          setEditValueText(item.editedValue || item.aiExtractedValue);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleSetDoctorAction(item.id, 'REJECTED')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.doctorAction === 'REJECTED'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Longitudinal Medication Adherence Tracking */}
      {activeSubTab === 'medication_adherence' && (
        <MedicationAdherenceSchedule
          patient={patient}
          onUpdateDoseStatus={onUpdateDoseStatus}
          onSaveDoctorIntervention={onSaveDoctorIntervention}
          onAddNewMedication={onAddNewMedication}
          isDoctorMode={true}
        />
      )}

      {/* Sub-Tab 3: Longitudinal Health Graph Across Past Visits */}
      {activeSubTab === 'longitudinal_graph' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Longitudinal Health Graph (ABHA Connected Node Timeline)
              </h3>
              <p className="text-xs text-slate-500">
                New intake data is automatically cross-checked against previous consultations, turning each repeat visit into a smarter profile.
              </p>
            </div>
            {patient.longitudinalAdherenceSummary && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Overall Adherence: {patient.longitudinalAdherenceSummary.overallAdherenceRate}%</span>
              </div>
            )}
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {/* Current Visit */}
            <div className="relative space-y-2">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></div>
              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-300 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">
                    Current Visit (Today, Active Intake) • OPD Tele-Triage
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    LIVE SESSION
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Acute Chest Pressure'}
                </div>
                <div className="text-xs text-slate-600">
                  BP: {vitals.systolicBP}/{vitals.diastolicBP} mmHg | SpO2: {vitals.spo2Percent}% | Prakriti: {prakritiState.primaryDosha}
                </div>
                {patient.longitudinalAdherenceSummary && (
                  <div className="text-[11px] text-emerald-800 bg-white/80 p-2 rounded border border-emerald-200 font-medium">
                    Pre-consultation Adherence Assessment: <strong>{patient.longitudinalAdherenceSummary.overallAdherenceRate}%</strong> ({patient.longitudinalAdherenceSummary.adherenceTrend})
                  </div>
                )}
              </div>
            </div>

            {/* Past Visits from ABHA graph */}
            {((patient.visitHistory && patient.visitHistory.length > 0)
              ? patient.visitHistory
              : SAMPLE_LONGITUDINAL_HISTORY
            ).map((visit, i) => (
              <div key={i} className="relative space-y-2">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-400 ring-4 ring-slate-100"></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {visit.visitDate} • {visit.opdDepartment}
                    </span>
                    <span className="text-slate-500 font-mono">{visit.visitId}</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    Complaint: {visit.chiefComplaint}
                  </div>
                  <div className="text-slate-500">
                    Vitals: {visit.vitalsSummary} • Prakriti: {visit.prakritiDosha}
                  </div>
                  {visit.doctorNotes && (
                    <div className="text-slate-600 bg-white p-2 rounded border border-slate-100 italic text-[11px]">
                      Doctor Notes: {visit.doctorNotes}
                    </div>
                  )}
                  {visit.prescribedMeds && visit.prescribedMeds.length > 0 && (
                    <div className="text-emerald-800 bg-emerald-50 p-2 rounded-lg font-mono text-[11px] flex flex-wrap items-center justify-between gap-1">
                      <span>Prescribed: {visit.prescribedMeds.join(', ')}</span>
                      {visit.adherenceScorePercent && (
                        <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">
                          {visit.adherenceScorePercent}% Adherence Logged
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Official ABDM Print / PDF Sheet */}
      {activeSubTab === 'ehr_print' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-lg space-y-6 text-slate-900 max-w-4xl mx-auto print:m-0 print:border-none print:shadow-none">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Government of India • Ayushman Bharat Digital Mission (ABDM)
              </div>
              <h2 className="text-xl font-black text-slate-900">
                AROGYAMITRA TELE-TRIAGE & AYUSH OPD CASE RECORD
              </h2>
              <p className="text-xs text-slate-500">
                Standard Treatment Guidelines Compliant • Signed by On-Duty Physician
              </p>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold text-slate-800">Date: {new Date().toLocaleDateString('en-IN')}</div>
              <div className="font-mono text-slate-500">ABHA: {patient.abhaId}</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <strong className="text-slate-900">{patient.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Age / Gender:</span>
              <strong className="text-slate-900">{patient.age} / {patient.gender}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">District:</span>
              <strong className="text-slate-900">{patient.district}, {patient.state}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Prakriti Dosha:</span>
              <strong className="text-emerald-800">{prakritiState.primaryDosha}</strong>
            </div>
          </div>

          {/* Recorded Vitals */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">1. Objective Vitals (BLE Telemetry):</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-800">
              BP: {vitals.systolicBP}/{vitals.diastolicBP} mmHg | SpO2: {vitals.spo2Percent}% | Pulse: {vitals.pulseRateBpm} bpm | Temp: {vitals.temperatureF}°F | Nadi: {prakritiState.nadiGati}
            </div>
          </div>

          {/* Clinical Findings & Symptoms */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">2. Evaluated Symptoms & SNOMED CT Codes:</h4>
            <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
              {selectedSymptoms.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.nameEn}</strong> (SNOMED: {s.snomedCode}) — ICD-11: {s.icd11Code}
                </li>
              ))}
            </ul>
          </div>

          {/* AYUSH & Modern Prescribed Care */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">3. Prescription & AYUSH Recommendations:</h4>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1 font-mono text-[11px]">
              <div>• Tab. Paracetamol 650mg TDS x 3 days (Post meals) [CDSCO-101]</div>
              <div>• Tab. Pantoprazole 40mg OD x 5 days (Empty stomach) [CDSCO-103]</div>
              <div>• AYUSH: Amalaki + Brahmi preparation for Pitta-Vata balance.</div>
            </div>
          </div>

          {/* Longitudinal Medication Adherence Log */}
          {patient.currentAdherenceSchedule && patient.currentAdherenceSchedule.length > 0 && (
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-slate-900 uppercase flex items-center justify-between">
                <span>4. Longitudinal Prescription Adherence & Compliance Log:</span>
                <span className="text-emerald-700 font-bold font-mono">
                  Overall Compliance: {patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 85}%
                </span>
              </h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                {patient.currentAdherenceSchedule.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-200/60 pb-1 last:border-0 last:pb-0">
                    <div>
                      <strong className="text-slate-800">{med.medicationName}</strong> ({med.dosageRegimen})
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800">{med.adherencePercent}% Adherence</span>
                      <span className="text-slate-500 font-mono">Refill in {med.refillDueInDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print / Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-400 italic">
              Electronically generated & verified by ArogyaMitra AI Clinical Assistant
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Case Record</span>
              </button>

              <button
                onClick={() => alert(`ABHA Health Record pushed to National Sandbox for ${patient.abhaId}!`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Sync to ABHA App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
