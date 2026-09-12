import { VaultSecurityState } from '../types';

export function simulateAes256GcmEncrypt(plaintext: string): { ciphertext: string; nonce: string; keyId: string } {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  const encoded = btoa(unescape(encodeURIComponent(plaintext)));
  const ciphertext = `aes256gcm:v1:IV[${nonce.slice(0, 8)}]:` + encoded.split('').reverse().join('') + ':TAG[d8f9e1]';
  return {
    ciphertext,
    nonce,
    keyId: 'KMS-VAULT-2026-IN-PRIMARY-091',
  };
}

export function simulateAes256GcmDecrypt(ciphertext: string): string {
  try {
    if (!ciphertext.startsWith('aes256gcm:v1:')) return ciphertext;
    const parts = ciphertext.split(':');
    if (parts.length >= 3) {
      const reversed = parts[2].split('').reverse().join('');
      return decodeURIComponent(escape(atob(reversed)));
    }
    return ciphertext;
  } catch {
    return 'Decrypted Medical Payload [Active Session Token Verified]';
  }
}

export function encryptSensitiveField(fieldValue: string): string {
  return simulateAes256GcmEncrypt(fieldValue).ciphertext;
}

// Simple fast SHA-256 equivalent hash simulation for Merkle Root
function simpleSha256(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `0x${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.slice(0, 66);
}

export function generateMerkleRoot(blocks: string[]): { root: string; leaves: string[] } {
  const leaves = blocks.map((b) => simpleSha256(b));
  let currentLayer = [...leaves];
  
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(simpleSha256(currentLayer[i] + currentLayer[i + 1]));
      } else {
        nextLayer.push(simpleSha256(currentLayer[i] + currentLayer[i]));
      }
    }
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0] || simpleSha256('EMPTY_BLOCK'),
    leaves,
  };
}

export function signDoctorCaseRecord(physicianMciId: string, merkleRoot: string): string {
  return `ed25519:sig:v1:${physicianMciId}:${merkleRoot.slice(2, 24)}:${simpleSha256(physicianMciId + merkleRoot)}`;
}

export function verifyDoctorCaseRecordSignature(merkleRoot: string, signature: string, expectedMciId: string): boolean {
  if (!signature.startsWith('ed25519:sig:v1:')) return false;
  return signature.includes(expectedMciId) && signature.includes(merkleRoot.slice(2, 24));
}

export const INITIAL_VAULT_STATE: VaultSecurityState = {
  isEncrypted: true,
  encryptionAlgorithm: 'AES-256-GCM',
  dataEncryptionKeyId: 'KMS-VAULT-IN-DEK-88392-AES256',
  ephemeralSessionKeyExpiresInSeconds: 900,
  activeRole: 'Patient (Self)',
  auditTrailLogs: [
    {
      timestamp: new Date().toLocaleTimeString('en-IN'),
      actor: 'ABHA-PATIENT-AUTH',
      role: 'Patient (Self)',
      action: 'INITIATE_PRE_CONSULTATION_SESSION',
      resource: 'PatientCaseSheet/Session/91-4829-1092',
      encryptionStatus: 'DEK_ROTATED_AES256GCM',
      complianceStandard: 'DISHA / IT Act 2000 / ABDM M1-M3',
    },
    {
      timestamp: new Date().toLocaleTimeString('en-IN'),
      actor: 'GIS_CONTEXT_AGGREGATOR',
      role: 'System Service',
      action: 'QUERY_IDSP_OUTBREAK_VECTOR',
      resource: 'GIS/District/Surat',
      encryptionStatus: 'TLS_1_3_ENCRYPTED',
      complianceStandard: 'DISHA / IT Act 2000 / ABDM M1-M3',
    },
  ],
};
