import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Contact } from '@/lib/storage';

export const ENERTECH_CRM_BASE_URL = 'https://enertechups-ai.onrender.com';
export const ENERTECH_API_KEY = 'eng_195c7b8ee867e3d175bc18ee82e235edae2d5d3530477962';
export const ENERTECH_SOURCE = 'EXPO';

const CRM_PENDING_QUEUE_KEY = 'cardflow.crm.pending_queue.v1';

export type EnerTechLeadPayload = {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  location?: string;
  requirement?: string;
  notes?: string;
  source: string;
  score?: number;
  priority?: 'High' | 'Medium' | 'Low';
  tags?: string[];
};

export type EnerTechCreateResponse = {
  ok: boolean;
  created?: boolean;
  duplicate?: boolean;
  data?: {
    id: string;
  };
  error?: string;
};

/**
 * Maps Lead Level to EnerTech Priority and 0-100 Score.
 */
export function mapLeadLevelToPriorityAndScore(level?: string): {
  priority: 'High' | 'Medium' | 'Low';
  score: number;
} {
  switch (level?.toLowerCase()) {
    case 'platinum':
      return { priority: 'High', score: 90 };
    case 'gold':
      return { priority: 'High', score: 75 };
    case 'silver':
      return { priority: 'Medium', score: 50 };
    case 'bronze':
      return { priority: 'Low', score: 25 };
    default:
      return { priority: 'High', score: 80 };
  }
}

/**
 * Normalizes a single phone number:
 * - Digits only (no '+', no spaces, no dashes, no parentheses, no letters).
 * - Proper country code like 91 without '+' (e.g. 919876543210).
 * - For Indian 10-digit mobile numbers (6-9xxxxxxxxx), automatically prepends 91.
 * - Strips leading '0' before prepending 91 (e.g. 09876543210 -> 919876543210).
 * - For international numbers, strips '+' and special characters (e.g. +14155552671 -> 14155552671).
 */
export function normalizePhoneNumber(raw?: string): string {
  if (!raw) return '';
  // Strip common label prefixes like Tel:, Mob:, Phone:, M:
  const cleaned = raw.replace(/^(tel|phone|mob|mobile|m|call|whatsapp|wa)[:.\s-]*/i, '').trim();

  // Strip all non-digit characters (including '+')
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';

  // 10-digit Indian mobile number (starts with 6, 7, 8, or 9) -> prepend 91
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }

  // 11-digit Indian mobile starting with 0 (e.g. 09876543210) -> strip 0, prepend 91
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }

  // Already 12-digit Indian number starting with 91 (e.g. 919876543210) -> keep as-is
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Any other international number: return clean digits without '+'
  return digits;
}

/**
 * Splits a phone string that may contain multiple numbers (e.g. "9876543210 / 9123456789"
 * or "+919876543210, +919123456789" or "9876543210 | 9123456789") into individual clean numbers.
 */
export function splitPhoneNumbers(raw?: string): string[] {
  if (!raw) return [];
  const parts = raw.split(/[/|;\n,]+/).map((p) => p.trim()).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    const norm = normalizePhoneNumber(part);
    if (norm && !result.includes(norm)) {
      result.push(norm);
    }
  }
  return result;
}

/**
 * Builds the exact payload expected by EnerTech Engage API POST /api/v1/leads.
 */
