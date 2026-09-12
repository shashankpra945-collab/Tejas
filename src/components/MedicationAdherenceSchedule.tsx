import React, { useState } from 'react';
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Volume2,
  PlusCircle,
  Info,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Edit3,
  Check,
  Flame,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  PatientProfile,
  MedicationAdherenceItem,
  MedicationDoseStatus,
  LongitudinalVisitNode,
} from '../types';

interface MedicationAdherenceScheduleProps {
  patient: PatientProfile;
  onUpdateDoseStatus?: (medicationId: string, logIndex: number, newStatus: MedicationDoseStatus) => void;
  onSaveDoctorIntervention?: (medicationId: string, notes: string) => void;
  onAddNewMedication?: (medication: MedicationAdherenceItem) => void;
  isDoctorMode?: boolean;
}

export const MedicationAdherenceSchedule: React.FC<MedicationAdherenceScheduleProps> = ({
  patient,
  onUpdateDoseStatus,
  onSaveDoctorIntervention,
  onAddNewMedication,
  isDoctorMode = true,
}) => {
  const [selectedMedId, setSelectedMedId] = useState<string | null>(
    patient.currentAdherenceSchedule?.[0]?.id || null
  );
  const [editingInterventionId, setEditingInterventionId] = useState<string | null>(null);
  const [interventionNoteInput, setInterventionNoteInput] = useState('');
  const [audioReminderPlaying, setAudioReminderPlaying] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New medication form state
  const [newMedName, setNewMedName] = useState('');
  const [newGeneric, setNewGeneric] = useState('');
  const [newCategory, setNewCategory] = useState<MedicationAdherenceItem['category']>('General');
  const [newRegimen, setNewRegimen] = useState('1 Tablet OD in morning after breakfast');
  const [newTiming, setNewTiming] = useState<MedicationAdherenceItem['timing']>('Morning (After Breakfast)');
  const [newFrequency, setNewFrequency] = useState<MedicationAdherenceItem['frequency']>('OD');
  const [newDuration, setNewDuration] = useState(30);

  const activeSchedule = patient.currentAdherenceSchedule || [];
  const summary = patient.longitudinalAdherenceSummary;
  const selectedMed = activeSchedule.find((m) => m.id === selectedMedId) || activeSchedule[0];

  const handlePlayVoiceSchedule = (med: MedicationAdherenceItem) => {
    setAudioReminderPlaying(med.id);
    const dialectPhrases: Record<string, string> = {
      Bhojpuri: `ए दादी/माई, ${med.medicationName} दवाई रोज़ बिहान के नाश्ता के बाद लेबे के बा। दवाई कबो बीच में मत छोड़ीह।`,
      Gujarati: `ધ્યાન આપો, ${med.medicationName} દવા દરરોજ સવારે નાસ્તા પછી નિયમિત લેવાની છે. દવા બંધ ન કરશો.`,
      Hindi: `कृपया ध्यान दें, ${med.medicationName} दवा रोज़ सुबह नाश्ते के बाद नियमित रूप से लें। खुराक बीच में न छोड़ें।`,
      Haryanvi: `सुनो जी, ${med.medicationName} दवाई रोज सुबह रोटी खाके लेनी सै। बीच में ना छोड़ियो।`,
      English: `Reminder for ${med.medicationName}: Take 1 dose daily after meals. Maintain continuous compliance.`,
    };

    const textToSpeak = dialectPhrases[patient.dialect] || dialectPhrases['Hindi'];

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      utterance.onend = () => setAudioReminderPlaying(null);
      utterance.onerror = () => setAudioReminderPlaying(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAudioReminderPlaying(null), 2500);
    }
  };

  const handleCycleDoseStatus = (medId: string, logIndex: number, currentStatus: MedicationDoseStatus) => {
    if (!onUpdateDoseStatus) return;
    const cycleMap: Record<MedicationDoseStatus, MedicationDoseStatus> = {
      TAKEN: 'DELAYED',
      DELAYED: 'MISSED',
      MISSED: 'TAKEN',
      SKIPPED: 'TAKEN',
      SNOOZED: 'TAKEN',
    };
    const nextStatus = cycleMap[currentStatus];
    onUpdateDoseStatus(medId, logIndex, nextStatus);
  };

  const handleSaveIntervention = (medId: string) => {
    if (onSaveDoctorIntervention && interventionNoteInput.trim()) {
      onSaveDoctorIntervention(medId, interventionNoteInput.trim());
    }
    setEditingInterventionId(null);
  };

  const handleCreateMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !onAddNewMedication) return;

    const newMed: MedicationAdherenceItem = {
      id: `med_${Date.now()}`,
      medicationName: newMedName.trim(),
      genericFormula: newGeneric.trim() || newMedName.trim(),
      category: newCategory,
      dosageRegimen: newRegimen.trim(),
      frequency: newFrequency,
      timing: newTiming,
      startDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      durationDays: Number(newDuration) || 30,
      totalPrescribedDoses: Number(newDuration) || 30,
      takenDoses: 14,
      missedDoses: 0,
      adherencePercent: 100,
      adherenceTier: 'HIGH_ADHERENCE',
      primaryNonComplianceReason: 'None',
      recentDailyLogs: [
        { date: 'Today', dayOfWeek: 'Today', timeSlot: 'Morning', status: 'TAKEN', loggedAt: '08:00 AM' },
      ],
      refillDueInDays: Number(newDuration) || 30,
      isChronic: newCategory === 'Hypertension' || newCategory === 'Diabetes' || newCategory === 'Cardiology',
      prescribedByVisitId: `VST-ACTIVE-${new Date().getFullYear()}`,
    };

    onAddNewMedication(newMed);
    setIsAddModalOpen(false);
    setNewMedName('');
    setNewGeneric('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Longitudinal Compliance Dashboard */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Pill className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Longitudinal Medication Adherence & Prescription Compliance
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    ABHA Longitudinal Sync
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking dose adherence trajectory, barriers, refill schedules, and clinical doctor interventions over multiple OPD checkups.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDoctorMode && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Prescription</span>
              </button>
            )}
          </div>
        </div>

        {/* Adherence KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Overall Compliance
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  (summary?.overallAdherenceRate ?? 85) >= 80
                    ? 'text-emerald-700'
                    : (summary?.overallAdherenceRate ?? 85) >= 60
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {summary?.overallAdherenceRate ?? 85}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  (summary?.overallAdherenceRate ?? 85) >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : (summary?.overallAdherenceRate ?? 85) >= 60
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summary?.adherenceTrend || 'STABLE'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Prescriptions
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">
                {activeSchedule.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">medications</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              High Adherence Drugs
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {activeSchedule.filter((m) => m.adherenceTier === 'HIGH_ADHERENCE').length}
              </span>
              <span className="text-xs text-slate-500">
                of {activeSchedule.length} regular
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Non-Compliance Risk
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  summary?.nonComplianceRiskFlag ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {summary?.nonComplianceRiskFlag ? 'FLAGGED' : 'LOW RISK'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Banner if High-Risk Non-Compliance Detected */}
        {summary?.nonComplianceRiskFlag && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-xs text-rose-950">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-900">
                Critical Adherence Alert: High-Risk Prescription Non-Compliance Detected
              </div>
              <p className="text-rose-800 leading-relaxed">
                Patient has discontinued or frequently skipped essential chronic therapy (e.g. Antihypertensive / Antidiabetic). Review reported barriers below, counsel the patient against premature cessation, and document doctor intervention in the case sheet.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Medication Breakdown & Interactive Dose Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medication Prescriptions List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Active Prescribed Medications ({activeSchedule.length})
            </h4>
            <span className="text-[11px] text-slate-500">Select to inspect schedule</span>
          </div>

          {activeSchedule.length === 0 ? (
            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <Pill className="w-8 h-8 mx-auto text-slate-300" />
              <div>No active prescriptions recorded in patient longitudinal timeline.</div>
              {isDoctorMode && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-xs text-emerald-700 font-bold underline cursor-pointer"
                >
                  Add first prescription
                </button>
              )}
            </div>
          ) : (
            activeSchedule.map((med) => {
              const isSelected = selectedMed?.id === med.id;
              const isCrit = med.adherenceTier === 'CRITICAL_NON_COMPLIANCE';
              const isHigh = med.adherenceTier === 'HIGH_ADHERENCE';

              return (
                <div
                  key={med.id}
                  onClick={() => setSelectedMedId(med.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{med.medicationName}</span>
                        {med.isChronic && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                            CHRONIC
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">{med.genericFormula}</div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-full ${
                          isHigh
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCrit
                            ? 'bg-rose-100 text-rose-850'
                            : 'bg-amber-100 text-amber-850'
                        }`}
                      >
                        {med.adherencePercent}% Adherence
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHigh
                            ? 'bg-emerald-600'
                            : isCrit
                            ? 'bg-rose-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, med.adherencePercent)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Taken: <strong className="text-slate-700">{med.takenDoses}</strong> / {med.totalPrescribedDoses} doses
                      </span>
                      <span>
                        Missed: <strong className={med.missedDoses > 5 ? 'text-rose-600' : 'text-slate-600'}>{med.missedDoses}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {med.frequency} • {med.timing}
                    </span>
                    <span className="text-slate-500">
                      Refill in: <strong className="text-slate-800">{med.refillDueInDays} days</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Longitudinal Trend Across Visits */}
          {patient.visitHistory && patient.visitHistory.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Historic Adherence Trajectory Across OPD Visits
              </h4>
              <div className="space-y-2">
                {patient.visitHistory.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800">{v.visitDate} • {v.opdDepartment}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{v.chiefComplaint}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        {v.adherenceScorePercent || 85}% Compliance
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: In-Depth Schedule, Pill Heatmap & Doctor Interventions */}
        <div className="lg:col-span-7 space-y-4">
          {selectedMed ? (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
              {/* Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedMed.medicationName}</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                      {selectedMed.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedMed.dosageRegimen}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayVoiceSchedule(selectedMed)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    title={`Play audio schedule in ${patient.dialect}`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${audioReminderPlaying === selectedMed.id ? 'animate-pulse text-amber-700' : ''}`} />
                    <span>Dialect Audio ({patient.dialect})</span>
                  </button>
                </div>
              </div>

              {/* Visual Non-Literate Sun/Moon Schedule */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Visual Routine Guidance (For {patient.dialect} / Visual Literacy)</span>
                  <span className="text-[10px] text-amber-800 font-normal">Patient Dialect: {patient.dialect}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`p-2 rounded-lg border ${selectedMed.timing.includes('Morning') ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-400' : 'bg-white/60 border-slate-200 text-slate-400'}`}>
                    <Sun className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <div>Morning (बिहान)</div>
                    <div className="text-[10px] font-normal">{selectedMed.timing.includes('Morning') ? '1 Dose Post Breakfast' : 'No Dose'}</div>
                  </div>

                  <div className={`p-2 rounded-lg border ${selectedMed.frequency === 'TDS' ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-400' : 'bg-white/60 border-slate-200 text-slate-400'}`}>
                    <Sunrise className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <div>Afternoon (दुपहरी)</div>
                    <div className="text-[10px] font-normal">{selectedMed.frequency === 'TDS' ? '1 Dose Post Lunch' : 'No Dose'}</div>
                  </div>

                  <div className={`p-2 rounded-lg border ${selectedMed.timing.includes('Night') || selectedMed.timing.includes('HS') ? 'bg-indigo-100 border-indigo-300 text-indigo-950 font-bold ring-1 ring-indigo-400' : 'bg-white/60 border-slate-200 text-slate-400'}`}>
                    <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                    <div>Night (रात)</div>
                    <div className="text-[10px] font-normal">{selectedMed.timing.includes('Night') || selectedMed.timing.includes('HS') ? '1 Dose at Bedtime' : 'No Dose'}</div>
                  </div>
                </div>
              </div>

              {/* 14-Day Interactive Pill Compliance Heatmap Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Past 14-Day Pill Compliance Heatmap (Click to toggle status)
                  </h4>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Taken
                    </span>
                    <span className="flex items-center gap-1 text-amber-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Delayed
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Missed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedMed.recentDailyLogs.map((log, idx) => {
                    const isTaken = log.status === 'TAKEN';
                    const isDelayed = log.status === 'DELAYED';
                    const isMissed = log.status === 'MISSED';

                    return (
                      <button
                        key={idx}
                        onClick={() => handleCycleDoseStatus(selectedMed.id, idx, log.status)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer group ${
                          isTaken
                            ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-950'
                            : isDelayed
                            ? 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-950'
                            : 'bg-rose-50 border-rose-300 hover:bg-rose-100 text-rose-950'
                        }`}
                        title={`${log.date} (${log.dayOfWeek}) - ${log.status}. Click to cycle status.`}
                      >
                        <div className="text-[10px] font-bold text-slate-500">{log.dayOfWeek}</div>
                        <div className="text-xs font-extrabold text-slate-800">{log.date.split(' ')[0]}</div>
                        <div className="mt-1 flex justify-center">
                          {isTaken && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          {isDelayed && <Clock className="w-4 h-4 text-amber-600" />}
                          {isMissed && <XCircle className="w-4 h-4 text-rose-600" />}
                        </div>
                        <div className="text-[9px] font-mono mt-0.5 truncate">
                          {log.status}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Tip: ASHA workers or doctors can click any day's pill badge during consultation to record patient-reported missed or delayed doses.
                </p>
              </div>

              {/* Compliance Barriers & Root Cause Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <span className="text-slate-500 font-semibold block">Primary Compliance Barrier:</span>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {selectedMed.primaryNonComplianceReason && selectedMed.primaryNonComplianceReason !== 'None' ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {selectedMed.primaryNonComplianceReason}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> No critical barriers reported
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <span className="text-slate-500 font-semibold block">Prescribed Under Visit ID:</span>
                  <div className="font-mono font-bold text-slate-800">
                    {selectedMed.prescribedByVisitId || 'VST-HISTORIC-01'}
                  </div>
                </div>
              </div>

              {/* Doctor Clinical Intervention & Notes Section */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Attending Doctor Adherence Guidance & Plan
                  </h4>
                  {isDoctorMode && editingInterventionId !== selectedMed.id && (
                    <button
                      onClick={() => {
                        setEditingInterventionId(selectedMed.id);
                        setInterventionNoteInput(selectedMed.doctorInterventionNotes || '');
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{selectedMed.doctorInterventionNotes ? 'Edit Guidance' : 'Add Guidance'}</span>
                    </button>
                  )}
                </div>

                {editingInterventionId === selectedMed.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={interventionNoteInput}
                      onChange={(e) => setInterventionNoteInput(e.target.value)}
                      placeholder="E.g., Patient warned regarding rebound hypertension when stopping Telmisartan. Advised morning alarm and pill organizer."
                      className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      rows={3}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingInterventionId(null)}
                        className="px-2.5 py-1 text-xs rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveIntervention(selectedMed.id)}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        Save Guidance
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-900 leading-relaxed italic bg-white/70 p-3 rounded-lg border border-emerald-100">
                    {selectedMed.doctorInterventionNotes ||
                      'No specific doctor adherence intervention recorded yet. Click above to add clinical counseling instructions.'}
                  </div>
                )}

                {/* Quick Clinical Intervention Buttons */}
                {isDoctorMode && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (onSaveDoctorIntervention) {
                          onSaveDoctorIntervention(
                            selectedMed.id,
                            'Advised patient to take with breakfast to prevent gastric irritation.'
                          );
                        }
                      }}
                      className="text-[10px] font-semibold bg-white hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    >
                      + Switch to Post-Meal
                    </button>
                    <button
                      onClick={() => {
                        if (onSaveDoctorIntervention) {
                          onSaveDoctorIntervention(
                            selectedMed.id,
                            'Consolidated multiple doses into once-daily OD regimen to reduce pill burden.'
                          );
                        }
                      }}
                      className="text-[10px] font-semibold bg-white hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    >
                      + Simplify to OD
                    </button>
                    <button
                      onClick={() => {
                        if (onSaveDoctorIntervention) {
                          onSaveDoctorIntervention(
                            selectedMed.id,
                            'Counseled on stroke risk if anti-hypertensive is stopped when asymptomatic.'
                          );
                        }
                      }}
                      className="text-[10px] font-semibold bg-white hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    >
                      + Asymptomatic Compliance Warning
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
              Select a prescription from the left to view detailed compliance timeline and calendar logs.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add New Medication & Configure Adherence Schedule */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                Add Medication to Adherence Schedule
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMedication} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medication Name (Brand / Formulation):</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Telmisartan 40mg, Pantoprazole 40mg"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic / IP Salt:</label>
                  <input
                    type="text"
                    placeholder="E.g., Telmisartan IP 40mg"
                    value={newGeneric}
                    onChange={(e) => setNewGeneric(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Therapeutic Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Hypertension">Hypertension</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Acid Peptic Disease">Acid Peptic Disease</option>
                    <option value="Arthritis / AYUSH">Arthritis / AYUSH</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Antibiotic / Infection">Antibiotic / Infection</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency:</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="OD">Once Daily (OD)</option>
                    <option value="BD">Twice Daily (BD)</option>
                    <option value="TDS">Thrice Daily (TDS)</option>
                    <option value="Weekly">Weekly</option>
                    <option value="SOS">As Needed (SOS)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Timing & Relation to Food:</label>
                  <select
                    value={newTiming}
                    onChange={(e) => setNewTiming(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Morning (Empty Stomach)">Morning (Empty Stomach)</option>
                    <option value="Morning (After Breakfast)">Morning (After Breakfast)</option>
                    <option value="Morning & Night (Post Meals)">Morning & Night (Post Meals)</option>
                    <option value="Night (HS)">Night (Bedtime HS)</option>
                    <option value="Thrice Daily (TDS)">Thrice Daily (TDS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Days):</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage Instructions:</label>
                  <input
                    type="text"
                    value={newRegimen}
                    onChange={(e) => setNewRegimen(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Add to Adherence Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
