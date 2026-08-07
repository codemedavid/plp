#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// Trigger the send-promo-blast edge function.
//
// Exists so the HTML lives in email-templates/ (one source of truth) instead
// of being pasted into a curl command or duplicated inside the function.
//
//   Dry run (always do this first — prints who would receive it, sends nothing):
//     BROADCAST_SECRET=... node scripts/send-promo-blast.mjs --dry-run
//
//   Send:
//     BROADCAST_SECRET=... node scripts/send-promo-blast.mjs --send
//
// Neither the service-role key nor the Resend key is needed locally: both stay
// server-side in the edge function.
// ─────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CAMPAIGN_ID = 'promo-8-8-sale';
const TEMPLATE = 'email-templates/promo-8-8-sale.html';
const SUBJECT = 'The 8.8 Sale is live';

const readEnv = async (key) => {
  if (process.env[key]) return process.env[key];
  const env = await readFile(resolve(ROOT, '.env'), 'utf8').catch(() => '');
  return env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
};

const main = async () => {
  const args = process.argv.slice(2);
  const isSend = args.includes('--send');
  const isDryRun = args.includes('--dry-run');

  if (isSend === isDryRun) {
    console.error('Pass exactly one of --dry-run or --send.');
    process.exit(1);
  }

  const secret = await readEnv('BROADCAST_SECRET');
  if (!secret) {
    console.error('BROADCAST_SECRET is not set. It must match the value given to');
    console.error('  supabase secrets set BROADCAST_SECRET=<random>');
    process.exit(1);
  }

  const supabaseUrl = await readEnv('VITE_SUPABASE_URL');
  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL not found in the environment or .env');
    process.exit(1);
  }

  const html = await readFile(resolve(ROOT, TEMPLATE), 'utf8');

  const res = await fetch(`${supabaseUrl}/functions/v1/send-promo-blast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-broadcast-secret': secret,
    },
    body: JSON.stringify({
      campaignId: CAMPAIGN_ID,
      subject: SUBJECT,
      html,
      dryRun: isDryRun,
    }),
  });

  const body = await res.json().catch(() => ({ error: 'Response was not JSON' }));
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
