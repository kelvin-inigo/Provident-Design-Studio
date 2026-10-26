# Shared edit links — admin setup

CAS and OPS can make a link to a project that other people open, look at and change, with a
Changes panel saying who changed what (**Share › Share an edit link**). The links are stored by a
small function on the studio website, `api/share.py`, which needs a database connected to the
Vercel project. This is done **once**, by someone who can manage the Vercel project.

Until it is done, the button answers: *"Shared links are not switched on for this site yet."*

## 1. Connect a store (about 5 minutes)

1. Open the Vercel dashboard, then the **provident-design-studio** project.
2. Go to **Storage**, then **Create Database**, then pick **Upstash for Redis** (from the Marketplace).
3. Choose the **Free** plan and a region close to the team (for example Frankfurt), and create it.
4. When asked which projects to connect, pick **provident-design-studio** and all environments.
   This adds the store's address and token to the project as environment variables
   (`KV_REST_API_URL` and `KV_REST_API_TOKEN`). The function also accepts
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
5. Redeploy: **Deployments**, then the latest one, then **Redeploy**. Environment variables only
   reach a deployment made after they were added.

Nothing secret goes into the repository. The token lives only in Vercel's environment settings.

## 2. Check it

1. Open the studio on the website, open or start a project, then press **Share › Share an edit link**.
2. Type a name and press **Make the link**. You should get a link ending in `#share=…`.
3. Open that link in a private window. It asks for a name and opens the project. Change a word.
   Within a few seconds the change shows in the first window, and the **Changes** panel lists it.

To check the function directly, open `https://provident-design-studio.vercel.app/api/share?op=rev&id=abcdefgh`.
It should answer *"This shared link has expired or was never made."* If instead it says the store
is not connected, step 1.4 or 1.5 is missing.

## What it costs and what it stores

- **Per link:** the project (no photos, usually under 1 MB), each photo split into ~0.9 MB parts,
  and the change log (the last 500 entries).
- **Expiry:** a link nobody opens or edits for **180 days** expires and its data goes with it.
- **Free plan limits (Upstash, check their pricing page for current numbers):** about 256 MB of
  data and 500,000 commands a month. A project with ten photos is roughly 20–30 MB. An open
  studio tab on a link checks for changes every 12 seconds while it is on screen (2 commands),
  so one person working all day uses about 2,400 commands. A handful of people sharing links
  every day fits the free plan; if it fills up, move to the pay-as-you-go plan in Upstash.

- **Ad set reviews (CAS):** an ad set adds a small record (`rs:<rid>`, its log, a ~20 KB
  picture) and three token keys (`rvt:<token>`); each member project gets `sh:<id>:rid`, a summary
  and a picture. These, and each member's `meta` and log, **do not expire**, so the designer's
  **Review links** archive keeps the record. The projects and their photos still expire after
  180 days unused. No extra setup: reviews use the same store.

## Security

- **Anyone with the link can view and edit the project.** There is no sign-in. The link's id is
  12 random letters and digits, so it can't be guessed, but anyone it is forwarded to can edit.
- The function only stores and returns project data. It never reads any other part of the site.
- **To delete a link early:** in the Upstash console (Data Browser), delete the keys that start with
  `sh:<id>:`. The id is the part of the link after `#share=`. For an ad set review, delete `rs:<rid>`
  (and `rs:<rid>:log`, `rs:<rid>:thumb`) and its three `rvt:<token>` keys (the 16-character link ids).
- **An ad set's three links are three roles, not three passwords.** The performance marketing
  link is refused by the server if it tries to save, and the content team's link can only change
  the words of a project in the ad set (it is kept to Edit text by the studio, not by the server).
  Only the designer's link shows the other two links.

## Testing on this computer

`python3 tools/share-dev/serve.py` serves the repo on http://localhost:8790 with an in-memory
store (nothing leaves the computer, and it's all gone when it stops). In the studio's browser
console, run `localStorage.setItem('provident-share-base', location.origin)` once, so links point
at that server instead of the website.
