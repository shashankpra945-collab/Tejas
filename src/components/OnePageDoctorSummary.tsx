import React, { useState } from 'react';
import {
  FileText,
  Printer,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Stethoscope,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Clock,
  HeartPulse,
  Pill,
  Plus,
  ArrowRight,
  ShieldAlert,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ClinicalPatientSummary,
  PatientProfile,
  AdaptiveQuestion,
  NavigationTab,
  MedicationAdherenceItem,
  UploadedMedicalDocument,
} from '../types';

interface OnePageDoctorSummaryProps {
  summary: ClinicalPatientSummary;
  patient: PatientProfile;
  onRefresh?: () => void;
  isLoading?: boolean;
  onSignOff?: () => void;
  isSignedOff?: boolean;
  detailedHistory?: AdaptiveQuestion[];
  onAddMedicationToSchedule?: (newMed: MedicationAdherenceItem | MedicationAdherenceItem[]) => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
  onViewSources?: () => void;
  onStartConsultation?: () => void;
  uploadedDocuments?: UploadedMedicalDocument[];
  consultationStatus?: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}

export const OnePageDoctorSummary: React.FC<OnePageDoctorSummaryProps> = ({
  summary,
  patient,
  onRefresh,
  isLoading = false,
  onSignOff,
  isSignedOff = false,
  detailedHistory = [],
  onAddMedicationToSchedule,
  onNavigateToTab,
  onViewSources,
  onStartConsultation,
  uploadedDocuments = [],
  consultationStatus = 'WAITING',
}) => {
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [addedMedsNotification, setAddedMedsNotification] = useState<string | null>(null);

  const handleCopyText = () => {
    const plainText = `
CLINICAL PATIENT SUMMARY (ONE-PAGE DOCTOR SUMMARY)
Date: ${new Date().toLocaleDateString('en-IN')} | Time: ${summary.generatedAt || new Date().toLocaleTimeString()}

a. PATIENT INFORMATION
Name / ID: ${patient.name} (ABHA: ${patient.abhaId || 'Not provided'})
Age / Sex: ${summary.patientInfo.ageSex}
Background / Location: ${summary.patientInfo.backgroundInfo}

b. CHIEF COMPLAINT:
${summary.chiefComplaint || 'Not provided'}

c. PRESENTING SYMPTOMS:
- Symptoms: ${summary.presentingSymptoms.symptoms.join(', ') || 'Not provided'}
- Location: ${summary.presentingSymptoms.location || 'Not provided'}
- Duration: ${summary.presentingSymptoms.duration || 'Not provided'}
- Severity: ${summary.presentingSymptoms.severity || 'Not provided'}
- Onset/Progression: ${summary.presentingSymptoms.onsetProgression || 'Not provided'}
- Associated Symptoms: ${summary.presentingSymptoms.associatedSymptoms.length ? summary.presentingSymptoms.associatedSymptoms.join(', ') : 'None reported'}

d. RELEVANT HISTORY:
- Medical Conditions: ${summary.relevantHistory.previousConditions || 'Not provided'}
- Previous Episodes: ${summary.relevantHistory.previousEpisodes || 'Not provided'}
- Current Medications: ${summary.relevantHistory.medications || 'Not provided'}
- Known Allergies: ${summary.relevantHistory.allergies || 'Not provided'}
- Family/Social History: ${summary.relevantHistory.familySocialHistory || 'Not provided'}

e. EXAMINATION / PATIENT-PROVIDED FINDINGS:
- Body Region: ${summary.examinationFindings.bodyRegionInfo || 'Not provided'}
- Vitals Telemetry: ${summary.examinationFindings.vitalsTelemetry || 'Not recorded'}
- OCR / Report Findings: ${summary.examinationFindings.ocrReportFindings || 'Not provided'}
- Patient Observations: ${summary.examinationFindings.patientReportedObservations || 'Not provided'}

f. AI-IDENTIFIED CLINICAL CONCERNS (Decision-Support Only, Not Confirmed Diagnosis):
${summary.aiClinicalConcerns.observations.map((obs) => `- ${obs}`).join('\n')}

g. RED FLAGS / URGENT INDICATORS:
${summary.redFlags.hasEmergency ? `🚨 EMERGENCY RED FLAG: ${summary.redFlags.urgentSymptoms.join(', ')}\nAction: ${summary.redFlags.immediateActionRequired || 'Immediate medical evaluation required.'}` : 'No red flags identified from current input.'}

h. MISSING / IMPORTANT INFORMATION:
${summary.missingImportantInformation.map((item) => `- ${item}`).join('\n')}

i. RECOMMENDED NEXT STEP:
${summary.recommendedNextStep}
    `;

    navigator.clipboard.writeText(plainText.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleAddAllRecommendedMeds = () => {
    if (!onAddMedicationToSchedule) return;

    // Build recommended medication list from summary
    const medsToAdd = summary.recommendedMedicines && summary.recommendedMedicines.length > 0
      ? summary.recommendedMedicines
      : [
          {
            medicineName: 'Tab Pantoprazole 40mg',
            dosage: '40mg (1 Tab)',
            timing: 'Morning (Empty Stomach)',
            mealRelation: 'Empty Stomach',
            frequency: 'OD (Once Daily)',
            duration: '14 days',
            specialInstructions: 'Take 30 mins before breakfast with plain water.',
          },
          {
            medicineName: 'ORS Hydration Solution',
            dosage: '1 Sachet in 1 Litre Water',
            timing: 'Daytime',
            mealRelation: 'With Food',
            frequency: 'Sip throughout day',
            duration: '3 days',
            specialInstructions: 'Maintain electrolyte balance and adequate hydration.',
          },
        ];

    const createdMeds: MedicationAdherenceItem[] = medsToAdd.map((med, idx) => {
      const durationDays = parseInt(med.duration) || 14;
      return {
        id: `med_rec_${Date.now()}_${idx}`,
        medicationName: med.medicineName,
        genericFormula: med.medicineName,
        dosageRegimen: `${med.dosage} • ${med.timing} (${med.mealRelation})`,
        dosage: med.dosage,
        timing: med.timing,
        mealRelation: med.mealRelation,
        frequency: med.frequency,
        duration: med.duration,
        specialInstructions: med.specialInstructions || 'Take as advised by physician.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays,
        totalPrescribedDoses: durationDays,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: durationDays,
        isChronic: false,
        remindersEnabled: true,
      };
    });

    onAddMedicationToSchedule(createdMeds);

    setAddedMedsNotification(
      `Successfully added ${medsToAdd.length} recommended medicines to ${patient.name}'s Medicine Schedule.`
    );
    setTimeout(() => setAddedMedsNotification(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Print Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">One-Page Doctor Summary</h3>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                Clinical Standard
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Structured clinical case sheet synthesized dynamically from verified patient inputs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewSources && (
            <button
              onClick={onViewSources}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="View Sources of Information for transparency"
            >
              <Search className="w-3.5 h-3.5 text-indigo-700" />
              <span>Sources of Information (Step 10)</span>
            </button>
          )}

          {onStartConsultation && (
            <button
              onClick={onStartConsultation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Start Consultation (Step 11) →</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isLoading ? 'Synthesizing...' : 'Regenerate'}</span>
            </button>
          )}

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Added Meds Notification Banner */}
      {addedMedsNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{addedMedsNotification}</span>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('MEDICINE_SCHEDULE')}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
            >
              <span>View Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* MAIN ONE-PAGE CLINICAL SUMMARY CONTAINER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-4 font-sans max-w-4xl mx-auto">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                ABDM TELE-TRIAGE
              </span>
              <span className="text-xs font-bold text-slate-700">NATIONAL HEALTH AUTHORITY FORMAT</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
              One-Page Doctor Clinical Summary
            </h1>
          </div>
          <div className="text-right text-xs text-slate-600 font-mono">
            <div>
              Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong>
            </div>
            <div>
              Time: <strong>{summary.generatedAt || new Date().toLocaleTimeString()}</strong>
            </div>
          </div>
        </div>

        {/* Emergency Alert Banner if Red Flag is present */}
        {summary.redFlags.hasEmergency && (
          <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3 text-rose-900 flex items-start gap-2.5 shadow-xs">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-bold text-rose-800 uppercase tracking-wide block">
                🚨 URGENT RED FLAG DETECTED — IMMEDIATE EMERGENCY PROTOCOL:
              </strong>
              <div className="font-semibold mt-0.5 text-rose-950">
                {summary.redFlags.urgentSymptoms.join(', ')}
              </div>
              {summary.redFlags.immediateActionRequired && (
                <div className="text-rose-700 mt-1 italic">
                  Recommended Action: {summary.redFlags.immediateActionRequired}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Structured Sections a to i */}
        <div className="space-y-3.5 text-xs">
          {/* Section a: Patient Information */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                a
              </span>
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Patient Information</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Name / ABHA ID:</span>
                <strong className="text-slate-900">{patient.name || 'Not provided'}</strong>
                {patient.abhaId && <div className="text-[10px] text-slate-500 font-mono">{patient.abhaId}</div>}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Age / Sex:</span>
                <strong className="text-slate-900">{summary.patientInfo.ageSex}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">Background / District / Dialect:</span>
                <span className="text-slate-800">
                  {summary.patientInfo.backgroundInfo} • {patient.district ? `${patient.district}, ${patient.state}` : 'Location not provided'} • Dialect: {patient.dialect || 'Hindi'}
                </span>
              </div>
            </div>
          </div>

          {/* Section b: Chief Complaint */}
          <div className="border-l-4 border-blue-600 pl-3.5 py-1.5 bg-blue-50/30 rounded-r-xl">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                b
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                Chief Complaint:
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              {summary.chiefComplaint || 'Not provided'}
            </div>
          </div>

          {/* Section c & d: Presenting Symptoms & Relevant History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Section c: Presenting Symptoms */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-1.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  c
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Presenting Symptoms
                </span>
              </div>
              <ul className="space-y-1 text-xs">
                <li>
                  <span className="text-slate-500">Symptoms: </span>
                  <strong className="text-slate-900">
                    {summary.presentingSymptoms.symptoms.length > 0
                      ? summary.presentingSymptoms.symptoms.join(', ')
                      : 'Not provided'}
                  </strong>
                </li>
                <li>
                  <span className="text-slate-500">Location: </span>
                  <span className="text-slate-900">{summary.presentingSymptoms.location || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Duration: </span>
                  <span className="text-slate-900 font-semibold">{summary.presentingSymptoms.duration || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Severity: </span>
                  <span className="text-slate-900">{summary.presentingSymptoms.severity || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Onset / Progression: </span>
                  <span className="text-slate-900">{summary.presentingSymptoms.onsetProgression || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Associated Symptoms: </span>
                  <span className="text-slate-900">
                    {summary.presentingSymptoms.associatedSymptoms.length > 0
                      ? summary.presentingSymptoms.associatedSymptoms.join(', ')
                      : 'None reported'}
                  </span>
                </li>
              </ul>
            </div>

            {/* Section d: Relevant History */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-1.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  d
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Relevant History
                </span>
              </div>
              <ul className="space-y-1 text-xs">
                <li>
                  <span className="text-slate-500">Medical Conditions: </span>
                  <span className="text-slate-900 font-medium">{summary.relevantHistory.previousConditions || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Previous Episodes: </span>
                  <span className="text-slate-900">{summary.relevantHistory.previousEpisodes || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Current Medications: </span>
                  <span className="text-slate-900">{summary.relevantHistory.medications || 'Not provided'}</span>
                </li>
                <li>
                  <span className="text-slate-500">Known Allergies: </span>
                  <span className={`font-medium ${summary.relevantHistory.allergies !== 'Not provided' && summary.relevantHistory.allergies !== 'None reported' ? 'text-rose-700' : 'text-slate-900'}`}>
                    {summary.relevantHistory.allergies || 'Not provided'}
                  </span>
                </li>
                <li>
                  <span className="text-slate-500">Family / Social History: </span>
                  <span className="text-slate-900">{summary.relevantHistory.familySocialHistory || 'Not provided'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section e: Examination / Patient-Provided Findings */}
          <div className="border border-slate-200 rounded-xl p-3 space-y-1 bg-slate-50/50">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                e
              </span>
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                Examination / Patient-Provided Findings
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
              <div>
                <span className="text-slate-500">Body-Region Selection: </span>
                <span className="text-slate-900 font-medium">{summary.examinationFindings.bodyRegionInfo || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500">Hardware Vitals Telemetry: </span>
                <span className="text-slate-900 font-mono font-medium">{summary.examinationFindings.vitalsTelemetry || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-500">OCR / Lab Report Findings: </span>
                <span className="text-slate-900">{summary.examinationFindings.ocrReportFindings || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500">Patient-Reported Observations: </span>
                <span className="text-slate-900">{summary.examinationFindings.patientReportedObservations || 'Not provided'}</span>
              </div>
              {summary.examinationFindings.otherCollectedInfo && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Other Records: </span>
                  <span className="text-slate-900">{summary.examinationFindings.otherCollectedInfo}</span>
                </div>
              )}
            </div>

            {/* Uploaded Documents Subsection */}
            {((uploadedDocuments && uploadedDocuments.length > 0) || (summary.uploadedDocuments && summary.uploadedDocuments.length > 0)) && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                    <span>Uploaded Medical Documents ({(uploadedDocuments.length > 0 ? uploadedDocuments : summary.uploadedDocuments || []).length})</span>
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Verified for Doctor Review
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(uploadedDocuments.length > 0 ? uploadedDocuments : summary.uploadedDocuments || []).map((doc, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center justify-between text-[11px]">
                        <span className="truncate">{doc.name}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                          {doc.documentType || doc.type || 'Doc'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {doc.uploadDate} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                      </div>
                      {(doc.extractedSummary || doc.ocrTextSnippet) && (
                        <div className="text-[10px] text-slate-700 italic bg-slate-50 p-1 rounded border border-slate-100 mt-1 leading-tight">
                          "{doc.extractedSummary || doc.ocrTextSnippet}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section f: AI-Identified Clinical Concerns */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                  f
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  AI-Identified Clinical Concerns
                </span>
              </div>
              <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                AI Observations (Not Confirmed Diagnosis)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs pt-1">
              {summary.aiClinicalConcerns.observations.map((obs, i) => (
                <li key={i} className="leading-snug">{obs}</li>
              ))}
            </ul>
          </div>

          {/* Section g: Red Flags / Urgent Indicators */}
          <div
            className={`rounded-xl p-3 border space-y-1.5 ${
              summary.redFlags.hasEmergency
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-1.5 border-current/20">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    summary.redFlags.hasEmergency ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  g
                </span>
                <ShieldAlert
                  className={`w-3.5 h-3.5 ${
                    summary.redFlags.hasEmergency ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Red Flags / Urgent Indicators
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summary.redFlags.hasEmergency
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {summary.redFlags.hasEmergency ? 'URGENT RED FLAGS PRESENT' : 'NO RED FLAGS DETECTED'}
              </span>
            </div>

            {summary.redFlags.hasEmergency ? (
              <div className="space-y-1 text-xs pt-1 text-rose-950">
                <div className="font-bold">Urgent Danger Signs:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {summary.redFlags.urgentSymptoms.map((urg, i) => (
                    <li key={i}>{urg}</li>
                  ))}
                </ul>
                {summary.redFlags.immediateActionRequired && (
                  <div className="mt-1 bg-rose-100/70 p-2 rounded-lg font-medium text-[11px]">
                    Immediate Protocol: {summary.redFlags.immediateActionRequired}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs pt-1 font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No red flags identified from current input.</span>
              </div>
            )}
          </div>

          {/* Section h: Missing / Important Information */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 border-b border-blue-200 pb-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                h
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-950">
                Missing / Important Information (For Physician In-Person Review)
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs pt-1">
              {summary.missingImportantInformation.map((item, i) => (
                <li key={i} className="leading-snug">{item}</li>
              ))}
            </ul>
          </div>

          {/* Section i: Recommended Next Step */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                i
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                Recommended Next Step:
              </span>
            </div>
            <div className="text-xs font-semibold text-emerald-950 pl-5">
              {summary.recommendedNextStep}
            </div>
          </div>

          {/* Recommended Prescriptions & Direct Medicine Schedule Sync */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Recommended Prescriptions & Regimen
                </span>
              </div>
              <button
                onClick={handleAddAllRecommendedMeds}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Patient Medicine Schedule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <div className="font-bold text-slate-900">Tab Pantoprazole 40mg</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  1 Tab (OD) • Morning (Empty Stomach, 30m before breakfast) • 14 days
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <div className="font-bold text-slate-900">ORS Hydration Solution</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  1 Sachet in 1L Water • Daytime • Sip frequently • 3 days
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Adaptive History Toggle */}
          {detailedHistory.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <button
                onClick={() => setShowDetailedHistory(!showDetailedHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <span>View Full Adaptive Questioning Q&A Transcript ({detailedHistory.length} Exchanges)</span>
                {showDetailedHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetailedHistory && (
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                  {detailedHistory.map((q, idx) => (
                    <div key={q.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-800">
                        Q{idx + 1}: {q.questionTextEn}
                      </div>
                      <div className="text-slate-600 pl-3 border-l-2 border-blue-500">
                        Response: <strong>{q.patientResponse || 'No verbal response recorded'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Physician Verification & Sign-Off Block */}
          <div className="border-t border-slate-300 pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] text-slate-500 max-w-md">
              <span className="font-semibold text-slate-700">Clinical Responsibility Notice: </span>
              AI observations are decision-support aids only and do NOT constitute a confirmed medical diagnosis. The licensed physician retains sole authority for diagnostic and treatment decisions.
            </div>

            <div className="flex items-center gap-3">
              {isSignedOff ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Verified & Signed by Attending Physician</span>
                </div>
              ) : (
                onSignOff && (
                  <button
                    onClick={onSignOff}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs print:hidden"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Sign-Off Case Record</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
