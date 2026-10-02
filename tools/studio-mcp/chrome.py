"""A private headless Chrome, driven over the DevTools protocol.

Standard library only (this Mac has no Node and no pip packages to lean on), so the
WebSocket client is written out here — about sixty lines, text frames only, which is all
the DevTools protocol uses.

The browser runs on its OWN throwaway profile. It shares nothing with the Chrome you use:
not its cookies, not its localStorage, not its photo store. A studio project loaded here
can never overwrite one you have open.
"""
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.request

CHROME_CANDIDATES = [
    os.environ.get("PROVIDENT_CHROME", ""),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]


class ChromeError(RuntimeError):
    pass


class _WS:
    """Minimal client-side WebSocket (RFC 6455): masked text frames out, any frames in."""

    def __init__(self, url, timeout=300):
        assert url.startswith("ws://")
        hostport, _, path = url[5:].partition("/")
        host, _, port = hostport.partition(":")
        self.sock = socket.create_connection((host, int(port or 80)), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            "GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)
        )
        self.sock.sendall(req.encode())
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ChromeError("DevTools closed the connection during the handshake")
            head += chunk
        status = head.split(b"\r\n", 1)[0]
        if b" 101 " not in status:
            raise ChromeError("DevTools refused the WebSocket: %r" % status)
        self.buf = head.split(b"\r\n\r\n", 1)[1]

    def _exact(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(1 << 20)
            if not chunk:
                raise ChromeError("DevTools connection closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def send(self, text):
        data = text.encode()
        n = len(data)
        if n < 126:
            hdr = struct.pack("!BB", 0x81, 0x80 | n)
        elif n < 65536:
            hdr = struct.pack("!BBH", 0x81, 0x80 | 126, n)
        else:
            hdr = struct.pack("!BBQ", 0x81, 0x80 | 127, n)
        mask = os.urandom(4)
        # XOR in one go: int.from_bytes keeps a 30MB image payload fast enough
        m = int.from_bytes((mask * (n // 4 + 1))[:n], "big")
        body = (int.from_bytes(data, "big") ^ m).to_bytes(n, "big") if n else b""
        self.sock.sendall(hdr + mask + body)

    def recv(self):
        parts = []
        while True:
            b0, b1 = self._exact(2)
            op, n = b0 & 0x0F, b1 & 0x7F
            if n == 126:
                n = struct.unpack("!H", self._exact(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", self._exact(8))[0]
            mask = self._exact(4) if b1 & 0x80 else None
            payload = self._exact(n)
            if mask:
                payload = bytes(c ^ mask[i % 4] for i, c in enumerate(payload))
            if op == 0x9:  # ping
                self.sock.sendall(struct.pack("!BB", 0x8A, 0x80) + os.urandom(4))
                continue
            if op == 0x8:
                raise ChromeError("DevTools closed the connection")
            parts.append(payload)
            if b0 & 0x80:
                return b"".join(parts).decode("utf-8", "replace")

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


class Chrome:
    def __init__(self, width=1440, height=900):
        exe = next((p for p in CHROME_CANDIDATES if p and os.path.exists(p)), None)
        if not exe:
            raise ChromeError("No Chrome found. Install Google Chrome, or set PROVIDENT_CHROME to its binary.")
        self.profile = tempfile.mkdtemp(prefix="provident-studio-mcp-")
        args = [
            exe, "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + self.profile,
            "--no-first-run", "--no-default-browser-check", "--disable-extensions",
            "--disable-background-networking", "--disable-sync", "--hide-scrollbars",
            "--mute-audio", "--window-size=%d,%d" % (width, height), "about:blank",
        ]
        self.proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        port_file = os.path.join(self.profile, "DevToolsActivePort")
        deadline = time.time() + 30
        while not os.path.exists(port_file):
            if self.proc.poll() is not None or time.time() > deadline:
                raise ChromeError("Chrome did not start")
            time.sleep(0.05)
        time.sleep(0.1)
        port = open(port_file).read().split()[0]
        targets = []
        while time.time() < deadline:
            try:
                targets = json.loads(urllib.request.urlopen("http://127.0.0.1:%s/json/list" % port).read())
                targets = [t for t in targets if t.get("type") == "page"]
                if targets:
                    break
            except OSError:
                pass
            time.sleep(0.1)
        if not targets:
            raise ChromeError("Chrome opened no page")
        self.ws = _WS(targets[0]["webSocketDebuggerUrl"])
        self._id = 0
        self.call("Page.enable")
        self.call("Runtime.enable")

    def call(self, method, params=None, timeout=300):
        self._id += 1
        mid = self._id
        self.ws.sock.settimeout(timeout)
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise ChromeError("%s: %s" % (method, msg["error"].get("message")))
                return msg.get("result", {})
            # a dialog would block the page forever: answer it and carry on
            if msg.get("method") == "Page.javascriptDialogOpening":
                self.ws.send(json.dumps({"id": 0, "method": "Page.handleJavaScriptDialog",
                                         "params": {"accept": True}}))

    def evaluate(self, expr, timeout=300):
        """Run an expression (top-level await allowed via an async IIFE) and return its JSON value."""
        res = self.call("Runtime.evaluate", {
            "expression": expr, "awaitPromise": True, "returnByValue": True,
            "userGesture": True, "timeout": int(timeout * 1000),
        }, timeout=timeout + 5)
        if res.get("exceptionDetails"):
            d = res["exceptionDetails"]
            exc = d.get("exception") or {}
            raise ChromeError(exc.get("description") or d.get("text") or "script error")
        return res.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        try:
            self.proc.terminate()
            self.proc.wait(5)
        except Exception:
            try:
                self.proc.kill()
            except Exception:
                pass
        shutil.rmtree(self.profile, ignore_errors=True)
