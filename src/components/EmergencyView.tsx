import React, { useState } from 'react';
import {
  PhoneCall,
  AlertOctagon,
  Heart,
  Hospital,
  UserCheck,
  Share2,
  Copy,
  Check,
  MapPin,
  Clock,
  ShieldAlert,
  Droplet,
  AlertTriangle,
  Stethoscope,
  Activity,
  QrCode,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { PatientProfile } from '../types';
import {
  NATIONAL_EMERGENCY_HELPLINES,
  getEmergencyFacilitiesForCity,
  SUPPORTED_EMERGENCY_CITIES,
} from '../data/emergencyHospitalsData';

interface EmergencyViewProps {
  patient: PatientProfile;
  onNavigateToTab?: (tab: any) => void;
}

export const EmergencyView: React.FC<EmergencyViewProps> = ({ patient, onNavigateToTab }) => {
  const [selectedCity, setSelectedCity] = useState<string>(
    SUPPORTED_EMERGENCY_CITIES.find((c) => c.toLowerCase() === patient.district.toLowerCase()) || 'Surat'
  );
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [emergencyAlertActive, setEmergencyAlertActive] = useState(false);

  const cityEmergencyData = getEmergencyFacilitiesForCity(selectedCity);

  const activeMedicines = (patient.storedMedicines || [])
    .filter((m) => m.isCurrentlyActive)
    .map((m) => m.name);

  // Generate copyable text summary for ambulance / emergency paramedic
  const handleCopyEmergencySummary = () => {
    const text = `🚨 PATIENT EMERGENCY MEDICAL PROFILE (ArogyaMitra)
Name: ${patient.name} (${patient.age}y / ${patient.gender})
ABHA ID: ${patient.abhaId}
Blood Group: ${patient.bloodGroup || 'O+'}
District: ${patient.district}, ${patient.state}
Known Allergies: ${patient.knownAllergies?.join(', ') || 'None reported'}
Medical Conditions: ${patient.medicalConditions?.join(', ') || 'None'}
Active Medications: ${activeMedicines.join(', ') || 'None'}
Emergency Contact: ${patient.emergencyContact?.name || 'Kin'} (${patient.emergencyContact?.phone || patient.phone})
Primary Doctor: ${patient.primaryDoctorContact?.name || 'Duty Medical Officer'} (${patient.primaryDoctorContact?.phone || 'N/A'})
Generated via ArogyaMitra Tele-Triage System`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3500);
  };

  const handleTriggerSOS = () => {
    setEmergencyAlertActive(true);
    // Open tel:112
    window.location.href = 'tel:112';
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Instant Emergency SOS Bar (Minimal interaction design) */}
      <div className="bg-red-600 rounded-2xl p-5 text-white shadow-lg border-2 border-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
            <AlertOctagon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-red-200">
              Immediate Emergency Protocol
            </div>
            <h1 className="text-xl font-black tracking-tight">1-Click SOS Emergency Call</h1>
            <p className="text-xs text-red-100">
              Press to immediately dial National Emergency Response Center (112 / 108 Ambulance)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleTriggerSOS}
            className="flex-1 md:flex-none px-6 py-3.5 bg-white hover:bg-red-50 text-red-700 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 fill-red-700 animate-bounce" />
            <span>DIAL 112 (AMBULANCE / SOS)</span>
          </button>
          <button
            onClick={handleCopyEmergencySummary}
            className="px-4 py-3.5 bg-red-800/80 hover:bg-red-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-red-400 transition-colors cursor-pointer"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedSummary ? 'Profile Copied!' : 'Share Emergency Card'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Profile & Facilities Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Emergency Medical Profile Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border-2 border-red-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-600 fill-red-600" />
                <h2 className="text-sm font-bold text-slate-900">Patient Emergency Medical Profile</h2>
              </div>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                Critical Info Card
              </span>
            </div>

            {/* Patient Header & Blood Group */}
            <div className="p-4 bg-gradient-to-br from-red-50 via-slate-50 to-white rounded-xl border border-red-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{patient.name}</h3>
                <div className="text-xs text-slate-600 font-medium">
                  {patient.age} yrs • {patient.gender} • {patient.district}, {patient.state}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  ABHA: <strong>{patient.abhaId}</strong>
                </div>
              </div>

              {/* Large Blood Group Badge */}
              <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shadow-md shrink-0">
                <Droplet className="w-4 h-4 fill-white" />
                <span className="text-lg font-black">{patient.bloodGroup || 'O+'}</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-80">Blood</span>
              </div>
            </div>

            {/* Known Allergies Warning Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Known Drug & Environmental Allergies:
              </span>
              {patient.knownAllergies && patient.knownAllergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {patient.knownAllergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="text-xs font-bold px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-lg border border-amber-300"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600">No known drug allergies reported.</div>
              )}
            </div>

            {/* Chronic Medical Conditions */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                Pre-Existing Medical Conditions:
              </span>
              {patient.medicalConditions && patient.medicalConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {patient.medicalConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600">No pre-existing chronic conditions listed.</div>
              )}
            </div>

            {/* Active Medications List */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Current Active Medications:
              </span>
              {activeMedicines.length > 0 ? (
                <div className="space-y-1 text-xs text-slate-800 font-mono">
                  {activeMedicines.map((med, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-purple-600">•</span>
                      <span>{med}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">None currently recorded.</div>
              )}
            </div>

            {/* Emergency Kin & Doctor Contacts */}
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Emergency Kin Contact</div>
                  <div className="text-xs font-bold text-slate-900">
                    {patient.emergencyContact?.name || 'Kin (Family Member)'}
                  </div>
                  <div className="text-[11px] text-slate-600">{patient.emergencyContact?.phone || patient.phone}</div>
                </div>
                <a
                  href={`tel:${patient.emergencyContact?.phone || patient.phone}`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call Kin</span>
                </a>
              </div>

              {patient.primaryDoctorContact && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-purple-700 uppercase font-bold">Primary Treating Doctor</div>
                    <div className="text-xs font-bold text-slate-900">{patient.primaryDoctorContact.name}</div>
                    <div className="text-[11px] text-slate-500">{patient.primaryDoctorContact.specialty}</div>
                  </div>
                  <a
                    href={`tel:${patient.primaryDoctorContact.phone}`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Call Doctor</span>
                  </a>
                </div>
              )}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyEmergencySummary}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors cursor-pointer"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSummary ? 'Emergency Profile Copied to Clipboard!' : 'Copy Summary for Paramedics'}</span>
            </button>
          </div>

          {/* Quick Helplines Matrix */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              National Emergency Helplines:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {NATIONAL_EMERGENCY_HELPLINES.map((hl, i) => (
                <a
                  key={i}
                  href={`tel:${hl.number}`}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-red-400 bg-slate-50/70 hover:bg-red-50/40 transition-colors block"
                >
                  <div className="font-bold text-red-700 text-sm">{hl.number}</div>
                  <div className="font-semibold text-slate-900 text-[11px] truncate">{hl.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{hl.purpose}</div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Nearby Hospitals & On-Call Emergency Doctors */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-red-600" />
                  Emergency Facilities & Hospitals Nearby
                </h2>
                <p className="text-[11px] text-slate-500">
                  Real-time bed, oxygen, and 24x7 trauma facility tracking
                </p>
              </div>

              {/* City Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">City / District:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-red-500"
                >
                  {SUPPORTED_EMERGENCY_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Hospitals for Selected City */}
            <div className="space-y-3">
              {cityEmergencyData.hospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-red-300 transition-all space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{hosp.name}</span>
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                          {hosp.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{hosp.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${hosp.phone}`}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs shrink-0"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{hosp.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Bed & Infrastructure Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold">
                      ICU: {hosp.icuAvailable ? 'Available' : 'Limited'}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-semibold">
                      Ambulance: {hosp.ambulanceAvailable ? 'Active' : 'On Call'}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-semibold">
                      Blood Bank: {hosp.bloodBankAvailable ? '24x7 Available' : 'On Request'}
                    </span>
                    <span className="text-slate-500 font-mono ml-auto">
                      Distance: <strong>{hosp.distanceKm} km</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* On-Call Emergency Doctors */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-600" />
                Nearby On-Call Emergency Doctors ({cityEmergencyData.doctors.length})
              </h2>
              <span className="text-xs text-slate-500">{selectedCity} Network</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cityEmergencyData.doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-purple-300 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{doc.name}</div>
                      <div className="text-[11px] text-purple-700 font-medium">{doc.specialization}</div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        doc.isAvailableNow
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {doc.isAvailableNow ? '24x7 ON CALL' : 'SCHEDULED'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500">{doc.clinic}</div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Hours: {doc.availableHours}</span>
                    <a
                      href={`tel:${doc.phone}`}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{doc.phone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
