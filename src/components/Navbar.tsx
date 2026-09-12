import React from 'react';
import {
  Shield,
  Activity,
  HeartPulse,
  Lock,
  User,
  Stethoscope,
  MapPin,
  Flame,
  Radio,
  FileCheck,
  Languages,
  AlertTriangle,
  Leaf,
  Layers,
  Sparkles,
  ChevronDown,
  Building2,
  Grid,
  Moon,
  Sun,
  Camera,
  FileText,
  Bell,
  Database,
  AlertOctagon,
  PhoneCall,
  Pill,
} from 'lucide-react';
import { PatientProfile, GisEnvironment, UserRole, NavigationTab, LanguageDialect } from '../types';
import { GIS_PRESETS } from '../data/medicalCorpus';
import { RuralConnectivityBadge } from './RuralConnectivityBadge';
import { StateCityLocationSelector } from './StateCityLocationSelector';
import { getTranslation } from '../utils/translations';

interface NavbarProps {
  patient: PatientProfile;
  onPatientChange: React.Dispatch<React.SetStateAction<PatientProfile>>;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  gisContext: GisEnvironment;
  onGisChange: (gis: GisEnvironment) => void;
  redFlagActive: boolean;
  onOpenPatientRegistry?: () => void;
  onStartCleanSession?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  patient,
  onPatientChange,
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  gisContext,
  onGisChange,
  redFlagActive,
  onOpenPatientRegistry,
  onStartCleanSession,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const t = getTranslation(patient.dialect);

  const handleDialectChange = (dialect: LanguageDialect) => {
    onPatientChange((prev) => ({ ...prev, dialect }));
  };

