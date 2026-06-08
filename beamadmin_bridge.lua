local PLUGIN = "beamadmin_bridge"
local BASE_DIR = "Resources/Server/beamadmin_bridge"
local QUEUE_FILE = BASE_DIR .. "/queue.json"
local STATUS_FILE = BASE_DIR .. "/status.json"
local BANS_FILE = BASE_DIR .. "/bans.json"
local RESULTS_FILE = BASE_DIR .. "/results.log"
local TICK_EVENT = "beamadmin.bridge.tick"

local bans = {
    accounts = {},
}

local authProfiles = {}

local function log(message)
    print("[" .. PLUGIN .. "] " .. tostring(message))
end

local function now()
    if os and os.time then return os.time() end
    return 0
end

local function trim(value)
    local text = tostring(value or "")
    text = text:gsub("[%c\r\n\t]", " ")
    text = text:gsub("^%s+", ""):gsub("%s+$", "")
    return text
end

local function lower(value)
    return trim(value):lower()
end

local function ensureDir()
    if FS and FS.Exists and FS.CreateDirectory and not FS.Exists(BASE_DIR) then
        FS.CreateDirectory(BASE_DIR)
    end
end

local function readJson(path, fallback)
    local handle = io.open(path, "r")
    if not handle then return fallback end
    local text = handle:read("*a")
    handle:close()
    if not text or text == "" then return fallback end
    local ok, decoded = pcall(function() return Util.JsonDecode(text) end)
    if ok and decoded ~= nil then return decoded end
    return fallback
end

local function writeJson(path, payload)
    local handle = io.open(path, "w")
    if not handle then return false end
    handle:write(Util.JsonEncode(payload))
    handle:close()
    return true
end

local function appendResult(commandId, ok, message)
    local handle = io.open(RESULTS_FILE, "a")
    if handle then
        handle:write(Util.JsonEncode({
            at = now(),
            commandId = commandId or "",
            ok = ok and true or false,
            message = tostring(message or "")
        }) .. "\n")
        handle:close()
    end
end

local function getIdentifiers(playerId)
    local ok, identifiers = pcall(function() return MP.GetPlayerIdentifiers(playerId) end)
    if ok and type(identifiers) == "table" then return identifiers end
    return {}
end

local function getRole(playerId)
    local ok, role = pcall(function() return MP.GetPlayerRole(playerId) end)
    if ok then return tostring(role or "") end
    return ""
end

local function getGuestFlag(playerId)
    local ok, guest = pcall(function() return MP.IsPlayerGuest(playerId) end)
    if ok then return guest and true or false end
    return nil
end

local function accountIdFromIdentifiers(identifiers)
    if type(identifiers) ~= "table" then return "" end
    return lower(identifiers.beammp or identifiers.beammp_id or identifiers.beammpId or identifiers.id or "")
end

local function getPlayers()
    local ok, players = pcall(function() return MP.GetPlayers() end)
    if ok and type(players) == "table" then return players end
    return {}
end

local function getVehicles(playerId)
    local ok, vehicles = pcall(function() return MP.GetPlayerVehicles(playerId) end)
    if not ok or type(vehicles) ~= "table" then return {} end

    local rows = {}
    for vehicleId, vehicle in pairs(vehicles) do
        local model = ""
        local color = ""
        if type(vehicle) == "table" then
            model = tostring(vehicle.model or vehicle.jbeam or vehicle.name or vehicle.vehicle or vehicleId)
            color = tostring(vehicle.color or vehicle.colour or vehicle.colorName or "")
        else
            model = tostring(vehicle)
        end
        table.insert(rows, {
            id = tostring(vehicleId),
            vehicleId = tostring(vehicleId),
            model = model,
            color = color,
            colour = color,
        })
    end
    return rows
end

local function findPlayer(command)
    local wantedId = tonumber(command.playerId)
    local wantedName = lower(command.playerName)
    for playerId, playerName in pairs(getPlayers()) do
        if (wantedId and tonumber(playerId) == wantedId) or (wantedName ~= "" and lower(playerName) == wantedName) then
            return tonumber(playerId), playerName
        end
    end
    return nil, nil
end

local function saveBans()
    writeJson(BANS_FILE, bans)
end

local function loadBans()
    local decoded = readJson(BANS_FILE, bans)
    if type(decoded) == "table" then
        bans.accounts = type(decoded.accounts) == "table" and decoded.accounts or {}
        for accountId, reason in pairs(decoded.beammp or {}) do bans.accounts[lower(accountId)] = reason end
    end
end

