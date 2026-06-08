#!/usr/bin/env python3
import hashlib
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = 8091
PUBLIC_IP = "57.131.50.184"

USERS = {
    "admin": hashlib.sha256(b"CHANGE_ME_ADMIN_PASSWORD").hexdigest(),
    "superadmin": hashlib.sha256(b"CHANGE_ME_SUPERADMIN_PASSWORD").hexdigest(),
}
AUTH_FILE = Path("/opt/beamadmin/auth.json")
if AUTH_FILE.exists():
    try:
        loaded_users = json.loads(AUTH_FILE.read_text(encoding="utf-8"))
        if isinstance(loaded_users, dict):
            USERS.update({str(k): str(v) for k, v in loaded_users.items()})
    except Exception:
        pass

SERVERS = [
    {"id": "alex-server1", "service": "beammp-alex-server1.service", "name": "Alex Server 1", "path": "/opt/AlexServers/Server1", "port": 30819, "map": "GridMap", "maxPlayers": 16, "maxCars": 4, "tags": ["Freeroam"], "note": "Alex's BeamMP server"},
    {"id": "offroad", "service": "beammp-offroad.service", "name": "Str1x3vo Offroad", "path": "/opt/beammp-offroad", "port": 30816, "map": "Reshjemheia", "maxPlayers": 16, "maxCars": 3, "tags": ["Offroad", "Freeroam"], "note": "Public stock offroad server"},
    {"id": "offroad-plus", "service": "beammp-offroad-plus.service", "name": "Str1x3vo Offroad+", "path": "/opt/beammp-offroad-plus", "port": 30817, "map": "Johnson Valley", "maxPlayers": 16, "maxCars": 3, "tags": ["Offroad", "Freeroam"], "note": "Offroad plus with resource pack"},
    {"id": "vanilla", "service": "beammp-vanilla.service", "name": "Str1x3vo Vanilla", "path": "/opt/beammp-vanilla", "port": 30814, "map": "Italy", "maxPlayers": 16, "maxCars": 2, "tags": ["Freeroam"], "note": "Public stock freeroam server"},
    {"id": "vanilla-plus", "service": "beammp-vanilla-plus.service", "name": "Str1x3vo Vanilla+", "path": "/opt/beammp-vanilla-plus", "port": 30815, "map": "West Coast USA", "maxPlayers": 16, "maxCars": 2, "tags": ["Freeroam"], "note": "Freeroam plus with Str1x3vo resources"},
    {"id": "highforce", "service": "beammp-highforce.service", "name": "Str1x3vo Highforce Custom BackRoadDriving UK", "path": "/opt/beammp-highforce", "port": 30818, "map": "High Force", "maxPlayers": 16, "maxCars": 6, "tags": ["Backroads", "UK", "Custom"], "note": "Custom UK back road driving server"},
    {"id": "freeroam-old", "service": "beammp-server.service", "name": "Str1x3vo Public Freeroam", "path": "/opt/beammp-server", "port": 30814, "map": "West Coast USA", "maxPlayers": 16, "maxCars": 5, "tags": ["Freeroam"], "note": "Stopped; shares port 30814 with Vanilla"},
]

SESSIONS = {}
SESSION_USERS = {}
SESSION_TTL = 12 * 60 * 60
TROLL_ACTIONS = {
    "fling", "launch", "nudge", "spin", "flip", "freeze", "unfreeze",
    "killengine", "poptires", "repair", "reset", "blackout", "honk", "smoke",
}
USER_SERVER_ACCESS = {
    "alex": {"alex-server1"},
}
MAPS = ["Italy", "West Coast USA", "Reshjemheia", "Johnson Valley", "High Force", "GridMap", "Small Island", "Industrial Site", "East Coast USA"]
MAP_PATHS = {
    "Italy": "/levels/italy/info.json",
    "West Coast USA": "/levels/west_coast_usa/info.json",
    "Reshjemheia": "/levels/Reshjemheia/info.json",
    "Johnson Valley": "/levels/johnson_valley/info.json",
    "High Force": "/levels/highforce/info.json",
    "GridMap": "/levels/gridmap_v2/info.json",
    "Small Island": "/levels/small_island/info.json",
    "Industrial Site": "/levels/industrial/info.json",
    "East Coast USA": "/levels/east_coast_usa/info.json",
}
MOD_SOURCE_DIR = Path("/opt/beamadmin/mods")
MOD_TARGET_SERVER_ID = "vanilla-plus"

