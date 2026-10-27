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
- **Expiry:** a link, its project and its changelog are **kept for good**, and so is a small
  (~640px) preview of every photo. Only the **full-size photos** expire: each one **60 days** after
  the link was last opened. After that the link still opens, showing the previews, and the
  Changes panel offers **Restore from a saved file…** (pick the project's `.json` from its Source
  folder). Opening the link on the computer that made the project puts the photos back by itself.
  Export and Save warn while a photo is still only its preview.
- **Free plan limits (Upstash, check their pricing page for current numbers):** about 250 MB of
  data and 500,000 commands a month. A project with ten photos is roughly 20–30 MB. An open
  studio tab on a link checks for changes every 12 seconds while it is on screen (2 commands),
  so one person working all day uses about 2,400 commands. A handful of people sharing links
  every day fits the free plan; if it fills up, move to the pay-as-you-go plan in Upstash.

- **Ad set reviews (CAS):** an ad set adds a small record (`rs:<rid>`, its log, a ~20 KB
  picture) and three token keys (`rvt:<token>`); each member project gets `sh:<id>:rid`, a summary
  and a picture. These, and each member's `meta` and log, **do not expire**, so the designer's
  **Review links** archive keeps the record. Like every link, only the full-size photos expire
  (60 days unused). No extra setup: reviews use the same store.

## Health

CAS's **Review links** page shows a strip with the store's state: answering or not, how fast, and
how full against the free 250 MB (`SHARE_STORE_MB` changes the figure; the size is the stored
values added up, refreshed at most every 20 minutes). It uses
`/api/share?op=health`, which anyone can call and which reveals no project data. When Upstash
refuses a request, the studio now shows Upstash's own reason, for example a used-up monthly
request allowance or a full store.

## When the store is full

Upstash refuses every write once the free plan's 250 MB is used, so edits on shared links stop
saving. The function then frees space by itself and tries the save again:

1. it deletes photos no link uses any more (replaced or removed) and photos left by deleted
   projects — nothing anyone sees changes;
2. if that is not enough, it deletes the full-size photos of links nobody has opened for
   14 days. They keep their previews, and the full photo comes back when the designer opens the
   link on their computer.

`share-admin.html` has the same two steps as **Free space** and **Free more**. If both are done
and it is still full, delete old links there or move the store to pay-as-you-go.

## Security

- **Anyone with the link can view and edit the project.** There is no sign-in. The link's id is
  12 random letters and digits, so it can't be guessed, but anyone it is forwarded to can edit.
- The function only stores and returns project data. It never reads any other part of the site.
- **See what takes the space, and delete links:** open `share-admin.html` on the site
  (`https://provident-design-studio.vercel.app/share-admin.html`). It needs one more environment
  variable in the Vercel project, **`SHARE_ADMIN_KEY`** — any long random string you make up
  (Settings › Environment Variables, then redeploy). Type that key into the page; it is kept on that
  computer only. The page lists every link with its size, largest first, and a Delete button.
  Deleting a project that is in an ad set also takes it out of the ad set.
- **To delete a link by hand:** in the Upstash console (Data Browser), delete the keys that start with
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
