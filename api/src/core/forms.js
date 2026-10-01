/**
 * Public forms: what visitors send from a site (parent feedback, enquiries).
 *
 * A site declares its forms in sites/<site>/forms.js. The same declaration
 * validates a submission on the way in and tells the admin how to show it,
 * like collections do for content. Submissions are never part of a site's
 * published content - they live in their own table and only the admin reads
 * them.
 *
 * Form options:
 *   label, description   - what the admin calls it
 *   idPrefix             - reference ids look like <idPrefix>-20261001-3FA2C1
 *   titleField           - the person's name, shown first in the list
 *   phoneField, emailField - turned into call / WhatsApp / email buttons
 *   ratingsField         - a "ratings" field the admin averages and charts
 *   interestField        - a select the admin charts (e.g. admission interest)
 *
 * Field types: text | textarea | phone | email | select | ratings | datetime
 *   ratings: { items: [{ name, label }], requiredItems: [names] } - 1 to 5 each
 */
import crypto from 'node:crypto';
import { ApiError } from './engine.js';

export const submissionStatuses = [
  { value: 'new', label: 'New' },
  { value: 'following-up', label: 'Following up' },
  { value: 'done', label: 'Done' },
];

const mobilePattern = /^(?:\+?91[-\s]?|0)?[6-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, maxLength, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(pattern, multiline ? '' : ' ').trim().slice(0, maxLength);
}

function cleanRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 0;
  return Math.min(Math.max(Math.round(rating), 0), 5);
}

function validateFormField(field, raw) {
  const label = field.label ?? field.name;

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const value = cleanText(raw, field.maxLength ?? 200, { multiline: field.type === 'textarea' });
      if (field.required && value.length < (field.minLength ?? 1)) throw new ApiError(400, `${label} is required.`);
      return value;
    }
    case 'phone': {
      const value = cleanText(raw, 20).replace(/[\s-]/g, '');
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !mobilePattern.test(value)) throw new ApiError(400, 'A valid 10 digit mobile number is required.');
      return value;
    }
    case 'email': {
      const value = cleanText(raw, 254);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !emailPattern.test(value)) throw new ApiError(400, `${label} is not valid.`);
      return value;
    }
    case 'select': {
      const value = cleanText(raw, 60);
      if (field.required && !value) throw new ApiError(400, `${label} is required.`);
      if (value && !field.options.some((option) => option.value === value)) throw new ApiError(400, `${label} is not one of the choices.`);
      return value;
    }
    case 'ratings': {
      const ratings = {};
      for (const item of field.items) {
        ratings[item.name] = cleanRating(raw?.[item.name]);
        if ((field.requiredItems ?? []).includes(item.name) && ratings[item.name] < 1) {
          throw new ApiError(400, `A rating for ${item.label.toLowerCase()} is required.`);
        }
      }
      return ratings;
    }
    case 'datetime': {
      const parsed = Date.parse(raw);
      return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
    }
    default:
      throw new ApiError(500, `Unknown form field type "${field.type}".`);
  }
}

export function validateSubmission(form, payload) {
  const values = {};
  for (const field of form.fields) values[field.name] = validateFormField(field, payload?.[field.name]);
  return values;
}

function referenceId(prefix, at) {
  const day = at.slice(0, 10).replace(/-/g, '');
  return `${prefix}-${day}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** What the admin needs to show a form - never the visitors' data. */
export function describeForms(forms, counts = {}) {
  return Object.entries(forms).map(([name, form]) => ({
    name,
    label: form.label,
    description: form.description ?? '',
    titleField: form.titleField,
    phoneField: form.phoneField ?? null,
    emailField: form.emailField ?? null,
    ratingsField: form.ratingsField ?? null,
    interestField: form.interestField ?? null,
    fields: form.fields,
    statuses: submissionStatuses,
    total: counts[name]?.total ?? 0,
    unread: counts[name]?.unread ?? 0,
  }));
}

export function assertValidForms(siteId, forms) {
  const problems = [];
  const types = new Set(['text', 'textarea', 'phone', 'email', 'select', 'ratings', 'datetime']);
  for (const [name, form] of Object.entries(forms)) {
    const where = `${siteId}/forms/${name}`;
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(name)) problems.push(`${where}: form names must be lowercase-kebab`);
    if (!form.label || !form.idPrefix) problems.push(`${where}: needs label and idPrefix`);
    const names = new Set((form.fields ?? []).map((field) => field.name));
    for (const field of form.fields ?? []) {
      if (!types.has(field.type)) problems.push(`${where}.${field.name}: unknown type "${field.type}"`);
      if (field.type === 'select' && !Array.isArray(field.options)) problems.push(`${where}.${field.name}: select needs options`);
      if (field.type === 'ratings' && !Array.isArray(field.items)) problems.push(`${where}.${field.name}: ratings needs items`);
    }
    for (const key of ['titleField', 'phoneField', 'emailField', 'ratingsField', 'interestField']) {
      if (form[key] && !names.has(form[key])) problems.push(`${where}: ${key} "${form[key]}" is not a field`);
    }
  }
  if (problems.length > 0) throw new Error(`Invalid form declarations:\n  ${problems.join('\n  ')}`);
}

// ---------------------------------------------------------------------------
// Public side: one visitor submitting one form
// ---------------------------------------------------------------------------

// Soft, best-effort burst protection per source address. A Lambda container
// only remembers what it has seen itself, so this blunts one noisy source;
// API Gateway's route throttling is the real ceiling.
const windowMs = 10 * 60 * 1000;
const maxPerWindow = 8;
const recent = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const times = (recent.get(key) ?? []).filter((time) => now - time < windowMs);
  const limited = times.length >= maxPerWindow;
  if (!limited) times.push(now);
  recent.set(key, times);
  if (recent.size > 1000) {
    for (const [entry, list] of recent) if (list.every((time) => now - time >= windowMs)) recent.delete(entry);
  }
  return limited;
}

export async function acceptSubmission({ site, formName, payload, ip, store }) {
  const form = site.forms?.[formName];
  if (!form) throw new ApiError(404, 'That form does not exist.');

  // Honeypot: only an automated client fills a hidden field in. Answer like
  // a success so the bot learns nothing.
  if (cleanText(payload?.website, 200)) return { ok: true };

  if (isRateLimited(`${site.id}:${ip ?? 'unknown'}`)) {
    throw new ApiError(429, 'Too many submissions from this device. Please try again later.');
  }

  const values = validateSubmission(form, payload);
  const at = new Date().toISOString();
  const id = referenceId(form.idPrefix, at);
  await store.addSubmission(formName, { ...values, id, at, status: 'new', note: '' });
  return { ok: true, referenceId: id };
}

/** CORS for a site's public forms: only that site's own pages may post. */
export function formCorsHeaders(site, origin) {
  const allowed = site.formOrigins ?? [];
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