MANAGEMENT_TOOL_DIR = Path("/opt/AlexServers/BeamMP-Server-Management-Tool")
MANAGEMENT_TOOL_BACKUP_DIR = Path("/opt/servermangament/BeamMP-Server-Management-Tool")
MANAGEMENT_TOOL_EXE = MANAGEMENT_TOOL_DIR / "BeamMP Tool" / "bin" / "Release" / "BeamMP Server Management Tool v3.1.exe"


def file_info(path):
    path = Path(path)
    if not path.exists():
        return {"exists": False, "path": str(path), "name": path.name, "size": 0, "modified": 0}
    stat = path.stat()
    return {"exists": True, "path": str(path), "name": path.name, "size": stat.st_size, "modified": int(stat.st_mtime)}


def management_tool_info():
    return {
        "sourceDir": str(MANAGEMENT_TOOL_DIR),
        "backupDir": str(MANAGEMENT_TOOL_BACKUP_DIR),
        "serverDir": "/opt/AlexServers/Server1",
        "executable": file_info(MANAGEMENT_TOOL_EXE),
        "downloadUrl": "/api/management-tool/download/exe",
        "type": "Windows desktop application",
    }


def bridge_dir(server):
    return Path(server["path"]) / "Resources" / "Server" / "beamadmin_bridge"


def read_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return fallback


def write_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + "." + secrets.token_hex(8) + ".tmp")
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    os.chmod(tmp, 0o664)
    os.replace(tmp, path)
    os.chmod(path, 0o664)


def allowed_servers_for(username):
    allowed = USER_SERVER_ACCESS.get(username)
    if not allowed:
        return SERVERS
    return [server for server in SERVERS if server["id"] in allowed]


def server_by_id(server_id, username=None):
    servers = allowed_servers_for(username) if username else SERVERS
    for server in servers:
        if server["id"] == server_id:
            return server
    return None


def normalize_status(status):
    if not isinstance(status, dict):
        return {}
    players = status.get("players")
    if isinstance(players, dict):
        status["players"] = list(players.values())
    elif not isinstance(players, list):
        status["players"] = []
    status["playerCount"] = len(status["players"])
    return status


def queue_command(server, command):
    queue_file = bridge_dir(server) / "queue.json"
    queue = read_json(queue_file, [])
    if not isinstance(queue, list):
        queue = []
    command["id"] = command.get("id") or secrets.token_hex(12)
    command["createdAt"] = int(time.time())
    queue.append(command)
    write_json(queue_file, queue[-100:])
    return command


def read_server_config(server):
    config_path = Path(server["path"]) / "ServerConfig.toml"
    text = ""
    try:
        text = config_path.read_text(encoding="utf-8")
    except Exception:
        pass

    def val(key, fallback=""):
        match = re.search(rf"^\s*{re.escape(key)}\s*=\s*(.+?)\s*$", text, re.M)
        if not match:
            return fallback
        raw = match.group(1).strip()
        if raw.startswith('"') and raw.endswith('"'):
            return raw[1:-1]
        if raw.lower() in ("true", "false"):
            return raw.lower() == "true"
        try:
            return int(raw)
        except Exception:
            return raw

    map_path = val("Map", server.get("map", ""))
    current_map = next((name for name, path in MAP_PATHS.items() if path == map_path), server.get("map", map_path))
    return {
        "name": val("Name", server["name"]),
        "maxPlayers": val("MaxPlayers", server.get("maxPlayers", 16)),
        "password": val("Password", ""),
        "private": val("Private", False),
        "map": current_map,
        "mapPath": map_path,
    }


