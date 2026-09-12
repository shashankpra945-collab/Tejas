import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Volume2,
  Calendar,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Pill,
  Save,
  Check,
  RefreshCw,
  Utensils,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import {
  PatientProfile,
  PrescriptionExplanationItem,
} from '../types';
import { speakTextNative } from '../utils/speechEngine';

export interface PrescriptionExplanationResult {
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
  timeline: {
    slot: 'Morning' | 'Afternoon' | 'Night';
    timeRange: string;
    medicines: {
      name: string;
      dose: string;
      mealInstruction: string;
      instructions: string;
      isUnclear?: boolean;
    }[];
  }[];
  disclaimer: string;
  unclearItems?: string[];
  patientSpokenExplanation?: string;
}

interface PrescriptionAssistantViewProps {
  patient: PatientProfile;
  onSavePrescriptionSchedule: (explanation: PrescriptionExplanationItem) => void;
  onNavigateToTab?: (tab: any) => void;
}

const SAMPLE_PRESCRIPTIONS = [
  {
    title: 'Dr. Neha Verma - Acute Respiratory & Allergy Rx',
    doctor: 'Dr. Neha Verma, MD (Pulmonology, BHU)',
    date: 'Today',
    text: `Rx:
1. Tab Montair-LC (Montelukast 10mg + Levocetirizine 5mg) - 1 Tab OD at Night after food x 10 days
2. Tab Paracetamol 650mg - 1 Tab BD after food (Morning & Night) x 3 days
3. Cap Pantoprazole 40mg - 1 Cap OD in Morning 30 mins before breakfast x 7 days
4. Karvol Plus steam inhalation capsules - 1 cap in hot water BD x 5 days
Note: Avoid cold beverages and dust exposure.`,
  },
  {
    title: 'Dr. Kaushik Patel - Hypertension & Diabetes Maintenance Rx',
    doctor: 'Dr. Kaushik Patel, MD (Internal Medicine, SVP Hospital)',
    date: '10 Jul 2026',
    text: `Rx:
1. Tab Telma 40 (Telmisartan 40mg) - 1 Tab OD in Morning after light breakfast x 30 days
2. Tab Glycomet 500 SR (Metformin 500mg SR) - 1 Tab BD with morning & evening meals x 30 days
3. Tab Shelcal 500 - 1 Tab OD in Afternoon after lunch x 30 days
Note: Low salt diet, 30 min brisk walk. Check fasting blood sugar monthly. DO NOT STOP Telma 40 abruptly.`,
  },
  {
    title: 'Smudged / Ambiguous Prescription Slip (Safety Guardrail Demo)',
    doctor: 'Civil Hospital OPD Duty Officer',
    date: 'Yesterday',
    text: `Rx:
1. Tab Amox--- 500mg - [Dose frequency smudged / illegible] x 5 days
2. Tab Pantocid 40 - 1 OD morning empty stomach x 14 days
3. Syr. Ascoril-LS - 5ml TDS after food x 5 days
Note: Review after 5 days if cough does not subside.`,
  },
];