  const handleToggleSensitive = () => {
    onPatientChange((prev) => ({ ...prev, isSensitiveMode: !prev.isSensitiveMode }));
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs">
      {/* Top Government & System Context Bar */}
      <div className="bg-slate-950 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            National Health Mission • Ministry of Ayush & AIIA
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden md:inline text-[11px]">
            ArogyaMitra (MediKiosk) — AI Multilingual Clinical Intake & Pre-Consultation System
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active GIS Outbreak Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-0.5 rounded-full text-slate-300 border border-slate-800">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium">
              {gisContext.city}: {gisContext.activeOutbreaks[0]?.disease.split(' ')[1] || 'Surveillance Active'}
            </span>
          </div>

          {/* Red Flag indicator */}
          {redFlagActive && (
            <div className="flex items-center gap-1 text-[11px] text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-700 animate-pulse font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Red Flag Active</span>
            </div>
          )}

          {/* Rural Connectivity & Local Storage Cache Status Badge */}
          <RuralConnectivityBadge />

          {/* Differentiator Tag */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
            <Shield className="w-3 h-3" />
            <span>Trust-First / Confidence-Scored</span>
          </div>
        </div>
      </div>

      {/* Main App Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3.5">
          <div
            onClick={() => onTabChange('BODY_MAP')}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md ring-2 ring-emerald-500/20 cursor-pointer hover:opacity-95 transition-all"
          >
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                onClick={() => onTabChange('BODY_MAP')}
                className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display cursor-pointer hover:text-emerald-700 transition-colors"
              >
                ArogyaMitra
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                MediKiosk
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              We don't replace the doctor. We empower the doctor.
            </p>
          </div>
        </div>

        {/* Global Controls: Location, Dialect, Role, Patient */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Patient Profile & Deduplication Switcher */}
          {onOpenPatientRegistry && (
            <button
              onClick={onOpenPatientRegistry}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-300 transition-all cursor-pointer shadow-2xs group"
              title="ABDM Patient Records: Lookup or Start Repeat Checkup (Zero Duplication)"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                {patient.name ? patient.name.charAt(0) : 'P'}
              </div>
              <div className="text-left">
                <div className="leading-tight font-bold flex items-center gap-1">
                  <span className="truncate max-w-[100px] sm:max-w-[120px]">{patient.name || 'New Patient'}</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-850 font-mono px-1.5 py-0.2 rounded-md font-semibold">
                    {patient.visitHistory?.length ?? patient.pastVisitsCount ?? 0}V
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 underline hidden sm:inline ml-0.5 group-hover:text-emerald-900">
                {t.switchCheckIn || 'Check-In / Switch'}
              </span>
            </button>
          )}

          {/* Clean Session Reset Button */}
          {onStartCleanSession && (
            <button
              onClick={onStartCleanSession}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer"
              title="Start a fresh empty checkup session without carrying over past data"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          )}

          {/* All India State & City GIS Outbreak Selector */}
          <StateCityLocationSelector
            gisContext={gisContext}
            onGisChange={onGisChange}
            patient={patient}
            onPatientChange={onPatientChange}
          />

          {/* Dialect / Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Languages className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={patient.dialect}
              onChange={(e) => handleDialectChange(e.target.value as LanguageDialect)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="Bhojpuri">भोजपुरी (Bhojpuri)</option>
              <option value="Hindi">हिन्दी (Hindi)</option>
              <option value="Awadhi">अवधी (Awadhi)</option>
              <option value="Braj">ब्रज (Braj)</option>
              <option value="Haryanvi">हरियाणवी (Haryanvi)</option>
              <option value="Bengali">বাংলা (Bengali)</option>
              <option value="Marathi">मराठी (Marathi)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="Telugu">తెలుగు (Telugu)</option>
              <option value="Gujarati">ગુજરાતી (Gujarati)</option>
              <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="English">English</option>
            </select>
          </div>

          {/* Sensitive Disclosure Mode Button */}
          <button
            onClick={handleToggleSensitive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              patient.isSensitiveMode
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
            title="Toggle Empathetic Sensitive Disclosure Mode"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{patient.isSensitiveMode ? 'Sensitive: ON' : 'Sensitive Mode'}</span>
            <span className="sm:hidden">{patient.isSensitiveMode ? 'Sens. ON' : 'Sens.'}</span>
          </button>

          {/* Role Switcher (RBAC) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => {
                onRoleChange('ASHA_WORKER');
                onTabChange('BODY_MAP');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                currentRole === 'ASHA_WORKER'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Kiosk</span>
            </button>
            <button
              onClick={() => {
                onRoleChange('DOCTOR');
                onTabChange('DOCTOR_WORKSTATION');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                currentRole === 'DOCTOR'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor OPD</span>
            </button>
          </div>

          {/* Quick SOS Button */}
          <button
            onClick={() => onTabChange('EMERGENCY_ASSIST')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-xs transition-transform active:scale-95 cursor-pointer animate-pulse"
          >
            <AlertOctagon className="w-3.5 h-3.5 fill-white" />
            <span>Emergency SOS</span>
          </button>

          {/* Dark Mode Toggle Button */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isDarkMode
                  ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border-amber-400/40 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span className="hidden md:inline font-bold text-amber-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline font-bold text-slate-700">Dark</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Module Navigation Bar with Localized Labels & Sequential Flow */}
      <div className="bg-slate-50 border-t border-slate-200 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-start gap-1">
          {[
            { id: 'BODY_MAP' as NavigationTab, label: t.tabBodyMap, icon: Activity },
            { id: 'ADAPTIVE_QUESTIONING' as NavigationTab, label: t.tabAdaptiveQuestions, icon: Radio },
            { id: 'HARDWARE_VITALS' as NavigationTab, label: t.tabHardwareVitals, icon: HeartPulse },
            { id: 'PRESCRIPTION_OCR' as NavigationTab, label: t.tabPrescriptionOcr, icon: FileCheck },
            { id: 'AYUSH_PRAKRITI' as NavigationTab, label: t.tabAyushPrakriti, icon: Leaf },
            { id: 'DOCTOR_WORKSTATION' as NavigationTab, label: t.tabDoctorWorkstation, icon: Stethoscope },
            { id: 'MEDICINE_SCHEDULE' as NavigationTab, label: t.tabMedicineSchedule, icon: Bell },
            { id: 'PRESCRIPTION_ASSISTANT' as NavigationTab, label: t.tabPrescriptionAssistant, icon: FileText },
            { id: 'MEDICINE_SCANNER' as NavigationTab, label: t.tabMedicineScanner, icon: Camera },
            { id: 'MEDICINE_INFO' as NavigationTab, label: t.tabMedicineInfo, icon: Database },
            { id: 'EMERGENCY_ASSIST' as NavigationTab, label: t.tabEmergencyAssist, icon: AlertOctagon },
            { id: 'ANTI_HALLUCINATION' as NavigationTab, label: t.tabAntiHallucination, icon: Shield },
            { id: 'SECURITY_AUDIT' as NavigationTab, label: t.tabSecurityAudit, icon: Lock },
          ].map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
