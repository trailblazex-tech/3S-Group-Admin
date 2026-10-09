import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeAuthEmail, recipientFor, unescapeCognito } from '../src/core/auth-email.js';

const at = new Date('2026-10-09T10:12:00Z');

test('a password reset code is laid out for the reader, with the account and the time in India', () => {
  const mail = composeAuthEmail({ triggerSource: 'CustomEmailSender_ForgotPassword', code: '482915', account: 'owner@example.com', recipient: 'owner@example.com', at });
  assert.equal(mail.subject, '3S Admin: Password reset code for owner@example.com');
  assert.match(mail.html, /Reset your password/);
  assert.match(mail.html, />482915</);
  assert.match(mail.text, /Password reset code: 482915/);
  assert.match(mail.text, /Requested: 9 Oct 2026, 3:42 PM IST/);
  assert.doesNotMatch(mail.html, /recovery contact/);
});

test('an account without an inbox says why the recovery contact got it', () => {
  const mail = composeAuthEmail({ triggerSource: 'CustomEmailSender_ForgotPassword', code: '1', account: 'admin@site.com', recipient: 'cfo@group.com', at });
  assert.match(mail.text, /recovery contact of admin@site\.com/);
});

test('new accounts get their temporary password; other events a verification code', () => {
  assert.match(composeAuthEmail({ triggerSource: 'CustomEmailSender_AdminCreateUser', code: 'Tmp#1', account: 'a@b.co', recipient: 'a@b.co', at }).text, /Temporary password: Tmp#1/);
  assert.match(composeAuthEmail({ triggerSource: 'CustomEmailSender_ResendCode', code: '777', account: 'a@b.co', recipient: 'a@b.co', at }).text, /Verification code: 777/);
});

test('values are escaped in the HTML', () => {
  const mail = composeAuthEmail({ triggerSource: 'CustomEmailSender_AdminCreateUser', code: '<b>&x', account: 'a@b.co', recipient: 'a@b.co', at });
  assert.match(mail.html, /&lt;b&gt;&amp;x/);
  assert.doesNotMatch(mail.html, /<b>&x/);
});

test('recovery contacts match the login in any case; Cognito escapes are undone', () => {
  assert.equal(recipientFor('Admin@Site.com', { 'admin@site.com': 'cfo@group.com' }), 'cfo@group.com');
  assert.equal(recipientFor('other@site.com', { 'admin@site.com': 'cfo@group.com' }), 'other@site.com');
  assert.equal(unescapeCognito('a&lt;b&gt;c&amp;d'), 'a<b>c&d');
});
