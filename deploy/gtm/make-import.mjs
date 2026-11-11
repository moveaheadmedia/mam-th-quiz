#!/usr/bin/env node
/* ==========================================================================
   GTM import files for the quiz's GA4 events:  node deploy/gtm/make-import.mjs

   Writes one file per container, for GTM → Admin → Import Container (Merge,
   "Rename conflicting"). Each holds a "MAM Quiz" folder with a Custom Event
   trigger, a GA4 Event tag and the Data Layer Variables for every quiz event
   the page pushes (see assets/js/app.js → Analytics). "Lead Form Submitted"
   (mam_quiz_lead) is not included: it is already in both containers.

   IDs start at 9000 so they cannot collide with the containers' own.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const CONTAINERS = [
  { publicId: 'GTM-NHTDCN6S', containerId: '222690399', site: 'www.moveaheadmedia.co.th', ga4: 'G-2X3GGXFP04' },
  { publicId: 'GTM-NRK28BX5', containerId: '228992765', site: 'www.moveaheadmedia.com.au', ga4: 'G-66ZKHT35F3' },
];

/* What the page pushes, and which keys each GA4 event reports. */
const EVENTS = [
  { name: 'Quiz Started', event: 'mam_quiz_start', params: [] },
  { name: 'Quiz Step Completed', event: 'mam_quiz_step_complete', params: ['quiz_step', 'quiz_step_name', 'quiz_answer'] },
  { name: 'Quiz Completed', event: 'mam_quiz_complete', params: ['quiz_recommended', 'quiz_budget'] },
  { name: 'Consultation CTA Clicked', event: 'mam_quiz_consultation_click', params: ['cta_location'] },
  { name: 'LINE / WhatsApp Clicked', event: 'mam_quiz_chat_click', params: ['chat_app', 'cta_location'] },
];
const COMMON = ['quiz_market', 'quiz_language'];

const FINGERPRINT = '1793170000000';
const FOLDER_ID = '9301';
const dlvName = (key) => `MAM Quiz DLV - ${key}`;

function build(c) {
  const ids = { accountId: '0', containerId: c.containerId };
  const keys = [...new Set([...COMMON, ...EVENTS.flatMap((e) => e.params)])];

  const variable = keys.map((key, i) => ({
    ...ids,
    variableId: String(9201 + i),
    name: dlvName(key),
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
      { type: 'TEMPLATE', key: 'name', value: key },
    ],
    fingerprint: FINGERPRINT,
    parentFolderId: FOLDER_ID,
    formatValue: {},
  }));

  const trigger = EVENTS.map((e, i) => ({
    ...ids,
    triggerId: String(9101 + i),
    name: `MAM Quiz CE - ${e.event}`,
    type: 'CUSTOM_EVENT',
    customEventFilter: [{
      type: 'EQUALS',
      parameter: [
        { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
        { type: 'TEMPLATE', key: 'arg1', value: e.event },
      ],
    }],
    fingerprint: FINGERPRINT,
    parentFolderId: FOLDER_ID,
  }));

  /* Built like the containers' own GA4 Event tags (gtm.js: __gaawe with
     these vtp_ keys), plus the event parameters. */
  const tag = EVENTS.map((e, i) => ({
    ...ids,
    tagId: String(9001 + i),
    name: `GA4 - ${e.name} (${e.event})`,
    type: 'gaawe',
    parameter: [
      { type: 'BOOLEAN', key: 'sendEcommerceData', value: 'false' },
      { type: 'BOOLEAN', key: 'enableUserProperties', value: 'true' },
      { type: 'BOOLEAN', key: 'enableEuid', value: 'true' },
      { type: 'BOOLEAN', key: 'migratedToV2', value: 'true' },
      { type: 'BOOLEAN', key: 'demoV2', value: 'false' },
      { type: 'TEMPLATE', key: 'eventName', value: e.event },
      { type: 'TEMPLATE', key: 'measurementIdOverride', value: c.ga4 },
      {
        type: 'LIST',
        key: 'eventSettingsTable',
        list: [...COMMON, ...e.params].map((key) => ({
          type: 'MAP',
          map: [
            { type: 'TEMPLATE', key: 'parameter', value: key },
            { type: 'TEMPLATE', key: 'parameterValue', value: `{{${dlvName(key)}}}` },
          ],
        })),
      },
    ],
    fingerprint: FINGERPRINT,
    firingTriggerId: [String(9101 + i)],
    parentFolderId: FOLDER_ID,
    tagFiringOption: 'ONCE_PER_EVENT',
    monitoringMetadata: { type: 'MAP' },
    consentSettings: { consentStatus: 'NOT_SET' },
  }));

  return {
    exportFormatVersion: 2,
    exportTime: '2026-10-28 08:00:00',
    containerVersion: {
      path: `accounts/0/containers/${c.containerId}/versions/0`,
      ...ids,
      containerVersionId: '0',
      container: {
        path: `accounts/0/containers/${c.containerId}`,
        ...ids,
        name: c.site,
        publicId: c.publicId,
        usageContext: ['WEB'],
        fingerprint: FINGERPRINT,
        tagManagerUrl: `https://tagmanager.google.com/#/container/accounts/0/containers/${c.containerId}/workspaces?apiLink=container`,
      },
      tag,
      trigger,
      variable,
      folder: [{ ...ids, folderId: FOLDER_ID, name: 'MAM Quiz', fingerprint: FINGERPRINT }],
      fingerprint: FINGERPRINT,
    },
  };
}

for (const c of CONTAINERS) {
  const file = path.join(HERE, `mam-quiz-ga4-events-${c.publicId}.json`);
  fs.writeFileSync(file, JSON.stringify(build(c), null, 4) + '\n');
  const v = build(c).containerVersion;
  console.log(`${path.basename(file)}: ${v.tag.length} tags, ${v.trigger.length} triggers, ${v.variable.length} variables → ${c.ga4}`);
}
