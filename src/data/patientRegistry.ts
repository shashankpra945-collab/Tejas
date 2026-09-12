import {
  PatientProfile,
  LongitudinalVisitNode,
  MedicationAdherenceItem,
  MedicationDoseLog,
  MedicationDoseStatus,
  LongitudinalAdherenceSummary,
  LanguageDialect,
} from '../types';

// Helper to generate realistic 14-day adherence log grids
function generateSampleLogs(pattern: 'HIGH' | 'MODERATE' | 'POOR', timeSlot: 'Morning' | 'Afternoon' | 'Night'): MedicationDoseLog[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const logs: MedicationDoseLog[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = days[d.getDay()];
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    let status: MedicationDoseStatus = 'TAKEN';
    if (pattern === 'POOR') {
      if (i === 1 || i === 2 || i === 5 || i === 8 || i === 9 || i === 12) {
        status = 'MISSED';
      } else if (i === 4 || i === 7) {
        status = 'DELAYED';
      }
    } else if (pattern === 'MODERATE') {
      if (i === 3 || i === 8) {
        status = 'MISSED';
      } else if (i === 1 || i === 6) {
        status = 'DELAYED';
      }
    } else {
      // HIGH
      if (i === 6) {
        status = 'DELAYED';
      }
    }

    logs.push({
      date: dateStr,
      dayOfWeek,
      timeSlot,
      status,
      loggedAt: status === 'TAKEN' ? '08:15 AM' : status === 'DELAYED' ? '11:40 AM' : undefined,
      notes: status === 'MISSED' ? 'Reported missed dose (forgotten during farm work)' : undefined,
    });
  }
  return logs;
}

export function createCleanEmptyPatient(dialect: LanguageDialect = 'Hindi'): PatientProfile {
  return {
    id: `pat_${Date.now()}`,
    abhaId: '',
    name: 'New Patient',
    age: 0,
    gender: 'Other',
    phone: '',
    phoneNumber: '',
    district: '',
    state: '',
    dialect: dialect,
    literacyLevel: 'Non-literate (Visual/Voice only)',
    isSensitiveMode: false,
    registeredAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    pastVisitsCount: 0,
    bloodGroup: '',
    knownAllergies: [],
    medicalConditions: [],
    storedMedicines: [],
    currentAdherenceSchedule: [],
    scannedMedicineRecords: [],
    prescriptionExplanations: [],
    visitHistory: [],
  };
}

export const INITIAL_PATIENTS: PatientProfile[] = [];

const STORAGE_KEY = 'arogyamitra_patients_registry';

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function normalizeAbha(abha: string): string {
  return abha.replace(/[^0-9]/g, '');
}

export function getStoredPatients(): PatientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(
          (p: any) =>
            p &&
            p.id !== 'pat_surat_9102' &&
            p.id !== 'pat_ahmedabad_8821' &&
            p.id !== 'pat_rajkot_5541' &&
            p.name !== 'Shanti Devi' &&
            p.name !== 'Ramesh Patel' &&
            p.name !== 'Geeta Varma'
        );
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to read patients from localStorage:', e);
  }
  return INITIAL_PATIENTS;
}

export function saveStoredPatients(patients: PatientProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.warn('Failed to save patients to localStorage:', e);
  }
}

export function clearAllPatientSessionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('arogyamitra_active_session_cache');
    localStorage.removeItem('arogya_current_patient_id');
  } catch (e) {
    console.warn('Failed to clear localStorage patient data:', e);
  }
}

/**
 * Calculates longitudinal adherence summary metrics for a patient's prescription schedule.
 */
export function calculateAdherenceMetrics(schedule: MedicationAdherenceItem[]): LongitudinalAdherenceSummary {
  if (!schedule || schedule.length === 0) {
    return {
      overallAdherenceRate: 100,
      activePrescriptionCount: 0,
      highComplianceCount: 0,
      moderateComplianceCount: 0,
      criticalNonComplianceCount: 0,
      nonComplianceRiskFlag: false,
      adherenceTrend: 'STABLE',
      lastComplianceCheckDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      topBarriers: ['No active medications'],
    };
  }

  let totalScore = 0;
  let highCount = 0;
  let modCount = 0;
  let critCount = 0;
  const barriers: string[] = [];

  schedule.forEach((m) => {
    totalScore += m.adherencePercent;
    if (m.adherencePercent >= 85) highCount++;
    else if (m.adherencePercent >= 60) modCount++;
    else critCount++;

    if (m.primaryNonComplianceReason && m.primaryNonComplianceReason !== 'None') {
      if (!barriers.includes(m.primaryNonComplianceReason)) {
        barriers.push(m.primaryNonComplianceReason);
      }
    }
  });

  const avgRate = Math.round(totalScore / schedule.length);
  const nonComplianceRiskFlag = critCount > 0 || avgRate < 70;

  return {
    overallAdherenceRate: avgRate,
    activePrescriptionCount: schedule.length,
    highComplianceCount: highCount,
    moderateComplianceCount: modCount,
    criticalNonComplianceCount: critCount,
    nonComplianceRiskFlag,
    adherenceTrend: avgRate >= 80 ? 'IMPROVING' : avgRate >= 65 ? 'STABLE' : 'DECLINING',
    lastComplianceCheckDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    topBarriers: barriers.length > 0 ? barriers : ['None reported'],
  };
}