export function buildEnerTechLeadPayload(contact: Contact): EnerTechLeadPayload {
  const { priority, score } = mapLeadLevelToPriorityAndScore(contact.leadLevel);

  // Phone extraction: strictly ONE primary mobile number with country code like 91, NO '+'
  const primaryPhoneCandidates = splitPhoneNumbers(contact.phone);
  const primaryPhone = primaryPhoneCandidates[0] || undefined;

  // Secondary phones (if card had two numbers or user provided phone2)
  const secondaryPhoneCandidates: string[] = [];
  if (primaryPhoneCandidates.length > 1) {
    secondaryPhoneCandidates.push(...primaryPhoneCandidates.slice(1));
  }
  if (contact.phone2) {
    const p2List = splitPhoneNumbers(contact.phone2);
    p2List.forEach((p) => {
      if (p !== primaryPhone && !secondaryPhoneCandidates.includes(p)) {
        secondaryPhoneCandidates.push(p);
      }
    });
  }

  // Requirement: combines scope and interested products
  const requirementParts: string[] = [];
  if (contact.scope) {
    requirementParts.push(`[Scope: ${contact.scope}]`);
  }
  if (contact.products && contact.products.length > 0) {
    requirementParts.push(contact.products.join(', '));
  }
  const requirement = requirementParts.join(' ').trim() || undefined;

  // Rich notes combining Lead Source, remarks, speech transcript, audio URL, secondary contacts & card image links
  const noteLines: string[] = [];
  noteLines.push(`[Lead Source: EXPO]`);
  if (contact.title) {
    noteLines.push(`Title: ${contact.title}`);
  }
  if (contact.leadType) {
    noteLines.push(`Lead Type: ${contact.leadType}`);
  }
  if (contact.leadLevel) {
    noteLines.push(`Lead Level: ${contact.leadLevel}`);
  }
  if (contact.products && contact.products.length > 0) {
    noteLines.push(`Product Interest: ${contact.products.join(', ')}`);
  }
  if (contact.remark) {
    noteLines.push(`Remark: ${contact.remark}`);
  }
  if (contact.note) {
    noteLines.push(`Notes: ${contact.note}`);
  }
  if (contact.voiceTranscript && contact.voiceTranscript !== contact.remark) {
    noteLines.push(`Voice Transcript: ${contact.voiceTranscript}`);
  }
  if (contact.audioUri) {
    noteLines.push(`Audio Memo: ${contact.audioUri}`);
  }
  if (secondaryPhoneCandidates.length > 0) {
    noteLines.push(`Alt Phone: ${secondaryPhoneCandidates.join(', ')}`);
  }
  if (contact.email2) {
    noteLines.push(`Alt Email: ${contact.email2}`);
  }
  if (contact.cardUri) {
    noteLines.push(`Card Front: ${contact.cardUri}`);
  }
  if (contact.cardUriBack) {
    noteLines.push(`Card Back: ${contact.cardUriBack}`);
  }
  const notes = noteLines.join('\n\n').trim() || undefined;

  // Build clean tags array: EXPO is always the first tag
  const tags: string[] = [ENERTECH_SOURCE];
  if (contact.leadType && !tags.includes(contact.leadType)) tags.push(contact.leadType);
  if (contact.leadLevel && !tags.includes(contact.leadLevel)) tags.push(contact.leadLevel);
  if (contact.scope && !tags.includes(`Scope: ${contact.scope}`)) tags.push(`Scope: ${contact.scope}`);
  if (contact.products && contact.products.length > 0) {
    for (const prod of contact.products) {
      if (!tags.includes(prod)) tags.push(prod);
    }
  }

  return {
    name: contact.name || 'Unnamed Contact',
    company: contact.company?.trim() || undefined,
    phone: primaryPhone,
    email: contact.email?.trim() || undefined,
    location: contact.address?.trim() || undefined,
    requirement,
    notes,
    source: ENERTECH_SOURCE,
    priority,
    score,
    tags,
  };
}

/**
 * Sends a lead to EnerTech CRM via POST /api/v1/leads or PATCH /api/v1/leads/{id}.
 */
export async function syncLeadToEnerTechCrm(
  contact: Contact,
  options?: { apiKey?: string; baseUrl?: string }
): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  const apiKey = options?.apiKey || ENERTECH_API_KEY;
  const baseUrl = (options?.baseUrl || ENERTECH_CRM_BASE_URL).replace(/\/$/, '');

  const payload = buildEnerTechLeadPayload(contact);

  const isUpdate = Boolean(contact.crmLeadId);
  const endpoint = isUpdate
    ? `${baseUrl}/api/v1/leads/${contact.crmLeadId}`
    : `${baseUrl}/api/v1/leads`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        isUpdate
          ? {
              name: payload.name,
              company: payload.company,
              phone: payload.phone,
              email: payload.email,
              score: payload.score,
              notes: payload.notes,
            }
          : payload
      ),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = (await res.json().catch(() => ({}))) as EnerTechCreateResponse;

    if (!res.ok) {
      const errMsg = json.error || `CRM responded with status ${res.status}`;
      return { ok: false, error: errMsg };
    }

    const leadId = json.data?.id || contact.crmLeadId;
    return { ok: true, leadId };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Network request to EnerTech CRM failed';
    return { ok: false, error: errorMsg };
  }
}

/**
 * Queues a contact ID for background retry when offline.
 */
export async function queuePendingCrmSync(contactId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CRM_PENDING_QUEUE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(contactId)) {
      list.push(contactId);
      await AsyncStorage.setItem(CRM_PENDING_QUEUE_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore storage errors on queuing
  }
}

/**
 * Retrieves the list of pending contact IDs to sync.
 */
export async function getPendingCrmSyncList(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CRM_PENDING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Removes a contact ID from the pending queue after successful sync.
 */
export async function removePendingCrmSync(contactId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CRM_PENDING_QUEUE_KEY);
    if (!raw) return;
    const list: string[] = JSON.parse(raw);
    const next = list.filter((id) => id !== contactId);
    await AsyncStorage.setItem(CRM_PENDING_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
}
