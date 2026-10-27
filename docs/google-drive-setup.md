# Google Drive in the Campaign Ads Studio — admin setup

**For:** the Google Workspace admin for providentestate.com (or anyone with access to
Google Cloud under that organisation).
**Time:** about 15 minutes, once.
**Result:** an **OAuth client ID** — one long line ending in `.apps.googleusercontent.com` —
which you send to the design team.

## What this is for

In the Campaign Ads Studio (CAS), the **Ad sets** window can open a **Google Drive folder
link**. People can look through the exported ads and, in **Edit text**, change the words.
When they do, the studio saves the project file and the re-exported images back into that
same Drive folder, so the files and their share links stay the same.

To read and write those files, the studio asks each person to **sign in with Google**:

- Everyone uses their own Provident account, and everyone can only reach folders they can
  already open in Drive.
- No password and no secret are stored anywhere. There is no server.
- A sign-in lasts one hour. After that, the studio asks again.

## Step 1 — Create a Google Cloud project

1. Go to <https://console.cloud.google.com> and sign in with your providentestate.com admin
   account.
2. Top bar › project picker › **New project**.
   - **Name:** `Provident Design Studio`
   - **Organization:** providentestate.com
   - Click **Create**, then make sure the new project is selected in the top bar.

## Step 2 — Turn on the Google Drive API

1. Menu › **APIs & Services** › **Library**.
2. Search for **Google Drive API**, open it and click **Enable**.

## Step 3 — Set up the sign-in screen (the consent screen)

1. Menu › **Google Auth Platform** (in older consoles: **APIs & Services › OAuth consent
   screen**). If it asks you to get started, click **Get started**.
2. **App information:**
   - **App name:** `Provident Design Studio`
   - **User support email:** your address, or a team address
3. **Audience:** choose **Internal**. This is the important choice:
   - only providentestate.com accounts can sign in;
   - Google's app review does not apply, so there is nothing to wait for.
4. **Contact information:** your email. Agree to the policy and click **Create**.
5. Open **Data access** › **Add or remove scopes**. Add this scope, click **Update**, then
   **Save**:

   ```
   https://www.googleapis.com/auth/drive
   ```

   This lets a signed-in person open a folder from a pasted link and overwrite the files in
   it. It can still only reach what that person already has access to in Drive.

## Step 4 — Create the OAuth client ID

1. **Google Auth Platform** › **Clients** › **Create client**. In older consoles:
   **APIs & Services › Credentials › Create credentials › OAuth client ID**.
2. **Application type:** **Web application**
3. **Name:** `Design Studio web`
4. **Authorised JavaScript origins** › **Add URI**:

   ```
   https://provident-design-studio.vercel.app
   ```

   If the studio is ever served from another address, add that address here too. Enter only
   the start of the address, with no path and no slash at the end.
5. **Authorised redirect URIs:** leave empty.
6. Click **Create**.
7. Copy the **Client ID** (`…apps.googleusercontent.com`) and send it to the design team.

**Keep the client secret for Step 7.** It goes into Vercel and nowhere else. Never paste it
into the studio, a chat, an email or the repository (the repository is public).

## Step 5 — Only if your Workspace blocks unlisted apps

If **Admin console › Security › Access and data control › API controls** is set to block
unconfigured third-party apps, mark this app as trusted:

1. **API controls** › **Manage third-party app access** › **Configure new app**.
2. Search by the **Client ID** from step 4 and select it.
3. Choose who it applies to (everyone, or the design team's organisational unit).
4. Set access to **Trusted** and finish.

If that setting is not in use, skip this step.

## Step 6 — Folder access

People can only edit what they could already edit in Drive. For the shared ad-set folders,
give the design team **Editor** (or **Content manager** on a shared drive). A **Viewer** can
open and browse a folder but cannot save changes.

## Step 7 — Sign in once, not every hour (Vercel)

Without this step everyone signs in to Google about once an hour. With it, each person signs
in **once per computer** and the studio renews the session by itself in the background. The
studio keeps working either way; this only removes the hourly prompt.

1. Open **vercel.com** › the **provident-design-studio** project › **Settings** ›
   **Environment Variables**.
2. Add a variable:
   - **Key:** `GOOGLE_CLIENT_SECRET`
   - **Value:** the client secret from Step 4 (Google Auth Platform › Clients › Design Studio
     web › the secret, starting `GOCSPX-`)
   - **Environments:** Production (and Preview if you want previews to use it)
   - Mark it **Sensitive**.
3. **Redeploy** the latest deployment (Deployments › ⋯ › Redeploy), so it reads the variable.
4. Nothing changes in Google Cloud: the authorised JavaScript origin from Step 4 is all it
   needs, and **Authorised redirect URIs stay empty**.

To check it is on, open `https://provident-design-studio.vercel.app/api/gauth?op=status` —
it answers `{"on":true,…}`.

**After this, each person signs in one more time.** Google shows its permission screen once
(that is what gives the studio a renewal token). From then on the session renews silently for
six months of use. It ends if the person changes their Google password, an admin removes the
app's access, or they press **Use another account**.

**How it is kept safe:** the renewal token never reaches the page's scripts. It is sealed and
stored in a browser cookie that only the studio's own server function can read
(`api/gauth.py`), on this site only. If the secret is ever exposed, reset it in Google Cloud
(Clients › Design Studio web › Reset secret) and update the Vercel variable; everyone then
signs in once more.

## Using it (for the design team)

1. In CAS, open **Ad sets**.
2. Paste the client ID once in the **Google Drive** box and click **Save**. It is remembered
   on that computer. Alternatively, ask Claude to put it into the studio itself, so nobody
   has to paste it.
3. Paste a Drive folder link — the address of the folder, containing `/folders/` — and
   click **Open**.
4. Sign in with your Provident Google account when asked. **Allow pop-ups** for the site if
   the browser blocks the sign-in window.
5. The folder opens like a local one. **Edit text** saves the project file and the images
   back into Drive.

## Troubleshooting

| What you see | What to do |
|---|---|
| *"Not set up on this computer yet"* | Paste the client ID into the Google Drive box (Using it, step 2). |
| The sign-in window does not open | Allow pop-ups for the site, then click **Open** again. |
| Google says **Error 400: redirect_uri_mismatch** or **origin_mismatch** | The address in the browser bar is not in the client's **Authorised JavaScript origins** (step 4). |
| Google says **access_denied**, or that the app is blocked | The account is not a providentestate.com account, or step 5 is needed. |
| *"Drive cannot find that folder"* | That account has no access to the folder, or the link is to something else. |
| *"Your Google sign-in has expired"* | Click **Sign in with Google** in Edit text. Your edits are kept. |