def write_server_config(server, updates):
    config_path = Path(server["path"]) / "ServerConfig.toml"
    text = config_path.read_text(encoding="utf-8")
    replacements = {
        "Name": str(updates.get("name", "")).strip(),
        "MaxPlayers": str(int(updates.get("maxPlayers", 16))),
        "Password": str(updates.get("password", "")),
        "Private": "true" if bool(updates.get("private")) else "false",
    }

    for key, value in replacements.items():
        if key == "MaxPlayers" or key == "Private":
            rendered = value
        else:
            rendered = '"' + value.replace('"', '\\"') + '"'
        pattern = rf"^(\s*{re.escape(key)}\s*=\s*).*$"
        if re.search(pattern, text, re.M):
            text = re.sub(pattern, rf"\g<1>{rendered}", text, flags=re.M)
        else:
            text += f"\n{key} = {rendered}\n"

    config_path.write_text(text, encoding="utf-8")
    return read_server_config(server)


def set_server_map(server, map_name):
    if map_name not in MAP_PATHS:
        raise ValueError("unknown map")
    config_path = Path(server["path"]) / "ServerConfig.toml"
    text = config_path.read_text(encoding="utf-8")
    rendered = '"' + MAP_PATHS[map_name].replace('"', '\\"') + '"'
    pattern = r"^(\s*Map\s*=\s*).*$"
    if re.search(pattern, text, re.M):
        text = re.sub(pattern, rf"\g<1>{rendered}", text, flags=re.M)
    else:
        text += f"\nMap = {rendered}\n"
    config_path.write_text(text, encoding="utf-8")
    return read_server_config(server)


def run_command(args, timeout=15):
    return subprocess.run(
        args,
        text=True,
        capture_output=True,
        timeout=timeout,
    )


def systemctl_value(service, prop):
    try:
        result = run_command(["systemctl", "show", service, "--property", prop, "--value"])
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def systemctl_active(service):
    try:
        result = run_command(["systemctl", "is-active", service])
        return result.stdout.strip()
    except Exception:
        return "unknown"


def systemctl_args(action, service):
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        return ["systemctl", action, service]
    return ["sudo", "-n", "systemctl", action, service]


def tcp_port_open(port):
    try:
        with socket.create_connection(("127.0.0.1", int(port)), timeout=1):
            return True
    except Exception:
        return False


def restart_server_service(server):
    service = server.get("service")
    if not service:
        raise RuntimeError("server service is not configured")
    before = systemctl_value(service, "ExecMainStartTimestampMonotonic")
    stop_result = run_command(systemctl_args("stop", service), timeout=45)
    if stop_result.returncode != 0:
        detail = (stop_result.stderr or stop_result.stdout or "stop failed").strip()
        if "password" in detail.lower() or "sudo" in detail.lower():
            detail += " Passwordless sudo is required for the beamadmin service user to manage BeamMP services."
        raise RuntimeError(detail)

    port = server.get("port")
    deadline = time.time() + 30
    stopped = False
    while time.time() < deadline:
        inactive = systemctl_active(service) in ("inactive", "failed")
        port_closed = not port or not tcp_port_open(port)
        if inactive and port_closed:
            stopped = True
            break
        time.sleep(1)

    if not stopped:
        raise RuntimeError(f"{service} did not fully stop before restart")

    time.sleep(1)

    start_result = run_command(systemctl_args("start", service), timeout=45)
    if start_result.returncode != 0:
        detail = (start_result.stderr or start_result.stdout or "start failed").strip()
        raise RuntimeError(detail)

    deadline = time.time() + 30
    last_active = "unknown"
    last_marker = ""
    while time.time() < deadline:
        last_active = systemctl_active(service)
        last_marker = systemctl_value(service, "ExecMainStartTimestampMonotonic")
        if last_active == "active" and (not before or not last_marker or last_marker != before):
            return {"service": service, "status": last_active, "startedAt": last_marker}
        time.sleep(1)

    raise RuntimeError(f"{service} did not report a new active process after restart; status={last_active}")