local function writeStatus()
    local players = {}
    for playerId, playerName in pairs(getPlayers()) do
        local identifiers = getIdentifiers(playerId)
        local profile = authProfiles[lower(playerName)] or {}
        local fullIdentifiers = identifiers
        if type(profile.identifiers) == "table" then
            for key, value in pairs(profile.identifiers) do
                if fullIdentifiers[key] == nil then
                    fullIdentifiers[key] = value
                end
            end
        end
        table.insert(players, {
            id = tostring(playerId),
            serverPlayerId = tostring(playerId),
            name = tostring(playerName or ""),
            ip = tostring(fullIdentifiers.ip or ""),
            beammp = tostring(fullIdentifiers.beammp or fullIdentifiers.beammp_id or fullIdentifiers.beammpId or fullIdentifiers.id or ""),
            role = profile.role or getRole(playerId),
            isGuest = profile.isGuest,
            identifiers = fullIdentifiers,
            vehicles = getVehicles(playerId),
        })
    end
    writeJson(STATUS_FILE, {
        seenAt = now(),
        playerCount = #players,
        players = players,
        bans = bans,
    })
end

local function clampNumber(value, fallback, minimum, maximum)
    local number = tonumber(value) or fallback
    if number < minimum then number = minimum end
    if number > maximum then number = maximum end
    return number
end

local function sendTrollAction(playerId, playerName, actionName, strength, duration)
    if not MP.TriggerClientEvent then
        return false, "troll actions unsupported by this BeamMP build; requires TriggerClientEvent and a client-side handler"
    end
    local payload = tostring(actionName) .. "|" .. tostring(strength or 0) .. "|" .. tostring(duration or 0)
    local ok, sent, err = pcall(function()
        return MP.TriggerClientEvent(playerId, "beamadmin_troll", payload)
    end)
    if not ok then return false, "troll action failed: " .. tostring(sent) end
    if sent == false then return false, "troll action delivery failed: " .. tostring(err or "") end
    if MP.SendChatMessage then
        MP.SendChatMessage(playerId, "[BeamAdmin] troll action received: " .. tostring(actionName))
    end
    return true, "troll action " .. tostring(actionName) .. " delivered to " .. tostring(playerName)
end