/**
 * Updates a single dose log entry in a medication adherence schedule and synchronizes longitudinal statistics.
 */
export function updateMedicationDoseStatus(
  patientId: string,
  medicationId: string,
  logIndex: number,
  newStatus: MedicationDoseStatus,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = (pat.currentAdherenceSchedule || []).map((med) => {
        if (med.id === medicationId && med.recentDailyLogs && med.recentDailyLogs[logIndex]) {
          const updatedLogs = [...med.recentDailyLogs];
          updatedLogs[logIndex] = {
            ...updatedLogs[logIndex],
            status: newStatus,
            loggedAt: newStatus === 'TAKEN' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          };

          const takenCount = updatedLogs.filter((l) => l.status === 'TAKEN' || l.status === 'DELAYED').length;
          const totalLogged = updatedLogs.length;
          const calculatedPercent = Math.round((takenCount / (totalLogged || 1)) * 100);

          return {
            ...med,
            recentDailyLogs: updatedLogs,
            takenDoses: takenCount,
            missedDoses: totalLogged - takenCount,
            adherencePercent: calculatedPercent,
            adherenceTier: (calculatedPercent >= 85 ? 'HIGH_ADHERENCE' : calculatedPercent >= 60 ? 'MODERATE_ADHERENCE' : 'CRITICAL_NON_COMPLIANCE') as any,
          };
        }
        return med;
      });

      const adherenceSummary = calculateAdherenceMetrics(schedule);

      return {
        ...pat,
        currentAdherenceSchedule: schedule,
        longitudinalAdherenceSummary: adherenceSummary,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Adds a doctor clinical intervention / note to a specific medication adherence schedule.
 */
export function saveDoctorAdherenceIntervention(
  patientId: string,
  medicationId: string,
  notes: string,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = (pat.currentAdherenceSchedule || []).map((med) => {
        if (med.id === medicationId) {
          return {
            ...med,
            doctorInterventionNotes: notes,
          };
        }
        return med;
      });

      return {
        ...pat,
        currentAdherenceSchedule: schedule,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Adds a newly prescribed medication to a patient's active adherence schedule.
 */
export function addMedicationToPatientSchedule(
  patientId: string,
  newMedication: MedicationAdherenceItem,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  return addMultipleMedicationsToPatientSchedule(patientId, [newMedication], currentPatients);
}

/**
 * Checks if a patient already exists based on ABHA ID, Phone number, or exact Name + District match.
 */
export function findDuplicatePatient(
  query: { abhaId?: string; phone?: string; name?: string; district?: string },
  patients: PatientProfile[],
  excludeId?: string
): { matchType: 'ABHA' | 'PHONE' | 'NAME_DISTRICT'; patient: PatientProfile } | null {
  const cleanQueryAbha = query.abhaId ? normalizeAbha(query.abhaId) : '';
  const cleanQueryPhone = query.phone ? normalizePhone(query.phone) : '';
  const cleanQueryName = query.name ? query.name.trim().toLowerCase() : '';
  const cleanQueryDistrict = query.district ? query.district.trim().toLowerCase() : '';

  for (const pat of patients) {
    if (excludeId && pat.id === excludeId) continue;

    if (cleanQueryAbha && cleanQueryAbha.length >= 10) {
      const patAbha = normalizeAbha(pat.abhaId);
      if (patAbha && patAbha === cleanQueryAbha) {
        return { matchType: 'ABHA', patient: pat };
      }
    }

    if (cleanQueryPhone && cleanQueryPhone.length === 10) {
      const patPhone = normalizePhone(pat.phone || pat.phoneNumber || '');
      if (patPhone && patPhone === cleanQueryPhone) {
        return { matchType: 'PHONE', patient: pat };
      }
    }

    if (cleanQueryName && cleanQueryName.length >= 3 && cleanQueryDistrict) {
      const patName = pat.name.trim().toLowerCase();
      const patDist = pat.district.trim().toLowerCase();
      if (patName === cleanQueryName && patDist === cleanQueryDistrict) {
        return { matchType: 'NAME_DISTRICT', patient: pat };
      }
    }
  }

  return null;
}

/**
 * Appends a new consultation visit to an existing patient's longitudinal EHR timeline without creating a duplicate patient.
 */
export function appendVisitToPatientRecord(
  patientId: string,
  newVisit: LongitudinalVisitNode,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const history = pat.visitHistory || [];
      const updatedHistory = [newVisit, ...history];
      return {
        ...pat,
        pastVisitsCount: updatedHistory.length,
        visitHistory: updatedHistory,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Registers a new patient after verifying no duplicate exists.
 */
export function registerNewPatientRecord(
  newProfile: Omit<PatientProfile, 'id' | 'registeredAt' | 'pastVisitsCount' | 'visitHistory'>,
  currentPatients: PatientProfile[]
): { success: boolean; error?: string; existingPatient?: PatientProfile; patient?: PatientProfile; updatedList?: PatientProfile[] } {
  const duplicate = findDuplicatePatient(
    { abhaId: newProfile.abhaId, phone: newProfile.phone, name: newProfile.name, district: newProfile.district },
    currentPatients
  );

  if (duplicate) {
    return {
      success: false,
      error: `Patient already exists in the system (Matched by ${duplicate.matchType}: ${duplicate.patient.name}, ABHA: ${duplicate.patient.abhaId}). Cannot create duplicate record. Load existing patient to add follow-up checkup.`,
      existingPatient: duplicate.patient,
    };
  }

  const newPatient: PatientProfile = {
    ...newProfile,
    id: `pat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    registeredAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    pastVisitsCount: 0,
    visitHistory: [],
    currentAdherenceSchedule: [],
    longitudinalAdherenceSummary: {
      overallAdherenceRate: 100,
      activePrescriptionCount: 0,
      highComplianceCount: 0,
      moderateComplianceCount: 0,
      criticalNonComplianceCount: 0,
      nonComplianceRiskFlag: false,
      adherenceTrend: 'STABLE',
      lastComplianceCheckDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      topBarriers: [],
    },
  };

  const updatedList = [newPatient, ...currentPatients];
  saveStoredPatients(updatedList);

  return {
    success: true,
    patient: newPatient,
    updatedList,
  };
}

/**
 * Saves a verified scanned medicine record to the patient's longitudinal record
 * and automatically integrates it into their Stored Medicines repository.
 */
export function saveScannedMedicineToPatient(
  patientId: string,
  record: import('../types').ScannedMedicineRecord,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const existingScans = pat.scannedMedicineRecords || [];
      const updatedScans = [record, ...existingScans];

      // Also create or update in storedMedicines if verified
      const existingStored = pat.storedMedicines || [];
      const alreadyStoredIndex = existingStored.findIndex(
        (m) => m.name.toLowerCase().includes(record.medicineName.toLowerCase()) ||
               record.medicineName.toLowerCase().includes(m.name.toLowerCase())
      );

      let updatedStored = [...existingStored];
      if (alreadyStoredIndex >= 0) {
        updatedStored[alreadyStoredIndex] = {
          ...updatedStored[alreadyStoredIndex],
          lastPrescribedDate: record.scannedAt.split(',')[0],
          usageHistory: [
            {
              date: record.scannedAt.split(',')[0],
              event: 'Packaging Verified via AI Scanner',
              notes: `Batch: ${record.batchNumber || 'N/A'}, Expiry: ${record.expiryDate || 'N/A'}, Form: ${record.formType}`,
            },
            ...updatedStored[alreadyStoredIndex].usageHistory,
          ],
        };
      } else {
        const newStoredItem: import('../types').StoredMedicineInfo = {
          id: `stored_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: `${record.medicineName} (${record.strength || record.formType})`,
          genericName: record.genericName || record.medicineName,
          purpose: `Packaging verified medicine for ${pat.medicalConditions?.[0] || 'clinical management'}`,
          prescribedDosage: record.strength ? `${record.strength} as directed` : 'As directed by physician',
          patientInstructions: 'Swallow with plain water. Store below 25°C away from direct sunlight.',
          commonSideEffects: ['Refer to packaging insert or consult pharmacist'],
          importantWarnings: [
            record.isExpired
              ? 'CRITICAL WARNING: This medicine packaging indicates an EXPIRED batch. Do not consume.'
              : 'Ensure batch authenticity and inspect foil seal before consuming.',
          ],
          interactions: [],
          allergiesAndContraindications: [],
          previousPrescriptionCount: 1,
          lastPrescribedDate: record.scannedAt.split(',')[0],
          prescribedByDoctor: pat.primaryDoctorContact?.name || 'Verified via Packaging Scan',
          usageHistory: [
            {
              date: record.scannedAt.split(',')[0],
              event: 'Scanned & Saved to Profile',
              notes: `Verified batch ${record.batchNumber} with expiry ${record.expiryDate}`,
            },
          ],
          isCurrentlyActive: !record.isExpired,
          source: 'SCANNER',
        };
        updatedStored = [newStoredItem, ...updatedStored];
      }

      return {
        ...pat,
        scannedMedicineRecords: updatedScans,
        storedMedicines: updatedStored,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Saves a new or updated stored medicine profile
 */
export function addStoredMedicineToPatient(
  patientId: string,
  medicineInfo: import('../types').StoredMedicineInfo,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const existing = pat.storedMedicines || [];
      const filtered = existing.filter((m) => m.id !== medicineInfo.id);
      return {
        ...pat,
        storedMedicines: [medicineInfo, ...filtered],
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Saves a generated prescription explanation and automatically syncs prescribed medicines to active adherence schedule
 */
export function savePrescriptionExplanationToPatient(
  patientId: string,
  explanation: import('../types').PrescriptionExplanationItem,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const existingExplanations = pat.prescriptionExplanations || [];
      const currentSchedule = pat.currentAdherenceSchedule || [];

      // Convert prescribed medicines into MedicationAdherenceItem
      const newScheduleItems: import('../types').MedicationAdherenceItem[] = (
        explanation.prescribedMedicines || []
      ).map((med, idx) => {
        const slotTiming =
          med.timelineSlot === 'Morning'
            ? 'Morning (After Breakfast)'
            : med.timelineSlot === 'Afternoon'
            ? 'Afternoon'
            : 'Night (HS)';

        const durationDays = parseInt(med.duration) || 14;
        const dosesPerDay =
          med.frequency?.includes('Twice') || med.frequency?.includes('BD')
            ? 2
            : med.frequency?.includes('Thrice') || med.frequency?.includes('TDS')
            ? 3
            : 1;

        return {
          id: `med_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          medicationName: med.medicineName,
          genericFormula: med.genericFormula || med.medicineName,
          category: 'General',
          dosageRegimen: `${med.dosage} • ${med.mealTiming || 'After Food'} (${med.frequency || 'OD'})`,
          dosage: med.dosage || '1 tablet',
          timing: slotTiming,
          mealRelation: med.mealTiming || 'After Food',
          frequency: med.frequency || 'OD',
          duration: med.duration || '7 days',
          specialInstructions: med.specialInstructions || 'Take with clean drinking water as directed.',
          startDate: new Date().toLocaleDateString('en-GB'),
          durationDays,
          totalPrescribedDoses: durationDays * dosesPerDay,
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

      // Avoid duplicates by medicine name
      const existingNames = new Set(
        currentSchedule.map((s) => s.medicationName.toLowerCase().trim())
      );
      const uniqueNewItems = newScheduleItems.filter(
        (item) => !existingNames.has(item.medicationName.toLowerCase().trim())
      );

      const updatedSchedule = [...uniqueNewItems, ...currentSchedule];

      return {
        ...pat,
        prescriptionExplanations: [explanation, ...existingExplanations],
        currentAdherenceSchedule: updatedSchedule,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Updates an existing medication item in the patient's adherence schedule
 */
export function updateMedicationInPatientSchedule(
  patientId: string,
  medicationId: string,
  updatedFields: Partial<import('../types').MedicationAdherenceItem>,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = pat.currentAdherenceSchedule || [];
      const updatedSchedule = schedule.map((item) => {
        if (item.id === medicationId) {
          return { ...item, ...updatedFields };
        }
        return item;
      });
      return {
        ...pat,
        currentAdherenceSchedule: updatedSchedule,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Deletes a medication item from the patient's adherence schedule
 */
export function deleteMedicationFromPatientSchedule(
  patientId: string,
  medicationId: string,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = pat.currentAdherenceSchedule || [];
      const updatedSchedule = schedule.filter((item) => item.id !== medicationId);
      return {
        ...pat,
        currentAdherenceSchedule: updatedSchedule,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Adds multiple medications into schedule (e.g. from Doctor Summary recommendations)
 */
export function addMultipleMedicationsToPatientSchedule(
  patientId: string,
  newMeds: import('../types').MedicationAdherenceItem[],
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = pat.currentAdherenceSchedule || [];
      const newMedsMap = new Map<string, MedicationAdherenceItem>();
      newMeds.forEach((m) => {
        newMedsMap.set(m.medicationName.toLowerCase().trim(), m);
      });

      // Filter out existing medications that are being updated by new ones
      const remainingExisting = schedule.filter(
        (s) => !newMedsMap.has(s.medicationName.toLowerCase().trim()) && !newMeds.some((m) => m.id === s.id)
      );

      const updatedSchedule = [...newMeds, ...remainingExisting];
      const adherenceSummary = calculateAdherenceMetrics(updatedSchedule);

      return {
        ...pat,
        currentAdherenceSchedule: updatedSchedule,
        longitudinalAdherenceSummary: adherenceSummary,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Toggles remindersEnabled on a scheduled medication
 */
export function toggleMedicationReminder(
  patientId: string,
  medicationId: string,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = pat.currentAdherenceSchedule || [];
      const updatedSchedule = schedule.map((item) => {
        if (item.id === medicationId) {
          return { ...item, remindersEnabled: item.remindersEnabled === false ? true : false };
        }
        return item;
      });
      return {
        ...pat,
        currentAdherenceSchedule: updatedSchedule,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Updates a medication dose status (TAKEN, MISSED, SKIPPED, SNOOZED) from active reminder system
 */
export function recordActiveMedicationDose(
  patientId: string,
  medicationId: string,
  status: import('../types').MedicationDoseStatus,
  currentPatients: PatientProfile[],
  targetSlot?: string
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  const updatedPatientsList = currentPatients.map((pat) => {
    if (pat.id === patientId) {
      const schedule = pat.currentAdherenceSchedule || [];
      const updatedSchedule = schedule.map((item) => {
        if (item.id === medicationId) {
          const logs = item.recentDailyLogs || [];
          const now = new Date();
          const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const assignedSlot = targetSlot || (item.timing.toLowerCase().includes('night') ? 'Night' : item.timing.toLowerCase().includes('evening') ? 'Evening' : item.timing.toLowerCase().includes('afternoon') ? 'Afternoon' : 'Morning');

          const newLog: import('../types').MedicationDoseLog = {
            date: 'Today',
            dayOfWeek: 'Today',
            timeSlot: assignedSlot,
            status,
            loggedAt: timeString,
          };

          // Filter out existing today log for this exact slot
          const filteredLogs = logs.filter((l) => !(l.date === 'Today' && l.timeSlot === assignedSlot));
          const newLogs = [newLog, ...filteredLogs];

          // Calculate counts
          const prevStatus = logs.find((l) => l.date === 'Today' && l.timeSlot === assignedSlot)?.status;
          let taken = item.takenDoses;
          let missed = item.missedDoses;

          if (prevStatus !== 'TAKEN' && status === 'TAKEN') {
            taken += 1;
            if (prevStatus === 'MISSED') missed = Math.max(0, missed - 1);
          } else if (prevStatus !== 'MISSED' && status === 'MISSED') {
            missed += 1;
            if (prevStatus === 'TAKEN') taken = Math.max(0, taken - 1);
          }

          const adherencePercent = Math.min(100, Math.round((taken / Math.max(1, taken + missed)) * 100));

          return {
            ...item,
            takenDoses: taken,
            missedDoses: missed,
            adherencePercent,
            recentDailyLogs: newLogs,
          };
        }
        return item;
      });

      const adherenceSummary = calculateAdherenceMetrics(updatedSchedule);

      return {
        ...pat,
        currentAdherenceSchedule: updatedSchedule,
        longitudinalAdherenceSummary: adherenceSummary,
      };
    }
    return pat;
  });

  const updatedPatient = updatedPatientsList.find((p) => p.id === patientId)!;
  saveStoredPatients(updatedPatientsList);
  return { updatedPatient, updatedPatientsList };
}

/**
 * Snoozes a medication dose with a reminder timeout
 */
export function snoozeMedicationDose(
  patientId: string,
  medicationId: string,
  snoozeMinutes: number,
  currentPatients: PatientProfile[]
): { updatedPatient: PatientProfile; updatedPatientsList: PatientProfile[] } {
  return recordActiveMedicationDose(patientId, medicationId, 'SNOOZED', currentPatients);
}

