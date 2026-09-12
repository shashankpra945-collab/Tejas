import React, { useState, useMemo } from 'react';
import {
  User,
  Search,
  UserPlus,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Phone,
  CreditCard,
  MapPin,
  Languages,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  Calendar,
  Stethoscope,
  PlusCircle,
  Pill,
} from 'lucide-react';
import { PatientProfile, LanguageDialect, LongitudinalVisitNode } from '../types';
import {
  findDuplicatePatient,
  normalizePhone,
  normalizeAbha,
  registerNewPatientRecord,
} from '../data/patientRegistry';
import { audioSynth } from '../utils/speechEngine';

interface PatientRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePatient: PatientProfile;
  allPatients: PatientProfile[];
  onSelectPatientForCheckup: (patient: PatientProfile, isNewVisitSession: boolean) => void;
  onRegisterNewPatient: (newPatient: PatientProfile) => void;
}

export const PatientRegistryModal: React.FC<PatientRegistryModalProps> = ({
  isOpen,
  onClose,
  activePatient,
  allPatients,
  onSelectPatientForCheckup,
  onRegisterNewPatient,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'register' | 'history'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<PatientProfile>(activePatient);

  // New patient form fields
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('45');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [formPhone, setFormPhone] = useState('');
  const [formState, setFormState] = useState(activePatient.state || 'Gujarat');
  const [formDistrict, setFormDistrict] = useState(activePatient.district || 'Surat');
  const [formDialect, setFormDialect] = useState<LanguageDialect>(activePatient.dialect || 'Bhojpuri');
  const [formLiteracy, setFormLiteracy] = useState<PatientProfile['literacyLevel']>('Semi-literate');
  const [formAbha, setFormAbha] = useState('');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<PatientProfile | null>(null);

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allPatients;
    const cleanNum = q.replace(/\D/g, '');
    return allPatients.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchAbha = p.abhaId.toLowerCase().includes(q) || (cleanNum && normalizeAbha(p.abhaId).includes(cleanNum));
      const matchPhone = (p.phone && p.phone.includes(q)) || (cleanNum && normalizePhone(p.phone || '').includes(cleanNum));
      const matchDist = p.district.toLowerCase().includes(q);
      return matchName || matchAbha || matchPhone || matchDist;
    });
  }, [allPatients, searchQuery]);

  // Real-time duplicate check during new patient entry
  const checkDuplicateOnForm = (phoneVal: string, abhaVal: string, nameVal: string, distVal: string) => {
    const found = findDuplicatePatient(
      { phone: phoneVal, abhaId: abhaVal, name: nameVal, district: distVal },
      allPatients
    );
    if (found) {
      setDuplicateWarning(found.patient);
      setRegistrationError(`Duplicate detected! Matches existing record: ${found.patient.name} (ABHA: ${found.patient.abhaId}).`);
    } else {
      setDuplicateWarning(null);
      setRegistrationError(null);
    }
  };

  const handleGenerateAbha = () => {
    const randomSuffix1 = Math.floor(1000 + Math.random() * 9000);
    const randomSuffix2 = Math.floor(1000 + Math.random() * 9000);
    const newAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${randomSuffix1}-${randomSuffix2}`;
    setFormAbha(newAbha);
    checkDuplicateOnForm(formPhone, newAbha, formName, formDistrict);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setRegistrationError('Patient Name is required.');
      return;
    }
    if (!formPhone.trim()) {
      setRegistrationError('Phone number is required for OTP / ABHA registration.');
      return;
    }

    const abhaToUse = formAbha.trim() || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = registerNewPatientRecord(
      {
        name: formName.trim(),
        age: parseInt(formAge) || 30,
        gender: formGender,
        phone: formPhone.trim().startsWith('+91') ? formPhone.trim() : `+91 ${formPhone.trim()}`,
        phoneNumber: formPhone.trim().startsWith('+91') ? formPhone.trim() : `+91 ${formPhone.trim()}`,
        district: formDistrict,
        state: formState,
        dialect: formDialect,
        literacyLevel: formLiteracy,
        isSensitiveMode: false,
        abhaId: abhaToUse,
      },
      allPatients
    );

    if (!result.success) {
      setRegistrationError(result.error || 'Failed to register patient.');
      if (result.existingPatient) {
        setDuplicateWarning(result.existingPatient);
      }
      return;
    }

    if (result.patient) {
      onRegisterNewPatient(result.patient);
      onSelectPatientForCheckup(result.patient, true);
      audioSynth.playConfirmChime();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold">ABDM Unified Patient Registry & Deduplication</h3>
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-500/30">
                    Zero-Duplication
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Repeat visits automatically append to existing patient records. No duplicate profiles.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Patient Pill */}
          <div className="mt-4 bg-white/10 border border-white/15 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Active Patient on Kiosk:</span>
              <strong className="text-white font-bold">{activePatient.name}</strong>
              <span className="text-emerald-300 font-mono text-[11px]">ABHA: {activePatient.abhaId}</span>
              <span className="text-slate-400">• {activePatient.age}y / {activePatient.gender}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/30 text-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                {activePatient.visitHistory?.length || activePatient.pastVisitsCount || 0} Recorded Consultations
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'search'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-bold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Start Repeat Checkup ({allPatients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'register'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-bold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Patient Profile</span>
          </button>

          <button
            onClick={() => {
              setSelectedPatientForHistory(activePatient);
              setActiveTab('history');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-bold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>View Longitudinal Record ({selectedPatientForHistory.name})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SEARCH & CHECK-IN (REPEAT CHECKUP) */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ABHA ID (e.g. 91-4820...), Mobile Number (e.g. 9876543210), or Patient Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Deduplication Guarantee Notice */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Unified Longitudinal EHR Protection:</strong> When an existing patient comes for a repeat checkup, selecting their profile adds the new consultation to their continuous history timeline rather than duplicating their demographic profile.
                </div>
              </div>

              {/* Patient List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPatients.map((pat) => {
                  const isActive = pat.id === activePatient.id;
                  const visitCount = pat.visitHistory?.length ?? pat.pastVisitsCount ?? 0;
                  return (
                    <div
                      key={pat.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{pat.name}</span>
                            {isActive && (
                              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                                Active Kiosk
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 font-mono">
                            ABHA: <span className="font-bold text-emerald-700">{pat.abhaId}</span>
                          </div>
                        </div>

                        <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          {visitCount} {visitCount === 1 ? 'Visit' : 'Visits'}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                        <div>Age/Gender: <strong>{pat.age}y, {pat.gender}</strong></div>
                        <div>Phone: <strong>{pat.phone || pat.phoneNumber}</strong></div>
                        <div>Location: <strong>{pat.district}, {pat.state}</strong></div>
                        <div>Dialect: <strong>{pat.dialect}</strong></div>
                      </div>

                      {/* Adherence & Prescription Summary Pill */}
                      {pat.longitudinalAdherenceSummary && (
                        <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Pill className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{pat.currentAdherenceSchedule?.length || 0} active prescriptions</span>
                          </div>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              pat.longitudinalAdherenceSummary.overallAdherenceRate >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : pat.longitudinalAdherenceSummary.overallAdherenceRate >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pat.longitudinalAdherenceSummary.overallAdherenceRate}% Adherence
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedPatientForHistory(pat);
                            setActiveTab('history');
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>View Past Records</span>
                        </button>

                        <button
                          onClick={() => {
                            onSelectPatientForCheckup(pat, true);
                            audioSynth.playConfirmChime();
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Start Checkup</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredPatients.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">No registered patient found matching "{searchQuery}"</p>
                  <p className="text-xs text-slate-500">Would you like to register this person as a new patient?</p>
                  <button
                    onClick={() => {
                      setFormName(isNaN(Number(searchQuery)) ? searchQuery : '');
                      setFormPhone(!isNaN(Number(searchQuery)) ? searchQuery : '');
                      setActiveTab('register');
                    }}
                    className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register New Patient</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER NEW PATIENT (WITH ANTI-DUPLICATION ENGINE) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Duplicate Warning Banner */}
              {duplicateWarning && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-2 text-xs text-amber-950 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Duplicate Patient Record Detected!</span>
                  </div>
                  <p>
                    A patient named <strong>{duplicateWarning.name}</strong> (ABHA: <strong>{duplicateWarning.abhaId}</strong>, Phone: <strong>{duplicateWarning.phone}</strong>) already exists in the system with {duplicateWarning.pastVisitsCount} previous checkup records.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPatientForCheckup(duplicateWarning, true);
                        audioSynth.playConfirmChime();
                        onClose();
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Use Existing Record & Start Checkup (No Duplication)</span>
                    </button>
                  </div>
                </div>
              )}

              {registrationError && !duplicateWarning && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">
                  {registrationError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      checkDuplicateOnForm(formPhone, formAbha, e.target.value, formDistrict);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      checkDuplicateOnForm(e.target.value, formAbha, formName, formDistrict);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Female">Female (महिला)</option>
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State & District</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="State"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="District"
                      value={formDistrict}
                      onChange={(e) => {
                        setFormDistrict(e.target.value);
                        checkDuplicateOnForm(formPhone, formAbha, formName, e.target.value);
                      }}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Native Dialect</label>
                  <select
                    value={formDialect}
                    onChange={(e) => setFormDialect(e.target.value as LanguageDialect)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                  >
                    <option value="Bhojpuri">भोजपुरी (Bhojpuri)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Gujarati">ગુજરાતી (Gujarati)</option>
                    <option value="Marathi">मराठी (Marathi)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                    <option value="Bengali">বাংলা (Bengali)</option>
                    <option value="Haryanvi">हरियाणवी (Haryanvi)</option>
                    <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ABHA ID (Ayushman Bharat Health Account)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 91-4820-9182-3849"
                      value={formAbha}
                      onChange={(e) => {
                        setFormAbha(e.target.value);
                        checkDuplicateOnForm(formPhone, e.target.value, formName, formDistrict);
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAbha}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Generate New ABHA
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(duplicateWarning)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    duplicateWarning
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register & Open for Intake</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LONGITUDINAL RECORD VIEWER */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedPatientForHistory.name}</h4>
                  <p className="text-xs text-slate-600">
                    ABHA: <span className="font-mono font-bold text-emerald-700">{selectedPatientForHistory.abhaId}</span> • Registered on {selectedPatientForHistory.registeredAt}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectPatientForCheckup(selectedPatientForHistory, true);
                    audioSynth.playConfirmChime();
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Add New Follow-Up Checkup for this Patient</span>
                </button>
              </div>

              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                {(!selectedPatientForHistory.visitHistory || selectedPatientForHistory.visitHistory.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No past visits recorded yet for this patient. Start their first intake checkup now.
                  </div>
                ) : (
                  selectedPatientForHistory.visitHistory.map((visit, idx) => (
                    <div key={idx} className="relative space-y-1.5">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {visit.visitDate} • {visit.opdDepartment}
                          </span>
                          <span className="text-[10px] bg-slate-100 font-mono px-2 py-0.5 rounded-md text-slate-600">
                            {visit.visitId}
                          </span>
                        </div>

                        <div className="text-slate-800">
                          <strong className="text-slate-900">Chief Complaint:</strong> {visit.chiefComplaint}
                        </div>

                        <div className="text-slate-600">
                          <strong>Vitals:</strong> {visit.vitalsSummary} | <strong>Prakriti:</strong> {visit.prakritiDosha}
                        </div>

                        {visit.doctorNotes && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700 italic">
                            Doctor Notes: {visit.doctorNotes}
                          </div>
                        )}

                        {visit.prescribedMeds && visit.prescribedMeds.length > 0 && (
                          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-emerald-950 font-mono text-[11px]">
                            <strong>Prescriptions:</strong> {visit.prescribedMeds.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