def tail_lines(path, limit=100):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            lines = handle.readlines()
        return [line.rstrip("\n") for line in lines[-limit:]]
    except Exception:
        return []


def read_bridge_results(server, limit=100):
    return tail_lines(bridge_dir(server) / "results.log", limit)


def bans_for_server(server):
    bridge = read_json(bridge_dir(server) / "status.json", {})
    bridge_bans = normalize_status(bridge).get("bans", {})
    rows = []
    for beammp_id, reason in (bridge_bans.get("accounts") or {}).items():
        rows.append({"playerName": "BeamMP account", "beammpId": beammp_id, "reason": reason, "bannedOn": "", "serverId": server["id"], "serverName": server["name"], "playerId": beammp_id})
    for ip_address, reason in (bridge_bans.get("ips") or {}).items():
        rows.append({"playerName": "IP address", "beammpId": "", "ip": ip_address, "reason": reason, "bannedOn": "", "serverId": server["id"], "serverName": server["name"], "playerId": "ip:" + ip_address})
    return rows


def mod_target_server(username=None):
    if username and username in USER_SERVER_ACCESS:
        servers = allowed_servers_for(username)
        if not servers:
            raise RuntimeError("mod target server is not configured")
        return servers[0]
    server = server_by_id(MOD_TARGET_SERVER_ID)
    if not server:
        raise RuntimeError("mod target server is not configured")
    return server


def mod_target_dir(username=None):
    return Path(mod_target_server(username)["path"]) / "Resources" / "Client"


def safe_mod_name(value):
    name = Path(str(value or "")).name
    if not name.lower().endswith(".zip") or name in ("", ".", ".."):
        return ""
    return name


def list_mods(username=None):
    MOD_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    target = mod_target_dir(username)
    target.mkdir(parents=True, exist_ok=True)
    mods = []
    for path in sorted(MOD_SOURCE_DIR.glob("*.zip"), key=lambda p: p.name.lower()):
        installed_path = target / path.name
        stat = path.stat()
        mods.append({
            "name": path.name,
            "size": stat.st_size,
            "modified": int(stat.st_mtime),
            "installed": installed_path.exists(),
            "targetPath": str(installed_path),
        })
    return {
        "sourceDir": str(MOD_SOURCE_DIR),
        "targetServerId": mod_target_server(username)["id"],
        "targetServerName": mod_target_server(username)["name"],
        "targetDir": str(target),
        "mods": mods,
    }


def apply_mods(names, username=None):
    MOD_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    target = mod_target_dir(username)
    target.mkdir(parents=True, exist_ok=True)
    copied = []
    skipped = []
    for raw_name in names or []:
        name = safe_mod_name(raw_name)
        if not name:
            skipped.append({"name": str(raw_name), "reason": "invalid zip name"})
            continue
        src = MOD_SOURCE_DIR / name
        if not src.exists():
            skipped.append({"name": name, "reason": "source file not found"})
            continue
        dst = target / name
        shutil.copy2(src, dst)
        os.chmod(dst, 0o664)
        copied.append({"name": name, "path": str(dst)})
    return {"copied": copied, "skipped": skipped, "state": list_mods(username)}


def safe_text(value, fallback):
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    return text[:180] if text else fallback


def authed(handler):
    auth = handler.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return False
    token = auth.split(" ", 1)[1].strip()
    expires = SESSIONS.get(token)
    if not expires or expires < time.time():
        SESSIONS.pop(token, None)
        SESSION_USERS.pop(token, None)
        return False
    SESSIONS[token] = time.time() + SESSION_TTL
    handler.current_username = SESSION_USERS.get(token, "")
    return True


