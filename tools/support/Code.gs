/**
 * Provident Studio — support tickets backend (Google Apps Script, container-bound to a Sheet).
 *
 * The Sheet IS the database: a `Tickets` tab and a `Comments` tab. This script is the API the
 * studios call, and it sends the notification emails. Setup is in README.md.
 *
 * Script properties (Project Settings -> Script properties):
 *   TEAM_KEY        required  shared passphrase every request must carry
 *   STAFF           required  comma-separated emails of the people who work the board
 *   APP_URL         optional  where OPS is served; emails link to APP_URL#support=<id>
 *   ALLOWED_DOMAIN  optional  e.g. providentestate.com — refuses any other email address
 */

var TICKET_COLS = ['id', 'created', 'updated', 'title', 'category', 'priority', 'status', 'description',
  'studio', 'link', 'name', 'email', 'assignee', 'lastAt', 'lastBy', 'lastKind', 'lastText'];
var COMMENT_COLS = ['id', 'ticket', 'at', 'name', 'email', 'staff', 'kind', 'body'];
var STATUSES = ['New', 'In progress', 'Needs your input', 'Done'];
var PRIORITIES = ['Low', 'Normal', 'Urgent'];
var MAX_TEXT = 4000;

/** Run once from the editor: creates the two tabs and makes every cell plain text. */
function setup() {
  sheet_('Tickets', TICKET_COLS);
  sheet_('Comments', COMMENT_COLS);
}

function sheet_(name, cols) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  // Plain text everywhere: stops Sheets turning an ISO time into a date, and — more
  // importantly — stops a description that starts with "=" from being run as a formula.
  sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  sh.setFrozenRows(1);
  return sh;
}

