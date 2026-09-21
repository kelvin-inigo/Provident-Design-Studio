"""
Provident SSO guard — paste this into EACH dashboard Flask app.
============================================================================
What it does: before any page is served, it reads the signed `provident_sso`
cookie that Provident OS set on `.provident.estate`, verifies it locally with
the shared secret, and:

  * no/invalid/expired cookie  -> redirect to the login page
  * valid cookie but this app not in the user's allowed list -> 403

SLIDING SESSION: on every allowed request the cookie is RE-ISSUED with a fresh
8-hour timestamp. So an active user is never interrupted — they're only logged
out after 8 hours of INACTIVITY.

No network call, no database. `itsdangerous` ships with Flask, so there is
nothing extra to install.

HOW TO USE
----------
1. Copy this whole block into your dashboard app (after `app = Flask(__name__)`).
2. Set THIS_APP_KEY:
       "dashboard"  -> in the dashboard.provident.estate app
       "tracker"    -> in the tracker.provident.estate app
3. Set the PROVIDENT_SSO_SECRET environment variable to the EXACT same string
   as Provident OS's config.py -> SSO_SECRET, before starting this app. Never
   hardcode it here — this file is shared across apps and repos.
4. Activate it with ONE line:  install_sso_guard(app)

NOTE ON REVOCATION: because the cookie keeps re-signing the same payload, a
user's app access / disabled status only takes effect after 8h of inactivity
(or when they log out). That's the trade-off for fast, network-free checks.
============================================================================
"""
import os
from functools import wraps
from urllib.parse import quote

from flask import request, redirect, abort, g, after_this_request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

# ---- Settings (must match Provident OS) -----------------------------------
# SSO_SECRET is never hardcoded here — it is the master signing key for every
# app on .provident.estate, so it comes from the environment only. Set
# PROVIDENT_SSO_SECRET to the exact same string as Provident OS's
# config.py -> SSO_SECRET before starting this app.
SSO_SECRET = os.environ.get("PROVIDENT_SSO_SECRET")
if not SSO_SECRET:
    raise RuntimeError(
        "PROVIDENT_SSO_SECRET is not set. Set it to the exact same string as "
        "Provident OS's config.py -> SSO_SECRET before starting this app."
    )
SSO_SALT = "provident-sso-v1"
SSO_COOKIE_NAME = "provident_sso"
SSO_COOKIE_DOMAIN = ".provident.estate"         # shared across all subdomains
SSO_MAX_AGE = 60 * 60 * 24 * 365 * 10            # ~10 years: stay logged in
LOGIN_URL = "https://os.provident.estate/login"

# CHANGE THIS PER APP: "dashboard" here, or "tracker" in the tracker app.
THIS_APP_KEY = "social-studio"

_serializer = URLSafeTimedSerializer(SSO_SECRET, salt=SSO_SALT)


def _read_sso_user():
    """Return {'email':..., 'apps':[...]} from a valid cookie, else None."""
    token = request.cookies.get(SSO_COOKIE_NAME)
    if not token:
        return None
    try:
        return _serializer.loads(token, max_age=SSO_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def _refresh_cookie(response, user):
    """Re-issue the cookie with a fresh timestamp (sliding expiry)."""
    token = _serializer.dumps({"email": user["email"], "apps": user.get("apps", [])})
    response.set_cookie(
        SSO_COOKIE_NAME,
        token,
        max_age=SSO_MAX_AGE,
        domain=SSO_COOKIE_DOMAIN,
        httponly=True,
        samesite="Lax",
        secure=True,          # served over HTTPS in production
    )
    return response


def _check():
    """Shared gate: returns a redirect/abort response, or None if allowed."""
    user = _read_sso_user()
    if user is None:
        return redirect(f"{LOGIN_URL}?next={quote(request.url, safe='')}")
    if THIS_APP_KEY not in user.get("apps", []):
        abort(403)
    g.sso_user = user           # available to your views as g.sso_user
    return None


# ---- Option A: protect the WHOLE app (recommended) ------------------------
def install_sso_guard(app):
    @app.before_request
    def _provident_sso_before():
        return _check()

    @app.after_request
    def _provident_sso_slide(response):
        # Re-issue the cookie on every allowed request -> sliding 8h window.
        user = g.get("sso_user")
        if user is not None:
            _refresh_cookie(response, user)
        return response

# Usage:  install_sso_guard(app)


# ---- Option B: protect SPECIFIC routes only -------------------------------
def sso_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        blocked = _check()
        if blocked is not None:
            return blocked
        user = g.sso_user
        after_this_request(lambda resp: _refresh_cookie(resp, user))
        return view(*args, **kwargs)
    return wrapped

# Usage:
#   @app.route("/")
#   @sso_required
#   def home():
#       return f"Hello {g.sso_user['email']}"