local function executeCommand(command)
    local action = tostring(command.action or "")
    local reason = trim(command.reason)
    if reason == "" then reason = "Admin action from BeamAdmin" end

    if action == "unban" then
        local accountId = lower(command.accountId or command.playerId or command.playerName)
        if accountId ~= "" then bans.accounts[accountId] = nil end
        saveBans()
        return true, "unbanned BeamMP ID " .. tostring(accountId)
    end

    if action == "changemap" then
        if MP.ChangeMap then
            local ok, err = pcall(function() MP.ChangeMap(tostring(command.mapPath or command.map or "")) end)
            if ok then return true, "changed map to " .. tostring(command.map or command.mapPath) end
            return false, "change map failed: " .. tostring(err)
        end
        return false, "live map change unsupported; update ServerConfig.toml and restart server"
    end

    if action == "console" then
        local consoleCommand = tostring(command.command or "")
        if MP.TriggerGlobalEvent then
            local ok, err = pcall(function() MP.TriggerGlobalEvent("onConsoleInput", consoleCommand) end)
            if ok then return true, "console command sent: " .. consoleCommand end
            return false, "console command failed: " .. tostring(err)
        end
        return true, "console command queued: " .. consoleCommand
    end

    local playerId, playerName = findPlayer(command)
    if not playerId then
        return false, "player not found"
    end

    if action == "kick" then
        MP.DropPlayer(playerId, reason)
        return true, "kicked " .. tostring(playerName)
    end

    if action == "ban" then
        local identifiers = getIdentifiers(playerId)
        local accountId = accountIdFromIdentifiers(identifiers)
        if accountId == "" then accountId = lower(command.accountId) end
        if accountId == "" then
            return false, "cannot ban " .. tostring(playerName) .. ": no BeamMP account ID reported; player must be signed in, not guest"
        end
        bans.accounts[accountId] = reason
        saveBans()
        MP.DropPlayer(playerId, reason)
        return true, "banned " .. tostring(playerName) .. " by BeamMP ID " .. tostring(accountId)
    end

    if action == "fling" then
        return sendTrollAction(playerId, playerName, "fling", clampNumber(command.strength, 70, 10, 220), 0)
    end

    if action == "launch" then
        return sendTrollAction(playerId, playerName, "launch", clampNumber(command.strength, 130, 10, 220), 0)
    end

    if action == "nudge" then
        return sendTrollAction(playerId, playerName, "nudge", clampNumber(command.strength, 35, 10, 120), 0)
    end

    if action == "spin" then
        return sendTrollAction(playerId, playerName, "spin", clampNumber(command.strength, 80, 10, 220), clampNumber(command.duration, 5, 1, 60))
    end

    if action == "flip" then
        return sendTrollAction(playerId, playerName, "flip", 0, 0)
    end

    if action == "freeze" then
        return sendTrollAction(playerId, playerName, "freeze", 0, 0)
    end

    if action == "unfreeze" then
        return sendTrollAction(playerId, playerName, "unfreeze", 0, 0)
    end

    if action == "killengine" then
        return sendTrollAction(playerId, playerName, "killengine", 0, 0)
    end

    if action == "poptires" then
        return sendTrollAction(playerId, playerName, "poptires", 0, 0)
    end

    if action == "repair" then
        return sendTrollAction(playerId, playerName, "repair", 0, 0)
    end

    if action == "reset" then
        return sendTrollAction(playerId, playerName, "reset", 0, 0)
    end

    if action == "blackout" then
        return sendTrollAction(playerId, playerName, "blackout", 0, 0)
    end

    if action == "honk" then
        return sendTrollAction(playerId, playerName, "honk", 0, clampNumber(command.duration, 6, 1, 60))
    end

    if action == "smoke" then
        return sendTrollAction(playerId, playerName, "smoke", 0, clampNumber(command.duration, 8, 1, 60))
    end

    if action == "deletevehicle" then
        local vehicleId = tonumber(command.vehicleId)
        if not vehicleId then return false, "vehicle id missing" end
        if MP.RemoveVehicle then
            local ok, err = pcall(function() MP.RemoveVehicle(playerId, vehicleId) end)
            if ok then return true, "deleted vehicle " .. tostring(vehicleId) .. " for " .. tostring(playerName) end
            return false, "delete vehicle failed: " .. tostring(err)
        end
        if MP.DeleteVehicle then
            local ok, err = pcall(function() MP.DeleteVehicle(playerId, vehicleId) end)
            if ok then return true, "deleted vehicle " .. tostring(vehicleId) .. " for " .. tostring(playerName) end
            return false, "delete vehicle failed: " .. tostring(err)
        end
        return false, "delete vehicle unsupported by this BeamMP build"
    end

    if action == "changemap" then
        if MP.ChangeMap then
            local ok, err = pcall(function() MP.ChangeMap(tostring(command.mapPath or command.map or "")) end)
            if ok then return true, "changed map to " .. tostring(command.map or command.mapPath) end
            return false, "change map failed: " .. tostring(err)
        end
        return false, "live map change unsupported; update ServerConfig.toml and restart server"
    end

    if action == "console" then
        local consoleCommand = tostring(command.command or "")
        if MP.TriggerGlobalEvent then
            local ok, err = pcall(function() MP.TriggerGlobalEvent("onConsoleInput", consoleCommand) end)
            if ok then return true, "console command sent: " .. consoleCommand end
            return false, "console command failed: " .. tostring(err)
        end
        return true, "console command queued: " .. consoleCommand
    end

    return false, "unknown action"
end

local function processQueue()
    local queue = readJson(QUEUE_FILE, {})
    if type(queue) ~= "table" or #queue == 0 then return end
    writeJson(QUEUE_FILE, {})
    for _, command in ipairs(queue) do
        local ok, success, message = pcall(function()
            local commandOk, commandMessage = executeCommand(command)
            return commandOk, commandMessage
        end)
        if ok then
            appendResult(command.id, success, message)
            log(tostring(message))
        else
            appendResult(command.id, false, success)
            log("command failed: " .. tostring(success))
        end
    end
end

function onInit()
    ensureDir()
    loadBans()
    writeStatus()
    MP.RegisterEvent(TICK_EVENT, "onBeamAdminBridgeTick")
    MP.RegisterEvent("onPlayerAuth", "onPlayerAuth")
    pcall(function() MP.CancelEventTimer(TICK_EVENT) end)
    MP.CreateEventTimer(TICK_EVENT, 2000)
    log("loaded")
end

function onShutdown()
    pcall(function() MP.CancelEventTimer(TICK_EVENT) end)
    writeStatus()
end

function onBeamAdminBridgeTick()
    processQueue()
    writeStatus()
end

function onPlayerAuth(playerName, playerRole, isGuest, identifiers)
    loadBans()
    authProfiles[lower(playerName)] = {
        role = tostring(playerRole or ""),
        isGuest = isGuest and true or false,
        identifiers = type(identifiers) == "table" and identifiers or {},
    }
    local accountId = accountIdFromIdentifiers(identifiers)
    if accountId ~= "" and bans.accounts[accountId] then
        return "You are banned from this server: " .. tostring(bans.accounts[accountId])
    end
end