class Handler(BaseHTTPRequestHandler):
    server_version = "BeamAdminAPI/1.0"

    def log_message(self, fmt, *args):
        return

    def send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


    def send_file(self, path, download_name=None):
        path = Path(path)
        if not path.exists() or not path.is_file():
            self.send_json(404, {"error": "file not found"})
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        safe_name = (download_name or path.name).replace("\"", "")
        self.send_header("Content-Disposition", f"attachment; filename=\"{safe_name}\"")
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return {}

    def require_auth(self):
        if authed(self):
            return True
        self.send_json(401, {"error": "unauthorized"})
        return False

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_body()

        if path == "/api/login":
            username = str(body.get("username", "")).strip()
            password = str(body.get("password", ""))
            expected = USERS.get(username)
            digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
            if expected and secrets.compare_digest(expected, digest):
                token = secrets.token_urlsafe(32)
                SESSIONS[token] = time.time() + SESSION_TTL
                SESSION_USERS[token] = username
                self.send_json(200, {"token": token, "username": username})
            else:
                self.send_json(403, {"error": "bad credentials"})
            return

        if not self.require_auth():
            return

        parts = path.strip("/").split("/")
        if len(parts) == 4 and parts[0] == "api" and parts[1] == "servers" and parts[3] in ("kick", "ban", "unban", "fling", "troll", "launch", "nudge", "spin", "flip", "freeze", "unfreeze", "killengine", "poptires", "repair", "reset", "blackout", "honk", "smoke"):
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return

            action = parts[3]
            command = queue_command(server, {
                "action": action,
                "playerId": safe_text(body.get("playerId"), ""),
                "playerName": safe_text(body.get("playerName"), ""),
                "accountId": safe_text(body.get("accountId"), ""),
                "ip": safe_text(body.get("ip"), ""),
                "strength": safe_text(body.get("strength"), "70"),
                "duration": safe_text(body.get("duration"), ""),
                "reason": safe_text(body.get("reason"), "Admin action from BeamAdmin"),
            })
            if action in ("kick", "ban", "fling", "troll", "launch", "nudge", "spin", "flip", "freeze", "unfreeze", "killengine", "poptires", "repair", "reset", "blackout", "honk", "smoke") and not command["playerId"] and not command["playerName"]:
                self.send_json(400, {"error": "playerId or playerName required"})
                return

            self.send_json(202, {"ok": True, "command": command})
            return

        if len(parts) == 4 and parts[0] == "api" and parts[1] == "servers" and parts[3] in ("deletevehicle", "changemap", "console", "restart", "startlights"):
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return
            action = parts[3]
            if action == "deletevehicle":
                command = queue_command(server, {"action": "deletevehicle", "playerId": safe_text(body.get("playerId"), ""), "vehicleId": safe_text(body.get("vehicleId"), "")})
            elif action == "restart":
                try:
                    restart = restart_server_service(server)
                    self.send_json(200, {"ok": True, "restart": restart})
                    return
                except Exception as exc:
                    self.send_json(500, {"error": str(exc)})
                    return
            elif action == "changemap":
                map_name = safe_text(body.get("map"), "")
                if map_name not in MAP_PATHS:
                    self.send_json(400, {"error": "unknown map"})
                    return
                try:
                    settings = set_server_map(server, map_name)
                    restart = restart_server_service(server)
                    self.send_json(200, {"ok": True, "map": map_name, "settings": settings, "restart": restart})
                    return
                except Exception as exc:
                    self.send_json(500, {"error": str(exc)})
                    return
            else:
                if action == "startlights":
                    command = queue_command(server, {"action": "startlights", "seconds": 5})
                else:
                    command = queue_command(server, {"action": "console", "command": safe_text(body.get("command"), "")})
            self.send_json(202, {"ok": True, "command": command})
            return

        if len(parts) == 4 and parts[0] == "api" and parts[1] == "servers" and parts[3] == "settings":
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return
            try:
                settings = write_server_config(server, body)
                self.send_json(200, {"ok": True, "settings": settings})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/auth/changepassword":
            old_password = str(body.get("oldPassword", ""))
            new_password = str(body.get("newPassword", ""))
            username = str(body.get("username", "admin"))
            expected = USERS.get(username)
            digest = hashlib.sha256(old_password.encode("utf-8")).hexdigest()
            if not expected or not secrets.compare_digest(expected, digest):
                self.send_json(403, {"error": "old password is incorrect"})
                return
            USERS[username] = hashlib.sha256(new_password.encode("utf-8")).hexdigest()
            write_json(Path("/opt/beamadmin/auth.json"), USERS)
            self.send_json(200, {"ok": True})
            return

        if path == "/api/mods/apply":
            try:
                result = apply_mods(body.get("mods", []), getattr(self, "current_username", ""))
                self.send_json(200, {"ok": True, **result})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        self.send_json(404, {"error": "not found"})

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            self.send_json(200, {"ok": True})
            return

        if not self.require_auth():
            return

        if path == "/api/servers":
            payload = []
            for server in allowed_servers_for(getattr(self, "current_username", "")):
                status = read_json(bridge_dir(server) / "status.json", {})
                item = dict(server)
                item["address"] = f"{PUBLIC_IP}:{server['port']}"
                item["bridge"] = normalize_status(status)
                item["online"] = bool(item["bridge"].get("seenAt") and time.time() - int(item["bridge"].get("seenAt", 0)) < 20)
                payload.append(item)
            self.send_json(200, {"publicIp": PUBLIC_IP, "servers": payload})
            return

        if path == "/api/mods":
            try:
                self.send_json(200, list_mods(getattr(self, "current_username", "")))
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/management-tool":
            self.send_json(200, management_tool_info())
            return

        if path == "/api/management-tool/download/exe":
            self.send_file(MANAGEMENT_TOOL_EXE, MANAGEMENT_TOOL_EXE.name)
            return

        parts = path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "servers":
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return
            status = read_json(bridge_dir(server) / "status.json", {})
            item = dict(server)
            item["address"] = f"{PUBLIC_IP}:{server['port']}"
            item["bridge"] = normalize_status(status)
            item["online"] = bool(item["bridge"].get("seenAt") and time.time() - int(item["bridge"].get("seenAt", 0)) < 20)
            self.send_json(200, item)
            return

        if len(parts) == 4 and parts[0] == "api" and parts[1] == "servers":
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return
            route = parts[3]
            status = normalize_status(read_json(bridge_dir(server) / "status.json", {}))
            if route == "status":
                item = dict(server)
                item["address"] = f"{PUBLIC_IP}:{server['port']}"
                item["bridge"] = status
                item["settings"] = read_server_config(server)
                item["online"] = bool(status.get("seenAt") and time.time() - int(status.get("seenAt", 0)) < 20)
                self.send_json(200, item)
                return
            if route == "bans":
                self.send_json(200, {"bans": bans_for_server(server)})
                return
            if route == "settings":
                self.send_json(200, {"settings": read_server_config(server), "maps": MAPS})
                return
            if route == "consolelog":
                self.send_json(200, {"lines": read_bridge_results(server, 100)})
                return
            if route == "log":
                self.send_json(200, {"lines": tail_lines(Path(server["path"]) / "Server.log", 300)})
                return

        self.send_json(404, {"error": "not found"})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not self.require_auth():
            return
        parts = path.strip("/").split("/")
        if len(parts) == 5 and parts[0] == "api" and parts[1] == "servers" and parts[3] == "ban":
            server = server_by_id(parts[2], getattr(self, "current_username", ""))
            if not server:
                self.send_json(404, {"error": "server not found"})
                return
            player_id = safe_text(parts[4], "")
            command = {"action": "unban", "accountId": player_id, "playerName": player_id, "playerId": player_id}
            if player_id.startswith("ip:"):
                command["ip"] = player_id[3:]
            command = queue_command(server, command)
            self.send_json(202, {"ok": True, "command": command})
            return

        self.send_json(404, {"error": "not found"})


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
