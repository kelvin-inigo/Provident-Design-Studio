# Support tickets — backend

The OPS **Support** screen is a kanban board backed by a Google Sheet. This folder is the whole
backend: `Code.gs` is a Google Apps Script that reads and writes the Sheet and sends the emails.
No server, no new account, nothing to host.

## One-time setup (about five minutes)

1. Create a new Google Sheet (name it e.g. *Provident Studio Support*).
2. **Extensions → Apps Script**. Delete the default code, paste in `Code.gs`, save.
3. Run **`setup`** once (choose it in the function dropdown → Run). Approve the permissions —
   it needs the Sheet and Gmail (to send the notifications).
4. **Project Settings → Script properties → Add**:
   | property | value |
   |---|---|
   | `TEAM_KEY` | a passphrase of your choice — everyone who uses the desk types it once |
   | `STAFF` | comma-separated emails of the people who work the board |
   | `APP_URL` | *(optional)* where OPS is served — the emails then link to the ticket |
   | `ALLOWED_DOMAIN` | *(optional)* `providentestate.com` — refuses any other address |
5. **Deploy → New deployment → Web app**. Execute as **Me**, who has access **Anyone**.
   Copy the **Web app URL** (ends in `/exec`).
6. Open `tools/support/setup-link.html` in your browser, enter the URL, the key and the address OPS is opened from, and press **Make the link**.
7. Send that link to the team. Opening it connects their computer; they then type only their name and work email, once.

(An admin can instead enter the URL and key by hand: Support → *I am the admin*.) The setup link contains the key, so share it like one. Re-deploy (**Manage deployments → Edit → New
version**) after changing `Code.gs`; the URL stays the same.

## How it behaves

- **Requesters** see only their own tickets. **Staff** (the `STAFF` list) see everything and can
  drag cards between columns, assign, and comment.
- Columns: **New → In progress → Needs your input → Done.** A requester can close their own
  ticket or reopen it; a requester's reply on a *Needs your input* ticket puts it back
  *In progress*.
- **Email** goes to the requester on every status change and staff comment, to staff when a
  request is opened or a requester replies. You never get an email for your own action.
- **In-app**: OPS checks every minute while it is open; the bell counts tickets that changed
  since you last opened them, and (if you allow it) a desktop notification fires.

## Know this

- The team key and the email are **not real authentication**: anyone with the URL and key can
  claim any email in `ALLOWED_DOMAIN`. That is fine for an internal desk; it is not for
  anything confidential. A web app set to *Anyone in providentestate.com* would verify the
  Google account, but browsers cannot call it cross-origin, so it is not an option here.
- The URL and key are saved in this browser's `localStorage`, never in the repository.
- Gmail's daily send quota (about 100 recipients a day on a free account, 1,500 on Workspace)
  bounds the notifications; a failed send never fails the ticket.
