"""
Health-checks the live site and auto-swaps the static maintenance page in or out over FTP.

Why this exists: this hosting plan has no SSH and no server-side process manager we can hook —
Plesk/FTP only (see agents.md §11). When the Node app goes down, LiteSpeed still serves whatever
static index.html sits in the document root, so the recovery move is always "put a maintenance
page at index.html", and un-recovery is "take it back out once the app is healthy again". That
swap was previously done by hand over several outages; this script does it on a schedule instead
(registered as a Windows Scheduled Task -- see ops/register-watchdog-task.ps1).

Health check hits /login specifically, not /: "/" is exactly the path a shadowing index.html
would return 200 for even while the Node app is fully dead, so it can't distinguish "app healthy"
from "app dead but a static file happens to be here". /login is on proxy.ts's always-public
allowlist regardless of the require-login toggle, and a real response carries the
`X-Powered-By: Next.js` header that a static file never does -- that header is the actual signal.

Credentials come from ops/ftp-credentials.local.json (gitignored, never committed -- same rule as
.env*). Create it next to this file:
    {"host": "marketplace.apps-pilot.nl", "user": "edski", "passwords": ["...", "..."]}
"""

import ftplib
import io
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
CREDS_PATH = HERE / "ftp-credentials.local.json"
LOG_PATH = HERE / "watchdog.log"
MAINTENANCE_PAGE = HERE.parent / "apps" / "web" / "maintenance.html"

HEALTH_CHECK_URL = "https://marketplace.apps-pilot.nl/login"
REMOTE_CWD = "marketplace.apps-pilot.nl"  # this FTP account is chrooted one level above the app root
REMOTE_INDEX = "index.html"


def log(message: str) -> None:
    line = f"[{datetime.now(timezone.utc).isoformat(timespec='seconds')}] {message}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_credentials() -> dict:
    if not CREDS_PATH.exists():
        log(f"ERROR: missing {CREDS_PATH} -- see this script's docstring for the format")
        sys.exit(1)
    return json.loads(CREDS_PATH.read_text(encoding="utf-8"))


def check_app_health() -> tuple[bool, str]:
    """Returns (healthy, reason)."""
    try:
        req = urllib.request.Request(HEALTH_CHECK_URL, headers={"User-Agent": "afrodeals-watchdog"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            powered_by = resp.headers.get("X-Powered-By", "")
            if status >= 500:
                return False, f"status {status}"
            if "Next.js" not in powered_by:
                return False, f"status {status} but X-Powered-By={powered_by!r} (likely a static fallback, not the real app)"
            return True, f"status {status}, X-Powered-By={powered_by}"
    except urllib.error.HTTPError as e:
        # A non-5xx HTTPError (e.g. redirect chains that urllib refuses) still tells us the server
        # answered -- treat 3xx/4xx as reachable-but-inspect, everything else as down.
        if e.code < 500:
            powered_by = e.headers.get("X-Powered-By", "") if e.headers else ""
            if "Next.js" in powered_by:
                return True, f"status {e.code}, X-Powered-By={powered_by}"
            return False, f"status {e.code} but X-Powered-By={powered_by!r}"
        return False, f"HTTPError {e.code}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def connect(creds: dict) -> ftplib.FTP_TLS:
    last_err = None
    for password in creds["passwords"]:
        try:
            ftp = ftplib.FTP_TLS(timeout=30)
            ftp.connect(creds["host"], 21)
            ftp.login(creds["user"], password)
            ftp.prot_p()
            ftp.cwd(REMOTE_CWD)
            ftp.voidcmd("TYPE I")
            return ftp
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"could not connect/login with any configured password: {last_err}")


def remote_file_exists(ftp: ftplib.FTP_TLS, name: str) -> bool:
    try:
        ftp.size(name)
        return True
    except ftplib.error_perm:
        return False


def deploy_maintenance_page(ftp: ftplib.FTP_TLS) -> None:
    if remote_file_exists(ftp, REMOTE_INDEX):
        log("maintenance page already deployed (index.html exists) -- nothing to do")
        return
    if not MAINTENANCE_PAGE.exists():
        log(f"ERROR: {MAINTENANCE_PAGE} not found locally, cannot deploy maintenance page")
        return
    data = MAINTENANCE_PAGE.read_bytes()
    ftp.storbinary(f"STOR {REMOTE_INDEX}", io.BytesIO(data))
    remote_size = ftp.size(REMOTE_INDEX)
    if remote_size == len(data):
        log(f"deployed maintenance page ({remote_size} bytes) -- app is down")
    else:
        log(f"WARNING: uploaded maintenance page but size mismatch (local={len(data)} remote={remote_size})")


def clear_maintenance_page(ftp: ftplib.FTP_TLS) -> None:
    if not remote_file_exists(ftp, REMOTE_INDEX):
        return  # already clear, nothing to log every run
    backup_name = f"index.html.autoremoved-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}.bak"
    ftp.rename(REMOTE_INDEX, backup_name)
    log(f"app is healthy again -- moved {REMOTE_INDEX} out of the way (-> {backup_name})")


def main() -> None:
    creds = load_credentials()
    healthy, reason = check_app_health()
    log(f"check: healthy={healthy} ({reason})")

    if healthy:
        try:
            ftp = connect(creds)
        except Exception as e:
            log(f"app healthy ({reason}) but could not connect over FTP to check/clear maintenance page: {e}")
            return
        try:
            clear_maintenance_page(ftp)
        finally:
            ftp.quit()
    else:
        log(f"app unhealthy: {reason}")
        try:
            ftp = connect(creds)
        except Exception as e:
            log(f"app unhealthy AND could not connect over FTP to deploy maintenance page: {e}")
            return
        try:
            deploy_maintenance_page(ftp)
        finally:
            ftp.quit()


if __name__ == "__main__":
    main()
