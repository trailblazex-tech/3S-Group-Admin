/**
 * Cognito's custom email sender: every email the user pool sends - password
 * reset codes, temporary passwords, verification codes - comes here instead
 * of Cognito's plain default, and goes out through SES in the 3S Admin layout
 * (core/auth-email.js).
 *
 * Cognito encrypts the code with the stack's KMS key (AWS Encryption SDK);
 * only this function's role may decrypt it. Accounts without an inbox of
 * their own (e.g. a shared login on the admin domain) have their emails sent
 * to a recovery contact instead - RECOVERY_CONTACTS, a JSON object
 * { "login@...": "real-inbox@..." }.
 *
 * Environment: KMS_KEY_ARN, MAIL_FROM, RECOVERY_CONTACTS
 */
import { buildClient, CommitmentPolicy, KmsKeyringNode } from '@aws-crypto/client-node';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { composeAuthEmail, recipientFor, unescapeCognito } from '../core/auth-email.js';

const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const keyring = new KmsKeyringNode({ keyIds: [process.env.KMS_KEY_ARN] });
const ses = new SESv2Client({});

function recoveryContacts() {
  try {
    return JSON.parse(process.env.RECOVERY_CONTACTS || '{}');
  } catch {
    console.error('[auth-mailer] RECOVERY_CONTACTS is not valid JSON; sending to account addresses');
    return {};
  }
}

const mask = (address) => address.replace(/^(.).*(@.*)$/, '$1***$2');

export async function handler(event) {
  const { triggerSource } = event;
  const account = event.request.userAttributes?.email;
  if (!account) {
    console.error('[auth-mailer] no email attribute', triggerSource);
    return;
  }

  let code = null;
  if (event.request.code) {
    const { plaintext } = await decrypt(keyring, Buffer.from(event.request.code, 'base64'));
    code = Buffer.from(plaintext).toString('utf8');
    if (triggerSource === 'CustomEmailSender_AdminCreateUser') code = unescapeCognito(code);
  }

  const recipient = recipientFor(account, recoveryContacts());
  const { subject, html, text } = composeAuthEmail({ triggerSource, code, account, recipient });

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: process.env.MAIL_FROM,
      Destination: { ToAddresses: [recipient] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' }, Text: { Data: text, Charset: 'UTF-8' } },
        },
      },
    }),
  );
  console.log('[auth-mailer] sent', triggerSource, mask(account), recipient === account ? '' : `-> ${mask(recipient)}`);
}
