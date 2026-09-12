import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Pill,
  Sun,
  Sunset,
  Moon,
  Check,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  FileText,
  AlertCircle,
  Utensils,
  Info,
  BellOff,
  BellRing,
  Coffee,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import {
  PatientProfile,
  MedicationDoseStatus,
  MedicationAdherenceItem,
  NavigationTab,
} from '../types';
import { speakTextNative } from '../utils/speechEngine';

export type ScheduleTimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface TimeSlotConfig {
  id: ScheduleTimeSlot;
  label: string;
  subLabel: string;
  timeDisplay: string;
  icon: React.ReactNode;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
  defaultHour: number;
}

export interface ResolvedDoseCard {
  medication: MedicationAdherenceItem;
  slot: ScheduleTimeSlot;
  slotLabel: string;
  timeDisplay: string;
  mealInstruction: string;
  status: 'TAKEN' | 'DUE' | 'UPCOMING' | 'MISSED';
  statusLabel: string;
  loggedAtTime?: string;
}

interface MedicineReminderScheduleViewProps {
  patient: PatientProfile;
  onUpdateDoseStatus: (medicationId: string, status: MedicationDoseStatus, targetSlot?: string) => void;
  onSnoozeDose: (medicationId: string, minutes: number) => void;
  onAddMedication?: (newMed: MedicationAdherenceItem | MedicationAdherenceItem[]) => void;
  onEditMedication?: (medId: string, updatedFields: Partial<MedicationAdherenceItem>) => void;
  onDeleteMedication?: (medId: string) => void;
  onToggleReminder?: (medId: string) => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

const TIME_SLOT_CONFIGS: Record<ScheduleTimeSlot, TimeSlotConfig> = {
  MORNING: {
    id: 'MORNING',
    label: 'Morning',
    subLabel: 'Breakfast / Empty Stomach',
    timeDisplay: '08:00 AM',
    icon: <Sun className="w-5 h-5 text-amber-600" />,
    headerBg: 'bg-amber-50/80 text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-900 border border-amber-200',
    badgeText: '08:00 AM',
    borderAccent: 'border-amber-200 hover:border-amber-400',
    defaultHour: 8,
  },
  AFTERNOON: {
    id: 'AFTERNOON',
    label: 'Afternoon',
    subLabel: 'Post Lunch / Midday',
    timeDisplay: '01:30 PM',
    icon: <Sunset className="w-5 h-5 text-orange-600" />,
    headerBg: 'bg-orange-50/80 text-orange-950',
    badgeBg: 'bg-orange-100 text-orange-900 border border-orange-200',
    badgeText: '01:30 PM',
    borderAccent: 'border-orange-200 hover:border-orange-400',
    defaultHour: 13,
  },
  EVENING: {
    id: 'EVENING',
    label: 'Evening',
    subLabel: 'Tea / Snacks / Pre-Dinner',
    timeDisplay: '06:00 PM',
    icon: <Coffee className="w-5 h-5 text-purple-600" />,
    headerBg: 'bg-purple-50/80 text-purple-950',
    badgeBg: 'bg-purple-100 text-purple-900 border border-purple-200',
    badgeText: '06:00 PM',
    borderAccent: 'border-purple-200 hover:border-purple-400',
    defaultHour: 18,
  },
  NIGHT: {
    id: 'NIGHT',
    label: 'Night',
    subLabel: 'Post Dinner / Bedtime (HS)',
    timeDisplay: '08:30 PM',
    icon: <Moon className="w-5 h-5 text-indigo-600" />,
    headerBg: 'bg-indigo-50/80 text-indigo-950',
    badgeBg: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    badgeText: '08:30 PM',
    borderAccent: 'border-indigo-200 hover:border-indigo-400',
    defaultHour: 20,
  },
};

// Play audio chime for reminders & marked taken using Web Audio API
function playReminderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.debug('Audio chime unable to initialize:', err);
  }
}

/**
 * Robustly maps any medication item to one or more daily time slots
 * Ensures NO medicine is ever hidden or lost
 */
