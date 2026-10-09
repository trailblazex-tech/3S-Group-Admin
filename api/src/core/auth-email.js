/**
 * The emails Cognito asks us to send (see aws/auth-mailer.js): password reset
 * codes, temporary passwords for new accounts, verification codes. One
 * branded, structured layout for all of them, with a plain-text twin.
 *
 * Pure: takes the already-decrypted code, returns { subject, html, text }.
 */

const adminUrl = 'https://3sgroupadmin.com';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** "9 Oct 2026, 3:42 PM IST" */
function indiaTime(date) {
  const text = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${text.replace(/\b(am|pm)\b/, (part) => part.toUpperCase())} IST`;
}

/** What each Cognito event is, in the reader's words. */
const kinds = {
  CustomEmailSender_ForgotPassword: {
    subject: (account) => `Password reset code for ${account}`,
    title: 'Reset your password',
    lead: (account) => `Someone asked to reset the password of the 3S Admin account <b>${escapeHtml(account)}</b>. Use this code to choose a new password.`,
    codeLabel: 'Password reset code',
    steps: ['Open the sign-in page and choose "Forgot password?".', 'Enter the account email and this code.', 'Choose a new password. The code works for 1 hour.'],
    ignore: 'Didn\'t ask for this? Ignore this email - the password stays the same and nobody can use this code without your inbox.',
  },
  CustomEmailSender_AdminCreateUser: {
    subject: () => 'Your 3S Admin account is ready',
    title: 'Your account is ready',
    lead: (account) => `A 3S Admin account has been created for <b>${escapeHtml(account)}</b>. Sign in with the temporary password below.`,
    codeLabel: 'Temporary password',
    steps: ['Sign in with the account email and this temporary password.', 'Choose your own password.', 'Set up an authenticator app (Google or Microsoft Authenticator). The temporary password works for 7 days.'],
    ignore: 'Not expecting this? Tell the 3S Group team - someone may have used the wrong address.',
  },
  verify: {
    subject: (account) => `Verification code for ${account}`,
    title: 'Confirm your email',
    lead: (account) => `Use this code to confirm the email address of the 3S Admin account <b>${escapeHtml(account)}</b>.`,
    codeLabel: 'Verification code',
    steps: ['Enter this code where the admin asks for it.', 'The code works for 24 hours.'],
    ignore: 'Didn\'t ask for this? Ignore this email - nothing changes without the code.',
  },
  CustomEmailSender_AccountTakeOverNotification: {
    subject: (account) => `Unusual sign-in attempt on ${account}`,
    title: 'Unusual sign-in attempt',
    lead: (account) => `Amazon Cognito noticed an unusual attempt to sign in to the 3S Admin account <b>${escapeHtml(account)}</b>.`,
    codeLabel: null,
    steps: ['If this was you, there is nothing to do.', 'If it wasn\'t, sign in and change the password, or ask the 3S Group team to reset it.'],
    ignore: null,
  },
};

// Sign-up, resend and attribute-verification events all carry a verification code.
const kindFor = (triggerSource) => kinds[triggerSource] ?? kinds.verify;

/**
 * @param {object} input
 * @param {string} input.triggerSource  Cognito's CustomEmailSender_* value
 * @param {string|null} input.code      decrypted code or temporary password
 * @param {string} input.account        the account's email (its login)
 * @param {string} input.recipient      where this email goes
 * @param {Date} [input.at]
 */
export function composeAuthEmail({ triggerSource, code, account, recipient, at = new Date() }) {
  const kind = kindFor(triggerSource);
  const forwarded = recipient.toLowerCase() !== account.toLowerCase();
  const when = indiaTime(at);
  const subject = `3S Admin: ${kind.subject(account)}`;
  const forwardNote = forwarded
    ? `You're getting this as the recovery contact of ${account}, which has no inbox of its own.`
    : null;

  const details = [
    ['Account', account],
    ['Requested', when],
    ['Admin', adminUrl.replace('https://', '')],
  ];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e1d6">
  <tr><td style="background:#21253f;padding:20px 28px">
    <span style="font-size:18px;font-weight:700;color:#ffffff;font-family:Georgia,serif">3S <span style="color:#d7b45f">Group</span></span>
    <span style="display:block;font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:#a9adc4;margin-top:2px">Website admin</span>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1d2433;font-family:Georgia,serif">${escapeHtml(kind.title)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#3d4556">${kind.lead(account)}</p>
    ${forwardNote ? `<p style="margin:12px 0 0;padding:10px 12px;background:#f5f3ee;border-radius:8px;font-size:13px;line-height:1.5;color:#5b6273">${escapeHtml(forwardNote)}</p>` : ''}
  </td></tr>
  ${
    kind.codeLabel && code
      ? `<tr><td style="padding:20px 28px 4px">
    <div style="border:1px solid #e6e1d6;border-radius:12px;background:#fbf8f1;padding:18px;text-align:center">
      <div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#7a7f8e;font-weight:700">${escapeHtml(kind.codeLabel)}</div>
      <div style="margin-top:8px;font-size:30px;font-weight:700;letter-spacing:6px;color:#21253f;font-family:Consolas,Menlo,monospace">${escapeHtml(code)}</div>
    </div>
  </td></tr>`
      : ''
  }
  <tr><td style="padding:20px 28px 4px">
    <div style="font-size:13px;font-weight:700;color:#1d2433;margin-bottom:6px">What to do</div>
    <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#3d4556">${kind.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    <a href="${adminUrl}" style="display:inline-block;margin-top:16px;background:#21253f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px">Open 3S Admin</a>
  </td></tr>
  <tr><td style="padding:20px 28px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee9de;font-size:13px">
      ${details.map(([label, value]) => `<tr><td style="padding:8px 0 0;color:#7a7f8e;width:110px">${escapeHtml(label)}</td><td style="padding:8px 0 0;color:#1d2433;font-weight:600">${escapeHtml(value)}</td></tr>`).join('')}
    </table>
  </td></tr>
  ${kind.ignore ? `<tr><td style="padding:18px 28px 0"><p style="margin:0;font-size:13px;line-height:1.6;color:#7a7f8e">${escapeHtml(kind.ignore)} Never share this code with anyone - the 3S Group team will never ask for it.</p></td></tr>` : ''}
  <tr><td style="padding:24px 28px 26px"><p style="margin:0;font-size:12px;line-height:1.6;color:#a0a4b1">Sent automatically by 3S Admin, the website admin for the 3S Group. Replies to this address are not read.</p></td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `3S Group - Website admin`,
    '',
    kind.title,
    kind.lead(account).replace(/<\/?b>/g, ''),
    forwardNote ?? '',
    '',
    kind.codeLabel && code ? `${kind.codeLabel}: ${code}` : '',
    '',
    'What to do:',
    ...kind.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    kind.ignore ? `${kind.ignore} Never share this code with anyone.` : '',
    '',
    `Open 3S Admin: ${adminUrl}`,
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n');

  return { subject, html, text };
}

/** Where an account's emails go: its recovery contact if it has one, otherwise itself. */
export function recipientFor(account, recoveryContacts = {}) {
  const match = Object.entries(recoveryContacts).find(([address]) => address.toLowerCase() === account.toLowerCase());
  return match ? match[1] : account;
}

/** Cognito HTML-escapes reserved characters in temporary passwords; undo that before sending. */
export function unescapeCognito(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
