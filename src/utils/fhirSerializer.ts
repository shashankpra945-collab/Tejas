import { PatientProfile, HardwareVitals, SymptomItem, PrakritiParikshaState } from '../types';

export function serializeToHl7Fhir(
  patient: PatientProfile,
  symptoms: SymptomItem[],
  vitals: HardwareVitals['vitals'],
  prakriti?: PrakritiParikshaState
) {
  const encounterId = `enc-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const fhirBundle = {
    resourceType: 'Bundle',
    id: `abdm-bundle-${patient.abhaId.replace(/-/g, '')}`,
    meta: {
      versionId: '1.0',
      lastUpdated: timestamp,
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
    },
    type: 'document',
    timestamp,
    entry: [
      {
        fullUrl: `urn:uuid:patient-${patient.id}`,
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            {
              system: 'https://healthid.ndhm.gov.in',
              value: patient.abhaId,
            },
          ],
          name: [{ text: patient.name }],
          gender: patient.gender.toLowerCase(),
          telecom: [{ system: 'phone', value: patient.phone }],
          address: [{ state: patient.state, city: patient.district }],
        },
      },
      {
        fullUrl: `urn:uuid:encounter-${encounterId}`,
        resource: {
          resourceType: 'Encounter',
          id: encounterId,
          status: 'in-progress',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'Ambulatory / OPD Tele-Triage',
          },
          subject: { reference: `urn:uuid:patient-${patient.id}` },
        },
      },
      // Blood Pressure Observation
      {
        fullUrl: `urn:uuid:obs-bp-${Date.now()}`,
        resource: {
          resourceType: 'Observation',
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel with all children optional',
              },
            ],
          },
          subject: { reference: `urn:uuid:patient-${patient.id}` },
          component: [
            {
              code: {
                coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
              },
              valueQuantity: {
                value: vitals.systolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
            {
              code: {
                coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }],
              },
              valueQuantity: {
                value: vitals.diastolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
          ],
        },
      },
      // SpO2 Observation
      {
        fullUrl: `urn:uuid:obs-spo2-${Date.now()}`,
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' }],
          },
          subject: { reference: `urn:uuid:patient-${patient.id}` },
          valueQuantity: {
            value: vitals.spo2Percent,
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%',
          },
        },
      },
      // Symptoms Condition list
      ...symptoms.map((sym, idx) => ({
        fullUrl: `urn:uuid:cond-${idx}-${Date.now()}`,
        resource: {
          resourceType: 'Condition',
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
          },
          code: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: sym.snomedCode.split('|')[0].trim(),
                display: sym.nameEn,
              },
              {
                system: 'http://id.who.int/icd11/mms',
                code: sym.icd11Code,
                display: sym.nameEn,
              },
            ],
            text: sym.nameEn,
          },
          subject: { reference: `urn:uuid:patient-${patient.id}` },
        },
      })),
      // Ayurvedic Prakriti Observation (if available)
      ...(prakriti?.isCompleted
        ? [
            {
              fullUrl: `urn:uuid:obs-prakriti-${Date.now()}`,
              resource: {
                resourceType: 'Observation',
                status: 'final',
                code: {
                  coding: [
                    {
                      system: 'https://ayush.gov.in/ccras-taxonomy',
                      code: 'AYUSH-PRAKRITI-DOSHA',
                      display: 'Ayurvedic Prakriti Constitutional Assessment',
                    },
                  ],
                  text: `Prakriti: ${prakriti.primaryDosha} (V:${prakriti.vataPercent}% P:${prakriti.pittaPercent}% K:${prakriti.kaphaPercent}%)`,
                },
                subject: { reference: `urn:uuid:patient-${patient.id}` },
                valueString: `${prakriti.primaryDosha} | Nadi: ${prakriti.nadiGati}`,
              },
            },
          ]
        : []),
    ],
  };

  return JSON.stringify(fhirBundle, null, 2);
}
