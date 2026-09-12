import React, { useState } from 'react';
import {
  Database,
  Search,
  Pill,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Plus,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HeartPulse,
  Activity,
  User,
} from 'lucide-react';
import { PatientProfile, StoredMedicineInfo } from '../types';

interface MedicineInfoDatabaseViewProps {
  patient: PatientProfile;
  onAddMedicineToPatient: (medInfo: StoredMedicineInfo) => void;
  onNavigateToTab?: (tab: any) => void;
}

const POPULAR_DRUG_SEARCH_SUGGESTIONS = [
  'Paracetamol 650',
  'Telmisartan 40mg',
  'Metformin 500mg SR',
  'Montair-LC',
  'Pantoprazole 40mg',
  'Shelcal 500',
  'Amoxicillin 500mg',
  'Shallaki 500mg (AYUSH)',
];

export const MedicineInfoDatabaseView: React.FC<MedicineInfoDatabaseViewProps> = ({
  patient,
  onAddMedicineToPatient,
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<'PATIENT_MEDS' | 'SEARCH_DATABASE'>('PATIENT_MEDS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedMedicineResult, setSearchedMedicineResult] = useState<StoredMedicineInfo | null>(null);
  const [selectedPatientMed, setSelectedPatientMed] = useState<StoredMedicineInfo | null>(
    patient.storedMedicines?.[0] || null
  );
  const [saveAlert, setSaveAlert] = useState(false);

  // Search pharmacological reference using server Gemini CDSCO grounding
  const handlePerformSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSaveAlert(false);

    try {
      const activeMedNames = (patient.storedMedicines || []).map((m) => m.name);
      const res = await fetch('/api/gemini/medicine-database-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineName: query.trim(),
          patientAllergies: patient.knownAllergies || [],
          patientActiveMedicines: activeMedNames,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const formatted: StoredMedicineInfo = {
          id: `med_searched_${Date.now()}`,
          name: data.name,
          genericName: data.genericName,
          purpose: data.purpose,
          prescribedDosage: data.prescribedDosage,
          patientInstructions: data.patientInstructions,
          commonSideEffects: data.commonSideEffects || [],
          importantWarnings: data.importantWarnings || [],
          interactions: data.interactions || [],
          allergiesAndContraindications: data.allergiesAndContraindications || [],
          previousPrescriptionCount: 1,
          lastPrescribedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          prescribedByDoctor: 'Reference Pharmacopoeia Data',
          usageHistory: [
            {
              date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              event: 'Pharmacopoeia Query',
              notes: 'Queried by clinician / patient for guidance',
            },
          ],
          isCurrentlyActive: false,
          source: 'MANUAL_ENTRY',
        };
        setSearchedMedicineResult(formatted);
      }
    } catch (err) {
      console.warn('Search note:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearchedToPatient = () => {
    if (!searchedMedicineResult) return;
    onAddMedicineToPatient({
      ...searchedMedicineResult,
      isCurrentlyActive: true,
      lastPrescribedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    });
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 4000);
  };

  const patientMedicines = patient.storedMedicines || [];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Medicine Information Database</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive pharmacology profiles, clinical purposes, side effects, precautions, and cross-drug interaction checks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
              Patient: <strong className="text-slate-900">{patient.name}</strong> • Known Allergies: {patient.knownAllergies?.join(', ') || 'None'}
            </span>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-1">
          <button
            onClick={() => setActiveTab('PATIENT_MEDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'PATIENT_MEDS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Patient's Saved Medicines ({patientMedicines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SEARCH_DATABASE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SEARCH_DATABASE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Indian Pharmacopoeia / CDSCO</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Patient's Saved Medicines */}
      {activeTab === 'PATIENT_MEDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: List of Patient's Medicines */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Prescribed & Scanned Items
                </span>
                <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {patientMedicines.length} Drugs
                </span>
              </div>

              {patientMedicines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No medicines saved yet. Scan a medicine strip or add from prescription to populate.
                </div>
              ) : (
                <div className="space-y-2">
                  {patientMedicines.map((med) => {
                    const isSelected = selectedPatientMed?.id === med.id;
                    return (
                      <button
                        key={med.id}
                        onClick={() => setSelectedPatientMed(med)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-400 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-purple-50/40 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-bold text-slate-900 truncate">{med.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{med.genericName}</div>
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                          <span>Last Rx: {med.lastPrescribedDate}</span>
                          <span
                            className={`font-semibold ${
                              med.isCurrentlyActive ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {med.isCurrentlyActive ? '● Active' : '○ Past'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Detailed Pharmacology Profile of Selected Medicine */}
          <div className="lg:col-span-8">
            {selectedPatientMed ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedPatientMed.name}</h3>
                    <p className="text-xs text-purple-700 font-medium">{selectedPatientMed.genericName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold">
                      Prescribed {selectedPatientMed.previousPrescriptionCount} times
                    </span>
                  </div>
                </div>

                {/* Purpose & Prescribed Dosage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-1">
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-purple-600" />
                      Clinical Purpose / Indication:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedPatientMed.purpose}</p>
                  </div>

                  <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600" />
                      Prescribed Dosage Regimen:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedPatientMed.prescribedDosage}
                    </p>
                  </div>
                </div>

                {/* Patient Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-600" />
                    Patient Instructions & Administration:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{selectedPatientMed.patientInstructions}</p>
                </div>

                {/* Side Effects & Important Warnings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Common Side Effects */}
                  <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Common Side Effects:
                    </span>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {selectedPatientMed.commonSideEffects.map((se, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{se}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Important Warnings & Precautions */}
                  <div className="p-3.5 rounded-xl border border-red-200/80 bg-red-50/30 space-y-2">
                    <span className="text-[11px] font-bold text-red-900 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      Critical Warnings & Precautions:
                    </span>
                    <ul className="text-xs text-red-900 space-y-1">
                      {selectedPatientMed.importantWarnings.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-red-600 font-bold">!</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Drug-Drug Interactions Check */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-600" />
                      Cross-Drug Interactions & Allergy Checks:
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Evaluated against patient's active regimen
                    </span>
                  </div>

                  {selectedPatientMed.interactions.length === 0 ? (
                    <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>No severe drug-drug interactions detected with current active medications.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPatientMed.interactions.map((inter, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border bg-white text-xs space-y-1 border-amber-200"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Interacts with: {inter.interactingDrug}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                inter.severity === 'SEVERE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inter.severity} INTERACTION
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{inter.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Longitudinal Usage History in This Patient's Care */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Patient Care & Prescription Log:
                  </span>
                  <div className="space-y-1.5">
                    {selectedPatientMed.usageHistory.map((hist, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">{hist.date}</span>
                          <span className="font-semibold text-slate-900">{hist.event}:</span>
                          <span className="text-slate-600">{hist.notes}</span>
                        </div>
                        <span className="text-[10px] text-purple-700 font-medium">
                          {selectedPatientMed.prescribedByDoctor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-500 border border-slate-200">
                Select a medicine from the left list to view detailed pharmacology data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Pharmacopoeia Search */}
      {activeTab === 'SEARCH_DATABASE' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              Search Any Medicine, Formulation, or Salt (Indian CDSCO Database):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePerformSearch(searchQuery)}
                  placeholder="Type medicine name (e.g. Dolo 650, Telmisartan, Amoxicillin, Pantoprazole)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                onClick={() => handlePerformSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>

            {/* Quick search tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">Suggested:</span>
              {POPULAR_DRUG_SEARCH_SUGGESTIONS.map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(tag);
                    handlePerformSearch(tag);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Search Result Display */}
          {searchedMedicineResult && (
            <div className="mt-6 border-t border-slate-100 pt-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 p-4 rounded-xl border border-purple-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{searchedMedicineResult.name}</h3>
                  <p className="text-xs text-purple-700 font-medium">{searchedMedicineResult.genericName}</p>
                </div>
                <button
                  onClick={handleSaveSearchedToPatient}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {patient.name}'s Medical Profile</span>
                </button>
              </div>

              {saveAlert && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Added {searchedMedicineResult.name} to patient's active stored medicines!</span>
                </div>
              )}

              {/* Purpose & Dosage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wide block">Clinical Purpose:</span>
                  <p className="text-slate-700 leading-relaxed">{searchedMedicineResult.purpose}</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wide block">Standard Dosage:</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{searchedMedicineResult.prescribedDosage}</p>
                </div>
              </div>

              {/* Patient Guidelines */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-blue-950 uppercase tracking-wide block">
                  Patient Usage Guidelines:
                </span>
                <p className="text-slate-700 leading-relaxed">{searchedMedicineResult.patientInstructions}</p>
              </div>

              {/* Side effects and warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-xl space-y-1">
                  <span className="font-bold text-amber-900 uppercase tracking-wide block">Common Side Effects:</span>
                  <ul className="text-slate-700 space-y-1 list-disc list-inside">
                    {searchedMedicineResult.commonSideEffects.map((se, i) => (
                      <li key={i}>{se}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3.5 bg-red-50/40 border border-red-200 rounded-xl space-y-1">
                  <span className="font-bold text-red-900 uppercase tracking-wide block">
                    Important Warnings & Precautions:
                  </span>
                  <ul className="text-red-900 space-y-1 list-disc list-inside">
                    {searchedMedicineResult.importantWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
