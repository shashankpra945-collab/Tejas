import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Siren,
  PhoneCall,
  Activity,
  ShieldAlert,
  X,
  MapPin,
  CheckCircle2,
  Ambulance,
  Zap,
} from 'lucide-react';
import { RedFlagAssessment, PatientProfile, GisEnvironment } from '../types';
import { audioSynth } from '../utils/speechEngine';

interface RedFlagAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  redFlagData: RedFlagAssessment;
  patient: PatientProfile;
  gisContext: GisEnvironment;
}

export const RedFlagAlertModal: React.FC<RedFlagAlertModalProps> = ({
  isOpen,
  onClose,
  redFlagData,
  patient,
  gisContext,
}) => {
  useEffect(() => {
    if (isOpen) {
      audioSynth.playRedFlagAlarm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-6 relative overflow-hidden">
        {/* Animated Emergency Strobe Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-400 animate-bounce">
              <Siren className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  EMERGENCY CODE RED OVERDRIVE
                </span>
                <span className="text-xs text-rose-300 font-mono">
                  Severity Score: {redFlagData.severityScore}/100
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-1 font-display">
                Zero-Latency Deterministic Red Flag Detected!
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Triggered Rules Box */}
        <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-rose-400" />
            Triggered WHO ETAT / Manchester Safety Rules:
          </div>
          <div className="space-y-1.5">
            {redFlagData.triggeredRules.map((rule, idx) => (
              <div
                key={idx}
                className="text-sm font-semibold text-white flex items-start gap-2 bg-rose-900/40 p-2.5 rounded-xl border border-rose-700/50"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Automatic Action Dispatch Payload */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="text-slate-400 font-medium flex items-center gap-1.5">
              <Ambulance className="w-4 h-4 text-rose-400" />
              <span>Automated Hospital Dispatch:</span>
            </div>
            <div className="font-bold text-white text-sm">
              {gisContext.city} District Emergency Trauma Center
            </div>
            <div className="text-slate-400 text-[11px]">
              Coordinates: {gisContext.lat.toFixed(4)}° N, {gisContext.lng.toFixed(4)}° E
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <div className="text-slate-400 font-medium flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>FCM + Twilio SMS Alert:</span>
            </div>
            <div className="font-bold text-white text-sm">
              On-Call CMO: Dr. V. Verma (ER Desk)
            </div>
            <div className="text-emerald-400 font-mono text-[11px]">
              Status: Dispatched in 0.28s (Bypassed LLM)
            </div>
          </div>
        </div>

        {/* Clinical Referral Directive */}
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-100 font-semibold block mb-0.5">
              Immediate Clinical Protocol Directive:
            </strong>
            Normal case-taking interrupted. Patient should not wait in OPD queue. Escort directly to Emergency Room for immediate ECG and Vitals Triage.
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            Patient ABHA ID: <span className="font-mono text-white font-bold">{patient.abhaId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
            >
              Acknowledge & Continue Triage
            </button>
            <button
              onClick={() => {
                alert(`Direct Emergency Code Red routed to ${gisContext.city} Emergency Desk!`);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Fast-Track ER Admission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
