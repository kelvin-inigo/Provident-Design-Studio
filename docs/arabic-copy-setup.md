# Arabic copy by Claude — admin setup

CAS writes an Arabic project's words with Claude (**Make the Arabic**, **Start the Arabic**, and
**Write the Arabic** on the Ad set tab's Arabic copy card). The studio sends the English layout's
lines to the site's own function (`api/share.py`, op `arcopy`); the function asks Claude, with the
team's Arabic copy rules (`AR_RULES` in that file), and the studio puts each line back in place.

Until the key below is set, the studio uses Google Translate instead, as it did before, and says
so in the message.

## Set it up (once, about 5 minutes)

1. Get an API key from the Claude Console (console.anthropic.com › **API keys**), on the company's
   account. Give it a name such as `provident-design-studio`.
2. In the Vercel dashboard, open the **provident-design-studio** project › **Settings** ›
   **Environment Variables**, and add `ANTHROPIC_API_KEY` with the key, for all environments.
3. Redeploy (**Deployments** › the latest › **Redeploy**). Environment variables only reach a
   deployment made after they were added.

Never put the key in the repository — it is public. It lives only in Vercel.

## Check it

Open an Arabic project in CAS, Ad set tab › **Arabic copy** › **Write the Arabic**. The message
reads *"Claude wrote N lines of Arabic."* If it says Google Translate was used, it also says why
(no key, not signed in, Claude did not answer).

## Notes

- **Who can use it:** only someone signed in to the studio with an active role (or the admin).
  The function checks the Google sign-in itself, so the key cannot be used from outside.
- **Model:** `claude-opus-5-5` at medium effort. `ARCOPY_MODEL` in Vercel overrides it.
- **Cost:** one request per Arabic version, a few cents (the rules are cached between requests).
- **Time:** usually well under a minute. The function gives Claude 55 seconds, then falls back.
  If Vercel's function time limit for the project is shorter than that, raise it (Settings ›
  Functions), or the fallback happens sooner.
- **The library:** `requirements.txt` at the root installs the `anthropic` package for the
  function. Without it the function answers "not installed" and the studio falls back.
- **Changing the rules:** edit `AR_RULES` in `api/share.py` and redeploy.
- **Testing on this computer:** `ARCOPY_DRY=1 python3 tools/share-dev/serve.py 8790` answers with
  `[عربي] <English>` for every line, without calling Claude.