function prop_(k) { return String(PropertiesService.getScriptProperties().getProperty(k) || '').trim(); }
function staffList_() { return prop_('STAFF').toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
function isStaff_(email) { return staffList_().indexOf(email) >= 0; }
function iso_() { return new Date().toISOString(); }
function clip_(v, n) { return String(v == null ? '' : v).slice(0, n || MAX_TEXT); }

function rows_(name, cols) {
  var sh = sheet_(name, cols), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols.length).getValues().map(function (r, i) {
    var o = { _row: i + 2 };
    cols.forEach(function (c, j) { o[c] = String(r[j]); });
    return o;
  });
}
function put_(name, cols, o) {
  var sh = sheet_(name, cols);
  var vals = [cols.map(function (c) { return o[c] == null ? '' : String(o[c]); })];
  if (o._row) sh.getRange(o._row, 1, 1, cols.length).setValues(vals);
  else sh.appendRow(vals[0]);
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    var key = prop_('TEAM_KEY');
    if (!key) throw new Error('The support desk is not configured yet (TEAM_KEY is not set).');
    if (String(req.key || '') !== key) throw new Error('Wrong team key.');
    var email = String(req.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
    var dom = prop_('ALLOWED_DOMAIN').toLowerCase();
    if (dom && email.slice(-(dom.length + 1)) !== '@' + dom) throw new Error('Use your @' + dom + ' address.');
    var fn = ACTIONS[req.action];
    if (!fn) throw new Error('Unknown action.');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { out = fn(req, email, isStaff_(email)); } finally { lock.releaseLock(); }
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// A browser opening the /exec URL gets a plain answer rather than an error page.
function doGet() {
  return ContentService.createTextOutput('Provident Studio support desk is running.');
}

function view_(t, nComments) {
  return {
    id: t.id, created: t.created, updated: t.updated, title: t.title, category: t.category,
    priority: t.priority, status: t.status, description: t.description, studio: t.studio, link: t.link,
    requester: { name: t.name, email: t.email }, assignee: t.assignee,
    lastAt: t.lastAt, lastBy: t.lastBy, lastKind: t.lastKind, lastText: t.lastText,
    comments: nComments || 0
  };
}
function mine_(t, email, staff) { return staff || t.email === email; }
function find_(id) {
  var t = rows_('Tickets', TICKET_COLS).filter(function (x) { return x.id === id; })[0];
  if (!t) throw new Error('That ticket no longer exists.');
  return t;
}
function nextId_() {
  var max = 0;
  rows_('Tickets', TICKET_COLS).forEach(function (t) {
    var n = parseInt(String(t.id).replace(/\D/g, ''), 10);
    if (n > max) max = n;
  });
  return 'PRV-' + ('000' + (max + 1)).slice(-4);
}
function touch_(t, by, kind, text) {
  t.updated = t.lastAt = iso_(); t.lastBy = by; t.lastKind = kind; t.lastText = clip_(text, 200);
}
function addComment_(t, req, email, staff, kind, body) {
  var c = { id: Utilities.getUuid().slice(0, 8), ticket: t.id, at: iso_(), name: clip_(req.name, 80) || email,
    email: email, staff: staff ? '1' : '', kind: kind, body: clip_(body) };
  put_('Comments', COMMENT_COLS, c);
  return c;
}

var ACTIONS = {
  list: function (req, email, staff) {
    var counts = {};
    rows_('Comments', COMMENT_COLS).forEach(function (c) { if (c.kind === 'comment') counts[c.ticket] = (counts[c.ticket] || 0) + 1; });
    var ts = rows_('Tickets', TICKET_COLS).filter(function (t) { return mine_(t, email, staff); })
      .map(function (t) { return view_(t, counts[t.id]); });
    return { tickets: ts, staff: staff, staffList: staff ? staffList_() : [], statuses: STATUSES, serverTime: iso_() };
  },
  get: function (req, email, staff) {
    var t = find_(String(req.id));
    if (!mine_(t, email, staff)) throw new Error('That ticket is not yours.');
    var cs = rows_('Comments', COMMENT_COLS).filter(function (c) { return c.ticket === t.id; })
      .map(function (c) { return { id: c.id, at: c.at, name: c.name, email: c.email, staff: !!c.staff, kind: c.kind, body: c.body }; });
    return { ticket: view_(t, cs.filter(function (c) { return c.kind === 'comment'; }).length), comments: cs };
  },
  create: function (req, email, staff) {
    var title = clip_(req.title, 140).trim(), desc = clip_(req.description).trim();
    if (!title) throw new Error('Give the request a title.');
    if (!desc) throw new Error('Describe what you need.');
    var t = { id: nextId_(), created: iso_(), title: title, category: clip_(req.category, 40) || 'Other',
      priority: PRIORITIES.indexOf(req.priority) >= 0 ? req.priority : 'Normal', status: 'New', description: desc,
      studio: clip_(req.studio, 40), link: clip_(req.link, 400), name: clip_(req.name, 80) || email, email: email, assignee: '' };
    touch_(t, email, 'created', title);
    put_('Tickets', TICKET_COLS, t);
    mail_([email], '[' + t.id + '] We have your request', t, 'Thanks — your request is in. You will get an email each time its status changes or someone comments.');
    mail_(staffList_().filter(function (s) { return s !== email; }), '[' + t.id + '] New request: ' + t.title, t,
      t.name + ' (' + email + ') opened a ' + t.priority.toLowerCase() + '-priority ' + t.category.toLowerCase() + ' request.\n\n' + t.description);
    return { ticket: view_(t, 0) };
  },
  comment: function (req, email, staff) {
    var t = find_(String(req.id));
    if (!mine_(t, email, staff)) throw new Error('That ticket is not yours.');
    var body = clip_(req.body).trim();
    if (!body) throw new Error('Write a comment first.');
    addComment_(t, req, email, staff, 'comment', body);
    touch_(t, email, 'comment', body);
    // A requester answering a "Needs your input" ticket puts it back with the team.
    if (!staff && t.status === 'Needs your input') { t.status = 'In progress'; addComment_(t, req, email, false, 'status', 'Moved to In progress'); }
    put_('Tickets', TICKET_COLS, t);
    var to = (t.email !== email) ? [t.email] : (t.assignee ? [t.assignee] : staffList_());
    mail_(to.filter(function (s) { return s !== email; }), '[' + t.id + '] New comment: ' + t.title, t, (req.name || email) + ' wrote:\n\n' + body);
    return { ticket: view_(t, 0) };
  },
  status: function (req, email, staff) {
    var t = find_(String(req.id)), s = String(req.status);
    if (STATUSES.indexOf(s) < 0) throw new Error('Unknown status.');
    // Staff move a card anywhere; a requester may only close their own ticket or reopen it.
    if (!staff && !(t.email === email && (s === 'Done' || s === 'New'))) throw new Error('Only the design team can change that.');
    if (t.status === s) return { ticket: view_(t, 0) };
    var was = t.status;
    t.status = s;
    if (staff && !t.assignee && s !== 'New') t.assignee = email;
    addComment_(t, req, email, staff, 'status', 'Moved from ' + was + ' to ' + s);
    touch_(t, email, 'status', s);
    put_('Tickets', TICKET_COLS, t);
    if (t.email !== email) mail_([t.email], '[' + t.id + '] Now ' + s + ': ' + t.title, t, 'Status changed from ' + was + ' to ' + s + '.');
    return { ticket: view_(t, 0) };
  },
  assign: function (req, email, staff) {
    if (!staff) throw new Error('Only the design team can assign.');
    var t = find_(String(req.id)), who = String(req.assignee || '').trim().toLowerCase();
    if (who && !isStaff_(who)) throw new Error('That person is not on the design team.');
    t.assignee = who;
    touch_(t, email, 'status', who ? 'Assigned to ' + who : 'Unassigned');
    addComment_(t, req, email, true, 'status', who ? 'Assigned to ' + who : 'Unassigned');
    put_('Tickets', TICKET_COLS, t);
    return { ticket: view_(t, 0) };
  }
};

function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function mail_(to, subject, t, message) {
  to = to.filter(function (a, i) { return a && to.indexOf(a) === i; });
  if (!to.length) return;
  var url = prop_('APP_URL'), link = url ? url + (url.indexOf('#') < 0 ? '#' : '&') + 'support=' + t.id : '';
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#0A0B0D;max-width:520px">'
    + '<p style="white-space:pre-wrap;margin:0 0 16px">' + esc_(message) + '</p>'
    + '<p style="margin:0 0 4px"><b>' + esc_(t.title) + '</b></p>'
    + '<p style="margin:0 0 16px;color:#5B616E">' + esc_(t.id) + ' · ' + esc_(t.status) + ' · ' + esc_(t.category) + '</p>'
    + (link ? '<p><a href="' + esc_(link) + '" style="background:#1A2942;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Open the ticket</a></p>' : '')
    + '</div>';
  try { MailApp.sendEmail({ to: to.join(','), subject: subject, htmlBody: html, name: 'Provident Studio Support' }); }
  catch (err) { /* a mail quota or bounce must never fail the ticket itself */ }
}