function resolveSlotsForMedication(med: MedicationAdherenceItem): Array<{ slot: ScheduleTimeSlot; timeDisplay: string }> {
  const combined = `${med.timing || ''} ${med.frequency || ''} ${med.dosageRegimen || ''}`.toLowerCase();

  // Thrice daily (TDS / TID / 3 times / 1-1-1)
  if (
    combined.includes('thrice') ||
    combined.includes('tds') ||
    combined.includes('tid') ||
    combined.includes('3 times') ||
    combined.includes('1-1-1')
  ) {
    return [
      { slot: 'MORNING', timeDisplay: '08:00 AM' },
      { slot: 'AFTERNOON', timeDisplay: '01:30 PM' },
      { slot: 'NIGHT', timeDisplay: '08:30 PM' },
    ];
  }

  // Twice daily (BD / BID / Morning & Night / 1-0-1)
  if (
    combined.includes('twice') ||
    combined.includes('bd') ||
    combined.includes('bid') ||
    combined.includes('morning & night') ||
    combined.includes('morning and night') ||
    combined.includes('1-0-1')
  ) {
    return [
      { slot: 'MORNING', timeDisplay: '08:00 AM' },
      { slot: 'NIGHT', timeDisplay: '08:30 PM' },
    ];
  }

  const matches: Array<{ slot: ScheduleTimeSlot; timeDisplay: string }> = [];

  // Morning match
  if (
    combined.includes('morning') ||
    combined.includes('breakfast') ||
    combined.includes('empty stomach') ||
    combined.includes('empty') ||
    combined.includes('1-0-0') ||
    combined.includes('08:') ||
    combined.includes('8:') ||
    combined.includes('am')
  ) {
    matches.push({ slot: 'MORNING', timeDisplay: '08:00 AM' });
  }

  // Afternoon match
  if (
    combined.includes('afternoon') ||
    combined.includes('lunch') ||
    combined.includes('noon') ||
    combined.includes('daytime') ||
    combined.includes('0-1-0') ||
    combined.includes('01:') ||
    combined.includes('1:')
  ) {
    matches.push({ slot: 'AFTERNOON', timeDisplay: '01:30 PM' });
  }

  // Evening match
  if (
    combined.includes('evening') ||
    combined.includes('tea') ||
    combined.includes('snacks') ||
    combined.includes('dusk') ||
    combined.includes('05:') ||
    combined.includes('5:') ||
    combined.includes('06:') ||
    combined.includes('6:') ||
    combined.includes('6:00')
  ) {
    matches.push({ slot: 'EVENING', timeDisplay: '06:00 PM' });
  }

  // Night match
  if (
    combined.includes('night') ||
    combined.includes('hs') ||
    combined.includes('dinner') ||
    combined.includes('bedtime') ||
    combined.includes('sleep') ||
    combined.includes('0-0-1') ||
    combined.includes('08:30') ||
    combined.includes('09:') ||
    combined.includes('9:')
  ) {
    matches.push({ slot: 'NIGHT', timeDisplay: '08:30 PM' });
  }

  // Fallback: If no slots were detected, assign to Morning so it is never dropped
  if (matches.length === 0) {
    matches.push({ slot: 'MORNING', timeDisplay: '08:00 AM' });
  }

  return matches;
}

