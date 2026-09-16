/**
 * Shell loader for the prose pages (About, Data model, MCP server).
 *
 * The content is plain HTML in the page; this just mounts the nav and header
 * from the `data-*` attributes on <body>, so there is one copy of the chrome.
 */

import { mountShell } from '../ui.js';

const { page, pageTitle, eyebrow, sub } = document.body.dataset;

await mountShell({
  active: page,
  title: pageTitle,
  eyebrow: eyebrow ?? '',
  sub: sub ?? '',
});
