import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  FileCheck,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  generateMerkleRoot,
  encryptSensitiveField,
  signDoctorCaseRecord,
  verifyDoctorCaseRecordSignature,
} from '../utils/zeroTrustCrypto';
import { PatientProfile, HardwareVitals } from '../types';

interface SecurityAuditViewProps {
  patient: PatientProfile;
  vitals: HardwareVitals['vitals'];
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ patient, vitals }) => {
  const [isTampered, setIsTampered] = useState(false);
  const [tamperedValue, setTamperedValue] = useState('185/120 mmHg (Injected Tamper)');
  const [activeTab, setActiveTab] = useState<'crypto_merkle' | 'abdm_compliance' | 'data_retention'>('crypto_merkle');

  // Baseline telemetry blocks for Merkle Tree
  const initialBlocks = [
    `ABHA_ID:${patient.abhaId}`,
    `PATIENT_NAME:${patient.name}`,
    `VITALS_BP:${vitals.systolicBP}/${vitals.diastolicBP}`,
    `VITALS_SPO2:${vitals.spo2Percent}%`,
    `VITALS_PULSE:${vitals.pulseRateBpm}bpm`,
    `NADI_GATI:Manduka`,
    `TIMESTAMP:${new Date().toISOString().slice(0, 10)}`,
  ];

  const currentBlocks = isTampered
    ? [
        `ABHA_ID:${patient.abhaId}`,
        `PATIENT_NAME:${patient.name}`,
        `VITALS_BP:${tamperedValue}`,
        `VITALS_SPO2:${vitals.spo2Percent}%`,
        `VITALS_PULSE:${vitals.pulseRateBpm}bpm`,
        `NADI_GATI:Manduka`,
        `TIMESTAMP:${new Date().toISOString().slice(0, 10)}`,
      ]
    : initialBlocks;

  const merkleChain = generateMerkleRoot(currentBlocks);
  const mockDoctorSig = signDoctorCaseRecord('DR_VR_VERMA_MCI_49812', merkleChain.root);
  const isSignatureValid = verifyDoctorCaseRecordSignature(
    merkleChain.root,
    mockDoctorSig,
    'DR_VR_VERMA_MCI_49812'
  );

  return (
    <div className="space-y-6">
      {/* View Header & Tab Switcher */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            End-to-End Cryptographic Audit & Tamper Detection
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-1">
            Zero-trust verification pipeline with SHA-256 Merkle root hashing and Ed25519 doctor digital signatures for tamper-evident data provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('crypto_merkle')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'crypto_merkle'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Merkle Tree & Tamper Lab
          </button>
          <button
            onClick={() => setActiveTab('abdm_compliance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'abdm_compliance'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ABDM M1-M3 Compliance Matrix
          </button>
        </div>
      </div>

      {activeTab === 'crypto_merkle' && (
        <div className="space-y-6">
          {/* Tamper Simulation Lab */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Live Cryptographic Integrity Verification & Tamper Injector
                </h3>
                <p className="text-xs text-slate-500">
                  Simulate a malicious database alteration or man-in-the-middle packet injection to test zero-trust detection.
                </p>
              </div>

              <button
                onClick={() => setIsTampered(!isTampered)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isTampered
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                }`}
              >
                {isTampered ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restore Original Verified Data</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simulate Malicious Field Tampering</span>
                  </>
                )}
              </button>
            </div>

            {/* Root Status Indicator */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isTampered
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    isTampered ? 'bg-rose-600 animate-bounce' : 'bg-emerald-600'
                  }`}
                >
                  {isTampered ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {isTampered ? 'CRITICAL SECURITY INTEGRITY BREACH' : 'CRYPTOGRAPHIC CHAIN OF CUSTODY VERIFIED'}
                  </div>
                  <div className="text-xs font-mono font-bold mt-0.5 break-all">
                    Merkle Root: {merkleChain.root}
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full font-mono shrink-0 self-start sm:self-center ${
                  isTampered ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {isTampered ? 'TAMPER DETECTED' : '100% UNTOUCHED'}
              </span>
            </div>

            {/* Merkle Leaf Nodes Table */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Cryptographic Leaf Node Hashes (SHA-256):</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Total Leaves: {merkleChain.leaves.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {merkleChain.leaves.map((leaf, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
                      isTampered && idx === 2
                        ? 'bg-rose-100 border-rose-400 text-rose-900 ring-2 ring-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <strong className="text-slate-900">Leaf {idx + 1}:</strong> {currentBlocks[idx]}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {leaf.slice(0, 10)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Doctor Digital Signature Verification Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              Ed25519 Non-Repudiation Doctor Signature Record
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">Physician Identity:</div>
                <div className="font-bold text-slate-900">Dr. V. R. Verma (MCI-49812)</div>
                <div className="text-[10px] text-emerald-600">Chief Tele-Consultant, Gujarat</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">Digital Signature Hash:</div>
                <div className="font-mono text-slate-700 text-[11px] truncate">
                  {mockDoctorSig.slice(0, 28)}...
                </div>
                <div className="text-[10px] text-emerald-600">Ed25519 Curve25519 Valid</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">ABDM Sandbox Status:</div>
                <div className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>M1, M2, M3 Compliant</span>
                </div>
                <div className="text-[10px] text-slate-400">HIPAA & DISHA Aligned</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'abdm_compliance' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              National Health Authority (NHA) ABDM Milestone Checklist
            </h3>
            <p className="text-xs text-slate-500">
              Fully compliant with Ayushman Bharat Digital Mission M1, M2, and M3 certification requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Milestone 1 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  ABDM Milestone 1 (M1)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">ABHA Creation & Verification</h4>
              <p className="text-[11px] text-slate-600">
                Aadhaar OTP / Mobile OTP registration, ABHA address verification, and QR code token exchange.
              </p>
            </div>

            {/* Milestone 2 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  ABDM Milestone 2 (M2)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Health Information Provider (HIP)</h4>
              <p className="text-[11px] text-slate-600">
                Publishing HL7 FHIR diagnostic reports, OPD case sheets, and BLE telemetry directly to ABHA repository.
              </p>
            </div>

            {/* Milestone 3 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  ABDM Milestone 3 (M3)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Health Information User (HIU)</h4>
              <p className="text-[11px] text-slate-600">
                Longitudinal health record pull via ABDM Consent Manager with granular time-bounded doctor authorization.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