export const MedicineReminderScheduleView: React.FC<MedicineReminderScheduleViewProps> = ({
  patient,
  onUpdateDoseStatus,
  onSnoozeDose,
  onAddMedication,
  onEditMedication,
  onDeleteMedication,
  onToggleReminder,
  onNavigateToTab,
}) => {
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [activeSpeech, setActiveSpeech] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'SLOTS' | 'LIST'>('SLOTS');

  // Calendar / Date selection state
  type DateTabMode = 'TODAY' | 'TOMORROW' | 'UPCOMING' | 'CALENDAR';
  const [dateTab, setDateTab] = useState<DateTabMode>('TODAY');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationAdherenceItem | null>(null);

  // Form Fields
  const [medName, setMedName] = useState('');
  const [genericFormula, setGenericFormula] = useState('');
  const [dosage, setDosage] = useState('1 Tablet');
  const [timeSlot, setTimeSlot] = useState<
    'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Morning & Night' | 'Thrice Daily'
  >('Morning');
  const [mealRelation, setMealRelation] = useState<'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach'>('After Food');
  const [frequency, setFrequency] = useState('Once daily (OD)');
  const [duration, setDuration] = useState('7 days');
  const [specialInstructions, setSpecialInstructions] = useState('Take with full glass of drinking water.');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Keep time updated every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const scheduleItems = patient.currentAdherenceSchedule || [];

  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Date switching helpers
  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  const handleSelectDateTab = (tab: DateTabMode) => {
    setDateTab(tab);
    const today = new Date();
    if (tab === 'TODAY') {
      setSelectedDate(today);
    } else if (tab === 'TOMORROW') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      setSelectedDate(tomorrow);
    }
  };

  const handleStepDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
    setDateTab('CALENDAR');
  };

  // Generate resolved cards for the selected date
  const resolvedCards = useMemo<ResolvedDoseCard[]>(() => {
    const cards: ResolvedDoseCard[] = [];
    const currentHour = currentTime.getHours();

    scheduleItems.forEach((med) => {
      const slots = resolveSlotsForMedication(med);

      slots.forEach(({ slot, timeDisplay }) => {
        const slotConfig = TIME_SLOT_CONFIGS[slot];
        const slotName = slotConfig.label;

        // Check if there is an existing log for today in this slot
        const logs = med.recentDailyLogs || [];
        const todayLog = logs.find(
          (l) =>
            (l.date === 'Today' || l.date === selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })) &&
            (l.timeSlot === slotName || l.timeSlot === slot)
        );

        let status: 'TAKEN' | 'DUE' | 'UPCOMING' | 'MISSED' = 'UPCOMING';
        let statusLabel = `Upcoming at ${timeDisplay}`;
        let loggedAtTime: string | undefined = undefined;

        if (todayLog) {
          if (todayLog.status === 'TAKEN') {
            status = 'TAKEN';
            statusLabel = `Taken at ${todayLog.loggedAt || timeDisplay}`;
            loggedAtTime = todayLog.loggedAt || timeDisplay;
          } else if (todayLog.status === 'MISSED' || todayLog.status === 'SKIPPED') {
            status = 'MISSED';
            statusLabel = 'Missed / Skipped';
          }
        } else if (isSelectedDateToday) {
          // Calculate status based on current time
          const slotHour = slotConfig.defaultHour;
          if (currentHour >= slotHour && currentHour <= slotHour + 2) {
            status = 'DUE';
            statusLabel = `Due Now (${timeDisplay})`;
          } else if (currentHour > slotHour + 2) {
            status = 'MISSED';
            statusLabel = `Delayed / Missed (${timeDisplay})`;
          } else {
            status = 'UPCOMING';
            statusLabel = `Upcoming at ${timeDisplay}`;
          }
        } else {
          // Future date
          status = 'UPCOMING';
          statusLabel = `Scheduled for ${timeDisplay}`;
        }

        cards.push({
          medication: med,
          slot,
          slotLabel: slotName,
          timeDisplay,
          mealInstruction: med.mealRelation || 'After Food',
          status,
          statusLabel,
          loggedAtTime,
        });
      });
    });

    return cards;
  }, [scheduleItems, selectedDate, currentTime, isSelectedDateToday]);

  // Today's Medicines Summary Statistics
  const todayStats = useMemo(() => {
    const total = resolvedCards.length;
    const completed = resolvedCards.filter((c) => c.status === 'TAKEN').length;
    const remaining = Math.max(0, total - completed);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find the next upcoming or due dose
    const nextDose =
      resolvedCards.find((c) => c.status === 'DUE') ||
      resolvedCards.find((c) => c.status === 'UPCOMING') ||
      resolvedCards.find((c) => c.status === 'MISSED') ||
      null;

    return { total, completed, remaining, percent, nextDose };
  }, [resolvedCards]);

  // Filter cards by slot
  const morningCards = useMemo(() => resolvedCards.filter((c) => c.slot === 'MORNING'), [resolvedCards]);
  const afternoonCards = useMemo(() => resolvedCards.filter((c) => c.slot === 'AFTERNOON'), [resolvedCards]);
  const eveningCards = useMemo(() => resolvedCards.filter((c) => c.slot === 'EVENING'), [resolvedCards]);
  const nightCards = useMemo(() => resolvedCards.filter((c) => c.slot === 'NIGHT'), [resolvedCards]);

  // Actions
  const handleMarkTaken = (medId: string, medName: string, slotName: string) => {
    onUpdateDoseStatus(medId, 'TAKEN', slotName);
    playReminderChime();
    showToast(`Marked ${medName} as TAKEN for ${slotName}. Schedule updated!`);
  };

  const handleMarkNotTaken = (medId: string, medName: string, slotName: string) => {
    onUpdateDoseStatus(medId, 'SKIPPED', slotName);
    showToast(`Marked ${medName} as SKIPPED for ${slotName}.`, 'warn');
  };

  const handleSnooze = (medId: string, medName: string, mins = 15) => {
    onSnoozeDose(medId, mins);
    showToast(`Snoozed ${medName} reminder for ${mins} minutes.`, 'info');
  };

  const handleDeleteMed = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from the active medicine schedule?`)) {
      if (onDeleteMedication) {
        onDeleteMedication(id);
      }
      showToast(`Removed "${name}" from schedule.`, 'info');
    }
  };

  const handleToggleReminder = (id: string, name: string) => {
    if (onToggleReminder) {
      onToggleReminder(id);
      showToast(`Reminder notifications toggled for "${name}".`, 'info');
    }
  };

  // Voice announcement for elderly patients
  const handleVoiceAnnouncement = () => {
    if (resolvedCards.length === 0) {
      speakTextNative(
        `Namaste ${patient.name}. Your medicine schedule is currently empty.`,
        patient.dialect || 'Hindi'
      );
      return;
    }

    const next = todayStats.nextDose;
    setActiveSpeech(true);

    const message = next
      ? `Namaste ${patient.name}. Today you have completed ${todayStats.completed} of ${todayStats.total} medicines. Your next scheduled medicine is ${next.medication.medicationName}. Dosage: ${next.medication.dosage || '1 dose'}. Scheduled time: ${next.timeDisplay}. Please take it ${next.mealInstruction} with drinking water.`
      : `Namaste ${patient.name}. You have completed all scheduled medicines for today. Well done!`;

    speakTextNative(message, patient.dialect || 'Hindi', () => {
      setActiveSpeech(false);
    });
  };

  // Modal open helpers
  const handleOpenAddModal = () => {
    setEditingMed(null);
    setMedName('');
    setGenericFormula('');
    setDosage('1 Tablet');
    setTimeSlot('Morning');
    setMealRelation('After Food');
    setFrequency('Once daily (OD)');
    setDuration('7 days');
    setSpecialInstructions('Take with clean drinking water.');
    setRemindersEnabled(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (med: MedicationAdherenceItem) => {
    setEditingMed(med);
    setMedName(med.medicationName);
    setGenericFormula(med.genericFormula || '');
    setDosage(med.dosage || med.dosageRegimen?.split('•')[0]?.trim() || '1 Tablet');

    const t = (med.timing || '').toLowerCase();
    if (t.includes('night') && t.includes('morning')) {
      setTimeSlot('Morning & Night');
    } else if (t.includes('thrice') || t.includes('tds')) {
      setTimeSlot('Thrice Daily');
    } else if (t.includes('night') || t.includes('hs')) {
      setTimeSlot('Night');
    } else if (t.includes('evening')) {
      setTimeSlot('Evening');
    } else if (t.includes('afternoon') || t.includes('lunch') || t.includes('daytime')) {
      setTimeSlot('Afternoon');
    } else {
      setTimeSlot('Morning');
    }

    setMealRelation((med.mealRelation as 'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach') || 'After Food');
    setFrequency(med.frequency || 'Once daily (OD)');
    setDuration(med.duration || `${med.durationDays || 14} days`);
    setSpecialInstructions(med.specialInstructions || 'Take with water.');
    setRemindersEnabled(med.remindersEnabled !== false);
    setIsAddModalOpen(true);
  };

  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      showToast('Please enter a medicine name.', 'warn');
      return;
    }

    const durationDays = parseInt(duration) || 14;
    const dosesPerDay =
      timeSlot === 'Thrice Daily'
        ? 3
        : timeSlot === 'Morning & Night' || frequency.includes('Twice') || frequency.includes('BD')
        ? 2
        : 1;

    let timingFormatted = 'Morning (08:00 AM)';
    if (timeSlot === 'Afternoon') timingFormatted = 'Afternoon (01:30 PM)';
    else if (timeSlot === 'Evening') timingFormatted = 'Evening (06:00 PM)';
    else if (timeSlot === 'Night') timingFormatted = 'Night (08:30 PM)';
    else if (timeSlot === 'Morning & Night') timingFormatted = 'Morning & Night (BD)';
    else if (timeSlot === 'Thrice Daily') timingFormatted = 'Morning, Afternoon & Night (TDS)';

    if (editingMed) {
      if (onEditMedication) {
        onEditMedication(editingMed.id, {
          medicationName: medName.trim(),
          genericFormula: genericFormula.trim() || medName.trim(),
          dosage: dosage.trim(),
          dosageRegimen: `${dosage.trim()} • ${timingFormatted} (${mealRelation})`,
          timing: timingFormatted,
          mealRelation,
          frequency,
          duration: duration.trim(),
          specialInstructions: specialInstructions.trim(),
          durationDays,
          remindersEnabled,
        });
      }
      showToast(`Updated schedule for "${medName.trim()}".`, 'success');
    } else {
      const newMed: MedicationAdherenceItem = {
        id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        medicationName: medName.trim(),
        genericFormula: genericFormula.trim() || medName.trim(),
        category: 'General',
        dosageRegimen: `${dosage.trim()} • ${timingFormatted} (${mealRelation})`,
        dosage: dosage.trim(),
        timing: timingFormatted,
        mealRelation,
        frequency,
        duration: duration.trim(),
        specialInstructions: specialInstructions.trim(),
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
        remindersEnabled,
      };

      if (onAddMedication) {
        onAddMedication(newMed);
      }
      showToast(`Added "${medName.trim()}" to daily medicine schedule.`, 'success');
    }

    setIsAddModalOpen(false);
  };

  // Load sample prescribed medicines
  const handleLoadSamplePrescriptions = () => {
    if (!onAddMedication) return;
    const samples: MedicationAdherenceItem[] = [
      {
        id: `med_sample_${Date.now()}_1`,
        medicationName: 'Tab Pantoprazole 40mg',
        genericFormula: 'Pantoprazole Sodium 40mg',
        category: 'Acid Peptic Disease',
        dosageRegimen: '40mg • Morning (30m Before Breakfast)',
        dosage: '1 Tablet (40mg)',
        timing: 'Morning (Empty Stomach)',
        mealRelation: 'Empty Stomach',
        frequency: 'Once daily (OD)',
        duration: '14 days',
        specialInstructions: 'Take with plain water 30 minutes before first meal.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 14,
        totalPrescribedDoses: 14,
        takenDoses: 2,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 12,
        isChronic: false,
        remindersEnabled: true,
      },
      {
        id: `med_sample_${Date.now()}_2`,
        medicationName: 'ORS Hydration Support',
        genericFormula: 'Oral Rehydration Salts IP',
        category: 'General',
        dosageRegimen: '1 Sachet • Afternoon (Post Lunch)',
        dosage: '1 Sachet in 1L Water',
        timing: 'Afternoon',
        mealRelation: 'With Food',
        frequency: 'Sip throughout daytime',
        duration: '5 days',
        specialInstructions: 'Dissolve in boiled and cooled drinking water.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 5,
        totalPrescribedDoses: 5,
        takenDoses: 1,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 4,
        isChronic: false,
        remindersEnabled: true,
      },
      {
        id: `med_sample_${Date.now()}_3`,
        medicationName: 'Tab Paracetamol 650mg',
        genericFormula: 'Paracetamol 650mg',
        category: 'General',
        dosageRegimen: '650mg • Afternoon & Night (After Meals)',
        dosage: '1 Tablet (650mg)',
        timing: 'Afternoon & Night',
        mealRelation: 'After Food',
        frequency: 'Twice daily (BD)',
        duration: '5 days',
        specialInstructions: 'Take only if temperature exceeds 99.5°F or body ache occurs.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 5,
        totalPrescribedDoses: 10,
        takenDoses: 1,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 4,
        isChronic: false,
        remindersEnabled: true,
      },
      {
        id: `med_sample_${Date.now()}_4`,
        medicationName: 'Tab Montair-LC',
        genericFormula: 'Montelukast 10mg + Levocetirizine 5mg',
        category: 'Respiratory',
        dosageRegimen: '1 Tab • Night (Post Dinner)',
        dosage: '1 Tablet',
        timing: 'Night (HS)',
        mealRelation: 'After Food',
        frequency: 'Once daily at bedtime (OD)',
        duration: '10 days',
        specialInstructions: 'May cause mild drowsiness; avoid late night driving.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 10,
        totalPrescribedDoses: 10,
        takenDoses: 1,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 9,
        isChronic: false,
        remindersEnabled: true,
      },
    ];

    onAddMedication(samples);
    showToast('Loaded clinical prescribed medicines into schedule.', 'success');
  };

  // Helper renderer for a single medicine card
  const renderMedicineCard = (card: ResolvedDoseCard) => {
    const med = card.medication;
    const isTaken = card.status === 'TAKEN';
    const isDue = card.status === 'DUE';
    const isMissed = card.status === 'MISSED';

    return (
      <div
        key={`${med.id}-${card.slot}`}
        className={`rounded-2xl p-4.5 border transition-all shadow-xs space-y-3.5 ${
          isTaken
            ? 'bg-emerald-50/40 border-emerald-300/80 shadow-emerald-50'
            : isDue
            ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-50 animate-pulse-subtle'
            : isMissed
            ? 'bg-rose-50/40 border-rose-300'
            : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'
        }`}
      >
        {/* Top: Medicine Name, Dosage, and Notification Bell */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className={`text-base font-bold text-slate-900 tracking-tight ${isTaken ? 'line-through text-slate-500' : ''}`}>
                {med.medicationName}
              </h4>
              {med.genericFormula && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {med.genericFormula}
                </span>
              )}
            </div>

            {/* Dosage & Example */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 font-semibold">
              <span className="flex items-center gap-1">
                <Pill className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                Dosage: <strong className="text-slate-900">{med.dosage || med.dosageRegimen || '1 tablet'}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-500 font-normal">
                Duration: <strong>{med.duration || `${med.durationDays || 14} days`}</strong>
              </span>
            </div>
          </div>

          {/* Controls: Notification Toggle & Edit/Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleReminder(med.id, med.medicationName)}
              className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
              title={med.remindersEnabled !== false ? 'Notifications Active' : 'Notifications Muted'}
            >
              {med.remindersEnabled !== false ? (
                <BellRing className="w-4 h-4 text-purple-600" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-300" />
              )}
            </button>
            <button
              onClick={() => handleOpenEditModal(med)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit Medicine"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteMed(med.id, med.medicationName)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Medicine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Row: Large Time, Food Instruction, Frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-y border-slate-100/90 text-xs">
          {/* Scheduled Time */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Time</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{card.timeDisplay}</div>
            </div>
          </div>

          {/* Food Instruction */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Food Instruction</div>
              <div className="text-xs font-bold text-slate-900">{card.mealInstruction}</div>
            </div>
          </div>

          {/* Frequency */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Frequency</div>
              <div className="text-xs font-bold text-slate-900 truncate">{med.frequency || 'Once daily (OD)'}</div>
            </div>
          </div>
        </div>

        {/* Special Instructions if present */}
        {med.specialInstructions && (
          <div className="text-xs text-slate-600 bg-purple-50/50 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{med.specialInstructions}</span>
          </div>
        )}

        {/* Bottom Status & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isTaken ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{card.statusLabel}</span>
              </span>
            ) : isDue ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                <span>{card.statusLabel}</span>
              </span>
            ) : isMissed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{card.statusLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{card.statusLabel}</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Min 44px touch targets */}
          <div className="flex flex-wrap items-center gap-2">
            {!isTaken ? (
              <>
                <button
                  onClick={() => handleMarkTaken(med.id, med.medicationName, card.slotLabel)}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark as Taken</span>
                </button>

                <button
                  onClick={() => handleSnooze(med.id, med.medicationName, 15)}
                  className="min-h-[44px] px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-amber-200 transition-colors cursor-pointer active:scale-95"
                  title="Snooze reminder for 15 minutes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Snooze (15m)</span>
                </button>

                <button
                  onClick={() => handleMarkNotTaken(med.id, med.medicationName, card.slotLabel)}
                  className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Not Taken / Skip</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleMarkNotTaken(med.id, med.medicationName, card.slotLabel)}
                className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
                title="Undo taken status if clicked by mistake"
              >
                <span>Undo (Mark as Not Taken)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Control Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-inner">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Medicine Schedule & Reminders
                </h2>
                <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                  {scheduleItems.length} Active Medicines
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organized routine, dose times, food instructions & reminders for <strong>{patient.name}</strong>.
              </p>
            </div>
          </div>

          {/* Action buttons & View switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setViewMode('SLOTS')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'SLOTS' ? 'bg-white text-purple-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Daily Slots</span>
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'LIST' ? 'bg-white text-purple-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                <span>All Medicines</span>
              </button>
            </div>

            {/* Voice Announcement for Elderly */}
            <button
              onClick={handleVoiceAnnouncement}
              disabled={activeSpeech}
              className="min-h-[44px] px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-2xl text-xs flex items-center gap-2 border border-purple-200 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Spoken voice alert in patient's native dialect"
            >
              <Volume2 className={`w-4 h-4 ${activeSpeech ? 'animate-pulse text-purple-900' : 'text-purple-700'}`} />
              <span>{activeSpeech ? 'Speaking...' : 'Voice Reminder'}</span>
            </button>

            {/* Add Medicine Button */}
            <button
              onClick={handleOpenAddModal}
              className="min-h-[44px] px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>

        {/* Real-time Notification Banner */}
        {notification && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border animate-in fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'warn'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer p-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 3: Prominent "Today's Schedule" Section */}
        {scheduleItems.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200">
                  Today's Medicines Summary
                </h3>
              </div>
              <div className="text-xs text-purple-200 font-mono">
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Left Summary Box: "3 / 5 Taken" */}
              <div className="md:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-4.5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-purple-200">Today's Progress</div>
                  <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {todayStats.percent}% Completed
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                    {todayStats.completed} / {todayStats.total}
                  </div>
                  <div className="text-sm font-bold text-purple-200">Doses Taken</div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${todayStats.percent}%` }}
                  ></div>
                </div>

                {/* Quick breakdown badges */}
                <div className="flex items-center justify-between text-xs text-purple-200 font-medium pt-1">
                  <span>Total: <strong>{todayStats.total}</strong></span>
                  <span>Completed: <strong className="text-emerald-300">{todayStats.completed}</strong></span>
                  <span>Remaining: <strong className="text-amber-300">{todayStats.remaining}</strong></span>
                </div>
              </div>

              {/* Right Next Medicine Card */}
              <div className="md:col-span-7 bg-white/10 backdrop-blur-md rounded-2xl p-4.5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Next Medicine</span>
                  </div>
                  {todayStats.nextDose && (
                    <span className="text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      {todayStats.nextDose.slotLabel} Slot
                    </span>
                  )}
                </div>

                {todayStats.nextDose ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold text-white flex items-center gap-2">
                          <span>💊</span>
                          <span>{todayStats.nextDose.medication.medicationName}</span>
                        </div>
                        <div className="text-xs text-purple-200 mt-0.5 flex flex-wrap items-center gap-3">
                          <span>🕐 <strong>{todayStats.nextDose.timeDisplay}</strong></span>
                          <span>•</span>
                          <span>💧 <strong>{todayStats.nextDose.medication.dosage || '1 Tablet'}</strong></span>
                          <span>•</span>
                          <span>🍽️ <strong>{todayStats.nextDose.mealInstruction}</strong></span>
                        </div>
                      </div>

                      {/* 1-tap mark taken right on next medicine card */}
                      <button
                        onClick={() =>
                          handleMarkTaken(
                            todayStats.nextDose!.medication.id,
                            todayStats.nextDose!.medication.medicationName,
                            todayStats.nextDose!.slotLabel
                          )
                        }
                        className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Mark as Taken</span>
                      </button>
                    </div>

                    {todayStats.nextDose.medication.specialInstructions && (
                      <div className="text-xs text-purple-100/90 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{todayStats.nextDose.medication.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-purple-200 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span>All scheduled doses for today have been completed!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Calendar & Future Schedule Switcher */}
        <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500 mr-1 flex items-center gap-1 text-xs">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Schedule View:</span>
            </span>

            {/* Today Tab */}
            <button
              onClick={() => handleSelectDateTab('TODAY')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                dateTab === 'TODAY' && isSelectedDateToday
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Today
            </button>

            {/* Tomorrow Tab */}
            <button
              onClick={() => handleSelectDateTab('TOMORROW')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                dateTab === 'TOMORROW'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tomorrow
            </button>

            {/* Upcoming Tab */}
            <button
              onClick={() => handleSelectDateTab('UPCOMING')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                dateTab === 'UPCOMING'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Upcoming (7 Days)
            </button>
          </div>

          {/* Date Stepper & Picker */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleStepDay(-1)}
              className="min-h-[38px] p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>
                {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <button
              onClick={() => handleStepDay(1)}
              className="min-h-[38px] p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 1 & 5: Empty State or Schedule Slot Layout */}
      {scheduleItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
            <Pill className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              No Active Scheduled Medicines
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The medicine reminder schedule is currently empty. You can add medicines manually, import recommendations from the Doctor Summary, or import from the Prescription Assistant.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenAddModal}
              className="min-h-[44px] px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Medicine</span>
            </button>

            <button
              onClick={handleLoadSamplePrescriptions}
              className="min-h-[44px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Doctor Prescribed Medicines</span>
            </button>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('PRESCRIPTION_ASSISTANT')}
                className="min-h-[44px] px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-2xl border border-blue-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Import from Prescription Assistant</span>
              </button>
            )}
          </div>
        </div>
      ) : dateTab === 'UPCOMING' ? (
        /* Upcoming 7 Days View */
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>Upcoming 7 Days Medicine Forecast</span>
            </h3>
            <span className="text-xs text-slate-500">
              Daily routine projection for {patient.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
              const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
              const isToday = offset === 0;

              return (
                <div
                  key={offset}
                  onClick={() => {
                    setSelectedDate(d);
                    setDateTab('TODAY');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isToday
                      ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/40'
                      : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-bold uppercase ${isToday ? 'text-purple-900' : 'text-slate-600'}`}>
                      {dayName}
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{dateStr}</div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-200/80">
                    <div className="text-[10px] text-center font-bold text-purple-700 bg-white py-1 rounded-lg border border-purple-100">
                      {scheduleItems.length} Medicines
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">Click to view</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'SLOTS' ? (
        /* Section 2: Organize Medicines by 4 Time Slots (Morning, Afternoon, Evening, Night) */
        <div className="space-y-6">
          {/* 🌅 Morning Slot */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-inner">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">🌅 Morning Routine</h3>
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                      08:00 AM • Breakfast
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Before or after breakfast doses & empty stomach medications
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-xl border border-amber-200">
                {morningCards.length} {morningCards.length === 1 ? 'Medicine' : 'Medicines'}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {morningCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No medicines scheduled for the morning slot.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {morningCards.map(renderMedicineCard)}
                </div>
              )}
            </div>
          </div>

          {/* ☀️ Afternoon Slot */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-orange-50/70 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold shadow-inner">
                  <Sunset className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">☀️ Afternoon Routine</h3>
                    <span className="text-[11px] font-bold bg-orange-100 text-orange-900 px-2.5 py-0.5 rounded-full border border-orange-200 font-mono">
                      01:30 PM • Lunch
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Midday and post-lunch hydration and medications
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-orange-100 text-orange-900 px-3 py-1 rounded-xl border border-orange-200">
                {afternoonCards.length} {afternoonCards.length === 1 ? 'Medicine' : 'Medicines'}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {afternoonCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No medicines scheduled for the afternoon slot.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {afternoonCards.map(renderMedicineCard)}
                </div>
              )}
            </div>
          </div>

          {/* 🌙 Evening Slot */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shadow-inner">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">🌙 Evening Routine</h3>
                    <span className="text-[11px] font-bold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full border border-purple-200 font-mono">
                      06:00 PM • Tea / Snacks
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Late afternoon, evening tea, and pre-dinner doses
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1 rounded-xl border border-purple-200">
                {eveningCards.length} {eveningCards.length === 1 ? 'Medicine' : 'Medicines'}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {eveningCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No medicines scheduled for the evening slot.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {eveningCards.map(renderMedicineCard)}
                </div>
              )}
            </div>
          </div>

          {/* 🌃 Night Slot */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold shadow-inner">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">🌃 Night Routine</h3>
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200 font-mono">
                      08:30 PM • Dinner / Bedtime (HS)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Post-dinner and bedtime medications
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-indigo-100 text-indigo-900 px-3 py-1 rounded-xl border border-indigo-200">
                {nightCards.length} {nightCards.length === 1 ? 'Medicine' : 'Medicines'}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {nightCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No medicines scheduled for the night slot.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {nightCards.map(renderMedicineCard)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Full Schedule List / Table View */
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              All Scheduled Medicines ({scheduleItems.length})
            </h3>
            <span className="text-xs text-slate-500">
              Complete regimen details & adherence history
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/70">
                  <th className="p-3">Medicine Name & Formula</th>
                  <th className="p-3">Dosage & Example</th>
                  <th className="p-3">Time & Meal Relation</th>
                  <th className="p-3">Frequency & Duration</th>
                  <th className="p-3">Adherence Progress</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleItems.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{med.medicationName}</div>
                      {med.genericFormula && (
                        <div className="text-[11px] text-slate-400 font-normal">{med.genericFormula}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700">
                      <div>{med.dosage || med.dosageRegimen?.split('•')[0] || '1 tablet'}</div>
                      {med.specialInstructions && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5">{med.specialInstructions}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700">
                      <div className="font-semibold">{med.timing}</div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                        {med.mealRelation || 'After Food'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div>{med.frequency || 'Once daily (OD)'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Duration: {med.duration || `${med.durationDays || 14} days`}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-emerald-700">{med.adherencePercent}%</div>
                      <div className="text-[10px] text-slate-400">
                        {med.takenDoses} taken / {med.missedDoses} missed
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleMarkTaken(med.id, med.medicationName, 'Daily Routine')}
                          className="min-h-[38px] px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs shadow-xs"
                        >
                          Take
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(med)}
                          className="min-h-[38px] p-2 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMed(med.id, med.medicationName)}
                          className="min-h-[38px] p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Longitudinal Adherence History Record */}
      {scheduleItems.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Patient Adherence Track Record ({patient.name})
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
              Overall Compliance: {patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 95}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {scheduleItems.map((med) => (
              <div key={med.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="truncate">{med.medicationName}</span>
                  <span className="text-emerald-700 font-mono">{med.adherencePercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${med.adherencePercent}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Taken: <strong>{med.takenDoses}</strong></span>
                  <span>Missed: <strong>{med.missedDoses}</strong></span>
                  <span>Refill in: <strong>{med.refillDueInDays || 10}d</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingMed ? 'Edit Scheduled Medicine' : 'Add New Medicine to Schedule'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: {patient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-4 text-xs">
              {/* Medicine Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tab Pantoprazole 40mg, Paracetamol 650mg, Montair-LC"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Generic Formula */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Generic Chemical / Formula (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pantoprazole Sodium 40mg, Montelukast + Levocetirizine"
                  value={genericFormula}
                  onChange={(e) => setGenericFormula(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Dosage & Example */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Tablet, 500mg, 5ml"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                  >
                    <option value="Once daily (OD)">Once daily (OD)</option>
                    <option value="Twice daily (BD)">Twice daily (BD)</option>
                    <option value="Thrice daily (TDS)">Thrice daily (TDS)</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="As needed (SOS)">As needed (SOS)</option>
                  </select>
                </div>
              </div>

              {/* Timing Slot & Meal Relation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Daily Time Slot *
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                  >
                    <option value="Morning">🌅 Morning (08:00 AM)</option>
                    <option value="Afternoon">☀️ Afternoon (01:30 PM)</option>
                    <option value="Evening">🌙 Evening (06:00 PM)</option>
                    <option value="Night">🌃 Night (08:30 PM)</option>
                    <option value="Morning & Night">🌅+🌃 Twice Daily (BD)</option>
                    <option value="Thrice Daily">🌅+☀️+🌃 Thrice Daily (TDS)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Food Instruction *
                  </label>
                  <select
                    value={mealRelation}
                    onChange={(e) => setMealRelation(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                  >
                    <option value="After Food">After Food (Post-Meal)</option>
                    <option value="Before Food">Before Food (Pre-Meal)</option>
                    <option value="With Food">With Food / With Meals</option>
                    <option value="Empty Stomach">Empty Stomach (Morning)</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 days, 14 days, 1 month, Ongoing"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Special Instructions / Precautions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take with warm water; avoid lying down immediately"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Reminders Toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="remindersToggleModal"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                />
                <label htmlFor="remindersToggleModal" className="font-semibold text-slate-800 cursor-pointer">
                  Enable daily reminders and audio chime for this medicine
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  {editingMed ? 'Save Changes' : 'Add to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