export const PrescriptionAssistantView: React.FC<PrescriptionAssistantViewProps> = ({
  patient,
  onSavePrescriptionSchedule,
  onNavigateToTab,
}) => {
  const [prescriptionText, setPrescriptionText] = useState(SAMPLE_PRESCRIPTIONS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanationResult, setExplanationResult] = useState<PrescriptionExplanationResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Default initial analysis on mount
  React.useEffect(() => {
    handleAnalyzePrescription(SAMPLE_PRESCRIPTIONS[0].text);
  }, []);

  const handleAnalyzePrescription = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/gemini/explain-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionText: textToAnalyze,
          patientDialect: patient.dialect || 'Hindi',
          patientConditions: patient.medicalConditions || [],
        }),
      });

      if (res.ok) {
        const data: PrescriptionExplanationResult = await res.json();
        setExplanationResult(data);
      }
    } catch (err) {
      console.warn('Prescription Assistant note:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReadScheduleOutLoud = () => {
    if (!explanationResult) return;
    setAudioPlaying(true);

    const speechScript = `Here is your daily medicine schedule explained from the doctor's prescription. In the morning: ${explanationResult.timeline[0]?.medicines.map((m) => `${m.name}, ${m.relationToFood}`).join(', ') || 'None'}. In the afternoon: ${explanationResult.timeline[1]?.medicines.map((m) => `${m.name}, ${m.relationToFood}`).join(', ') || 'None'}. At night: ${explanationResult.timeline[2]?.medicines.map((m) => `${m.name}, ${m.relationToFood}`).join(', ') || 'None'}. Remember, this AI assistant does not alter your doctor's orders. If anything is unclear, ask your doctor or pharmacist.`;

    speakTextNative(speechScript, patient.dialect || 'Hindi', () => {
      setAudioPlaying(false);
    });
  };

  const handleSaveToPatientProfile = () => {
    if (!explanationResult) return;

    const explanationItem: PrescriptionExplanationItem = {
      id: `rx_expl_${Date.now()}`,
      prescriptionId: `rx_${Date.now()}`,
      generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctorName: explanationResult.doctorName,
      doctorSpecialty: explanationResult.doctorSpecialty,
      prescribedMedicines: explanationResult.prescribedMedicines,
      timeline: explanationResult.timeline,
      disclaimer: explanationResult.disclaimer,
      verificationRequested: true,
      unclearItems: explanationResult.unclearItems,
    };

    onSavePrescriptionSchedule(explanationItem);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Strict Safety Notice Banner */}
      <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 text-amber-900 shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-amber-950 uppercase tracking-wide flex items-center gap-2">
            <span>Clinical AI Safety Mandate</span>
            <span className="text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded font-mono">
              Strict Read-Only Guardrail
            </span>
          </div>
          <p className="leading-relaxed">
            The AI does not change, prescribe, stop, or modify medicines or dosages. It only explains and organizes information written on the doctor's prescription into a clear, patient-friendly timeline. If any text is unclear or smudged, the system will explicitly highlight it for doctor/pharmacist confirmation.
          </p>
        </div>
      </div>

      {/* Main Grid: Input Prescription & Generated Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Text & Sample Prescriptions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Doctor's Prescription Text / Slip
              </h3>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Patient: {patient.name}
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Load Sample Clinical Prescriptions:
              </span>
              <div className="space-y-1.5">
                {SAMPLE_PRESCRIPTIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrescriptionText(preset.text);
                      handleAnalyzePrescription(preset.text);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      prescriptionText === preset.text
                        ? 'border-purple-500 bg-purple-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-purple-50/40 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 truncate">{preset.title}</div>
                    <div className="text-[10px] text-slate-500">{preset.doctor}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea for Manual Entry / OCR Output */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Prescription Content (Paste or Edit OCR Text):
              </label>
              <textarea
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                rows={7}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                placeholder="Enter doctor's prescription text or dosage instructions..."
              />
            </div>

            <button
              onClick={() => handleAnalyzePrescription(prescriptionText)}
              disabled={isAnalyzing || !prescriptionText.trim()}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Structuring Timeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze & Generate Schedule Timeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Explained Daily Schedule Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Daily Medicine Schedule & Timeline
                </h3>
                <p className="text-[11px] text-slate-500">
                  Organized by daily routine time slots (Morning, Afternoon, Night)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReadScheduleOutLoud}
                  disabled={!explanationResult || audioPlaying}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Volume2 className={`w-3.5 h-3.5 text-purple-600 ${audioPlaying ? 'animate-pulse' : ''}`} />
                  <span>{audioPlaying ? 'Speaking...' : 'Listen in Audio'}</span>
                </button>
              </div>
            </div>

            {/* Verification Alert if Ambiguous Text Found */}
            {explanationResult?.verificationRequested && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
                <div className="font-bold flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Ambiguous / Smudged Items Detected</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The AI did not guess unreadable doctor handwriting. Please confirm the following with your doctor or pharmacist:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-red-800">
                  {explanationResult.unclearItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3-Slot Visual Schedule Timeline */}
            {explanationResult ? (
              <div className="space-y-4">
                {/* Morning Slot */}
                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-amber-950">Morning Routine</div>
                        <div className="text-[10px] text-amber-800 font-mono">08:00 AM (Breakfast)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                      {explanationResult.timeline[0]?.medicines.length || 0} Medicines
                    </span>
                  </div>

                  {explanationResult.timeline[0]?.medicines.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">No medicines scheduled for the morning.</div>
                  ) : (
                    <div className="space-y-2">
                      {explanationResult.timeline[0]?.medicines.map((med, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-amber-900 flex items-center gap-1.5">
                            <Utensils className="w-3 h-3 text-amber-600" />
                            <span>{med.relationToFood}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{med.actionText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Afternoon Slot */}
                <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Sunset className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-blue-950">Afternoon Routine</div>
                        <div className="text-[10px] text-blue-800 font-mono">01:30 PM (Lunch)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      {explanationResult.timeline[1]?.medicines.length || 0} Medicines
                    </span>
                  </div>

                  {explanationResult.timeline[1]?.medicines.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">No medicines scheduled for afternoon.</div>
                  ) : (
                    <div className="space-y-2">
                      {explanationResult.timeline[1]?.medicines.map((med, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-blue-900 flex items-center gap-1.5">
                            <Utensils className="w-3 h-3 text-blue-600" />
                            <span>{med.relationToFood}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{med.actionText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Night Slot */}
                <div className="p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-indigo-950">Night Routine</div>
                        <div className="text-[10px] text-indigo-800 font-mono">08:30 PM (Dinner / Bedtime)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                      {explanationResult.timeline[2]?.medicines.length || 0} Medicines
                    </span>
                  </div>

                  {explanationResult.timeline[2]?.medicines.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-1">No medicines scheduled for night.</div>
                  ) : (
                    <div className="space-y-2">
                      {explanationResult.timeline[2]?.medicines.map((med, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-indigo-900 flex items-center gap-1.5">
                            <Utensils className="w-3 h-3 text-indigo-600" />
                            <span>{med.relationToFood}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{med.actionText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Structured Prescribed Medicines Details Table */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Extracted Doctor Prescriptions Table:
                  </div>
                  <div className="space-y-2">
                    {explanationResult.prescribedMedicines.map((item, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{item.medicineName}</span>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {item.frequency} • {item.duration}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Timing: <strong>{item.timingSummary}</strong> ({item.mealTiming})
                        </div>
                        {item.specialInstructions && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Note: {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success alert on save */}
                {savedSuccess && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Prescription explanation saved to {patient.name}'s profile & daily reminders!</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveToPatientProfile}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Schedule to Patient Profile</span>
                  </button>
                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('MEDICINE_SCHEDULE')}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors"
                    >
                      Open Live Reminders →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Click "Analyze & Generate Schedule Timeline" to view daily routine breakdown.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
