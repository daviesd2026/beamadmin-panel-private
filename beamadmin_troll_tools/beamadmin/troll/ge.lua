-- beamadmin_troll_ge.lua  BeamNG GE Lua extension for BeamAdmin troll actions
-- Loaded as a GE extension, has full access to BeamNG game engine APIs

local M = {}

local freezeActive = false
local freezeTimer = 0
local honkTimer = 0
local smokeTimer = 0
local blackoutTimer = 0

local function getVehicle()
  local vehId = be:getPlayerVehicleID(0)
  if vehId < 0 then return nil end
  return be:getObjectByID(vehId)
end

local function onBeamAdminTrollGE(payload)
  local action, strengthStr, durationStr = payload:match("([^|]+)|([^|]+)|([^|]+)")
  if not action then return end
  local strength = tonumber(strengthStr) or 70
  local duration = tonumber(durationStr) or 0
  local veh = getVehicle()
  if not veh then return end

  local ok, err = pcall(function()
    if action == "fling" then
      local dir = veh:getDirectionVector()
      veh:applyForce(vec3(dir.x * strength * 800, dir.y * strength * 800, strength * 600))

    elseif action == "launch" then
      veh:applyForce(vec3(0, 0, strength * 1200))

    elseif action == "nudge" then
      veh:applyForce(vec3((math.random()-0.5)*strength*400, (math.random()-0.5)*strength*400, 50))

    elseif action == "spin" then
      veh:applyForce(vec3(strength * 300, 0, 0))

    elseif action == "flip" then
      veh:applyForce(vec3(0, 0, strength * 400))
      veh:applyForce(vec3(strength * 600, 0, 0))

    elseif action == "freeze" then
      freezeActive = true
      freezeTimer = duration > 0 and duration or 8

    elseif action == "unfreeze" then
      freezeActive = false
      freezeTimer = 0

    elseif action == "killengine" then
      veh:queueLuaCommand("powertrain.getDevice('mainEngine'):disable()")

    elseif action == "poptires" then
      veh:queueLuaCommand("for i=0,wheels.wheelCount-1 do wheels.wheels[i].flatTire=true end")

    elseif action == "repair" then
      veh:queueLuaCommand("recovery.reset()")

    elseif action == "reset" then
      veh:queueLuaCommand("recovery.loadLastRoadPosition()")

    elseif action == "blackout" then
      veh:queueLuaCommand("input.event('lights',0,FILTER_DIRECT)")
      blackoutTimer = duration > 0 and duration or 10

    elseif action == "honk" then
      veh:queueLuaCommand("input.event('horn',1,FILTER_DIRECT)")
      honkTimer = duration > 0 and duration or 6

    elseif action == "smoke" then
      veh:queueLuaCommand("input.event('throttle',1,FILTER_DIRECT) input.event('brake',1,FILTER_DIRECT)")
      smokeTimer = duration > 0 and duration or 8
    end
  end)

  if not ok then
    log('E', 'beamadminTrollGe', 'action failed: ' .. tostring(err))
  end
end

local function onUpdate(dt)
  if freezeActive then
    local veh = getVehicle()
    if veh then
      veh:applyForce(vec3(0, 0, 9.81 * 1500))
    end
    freezeTimer = freezeTimer - dt
    if freezeTimer <= 0 then freezeActive = false end
  end
  if honkTimer > 0 then
    honkTimer = honkTimer - dt
    if honkTimer <= 0 then
      local veh = getVehicle()
      if veh then veh:queueLuaCommand("input.event('horn',0,FILTER_DIRECT)") end
    end
  end
  if smokeTimer > 0 then
    smokeTimer = smokeTimer - dt
    if smokeTimer <= 0 then
      local veh = getVehicle()
      if veh then veh:queueLuaCommand("input.event('throttle',0,FILTER_DIRECT) input.event('brake',0,FILTER_DIRECT)") end
    end
  end
  if blackoutTimer > 0 then
    blackoutTimer = blackoutTimer - dt
    if blackoutTimer <= 0 then
      local veh = getVehicle()
      if veh then veh:queueLuaCommand("input.event('lights',1,FILTER_DIRECT)") end
    end
  end
end

M.onUpdate = onUpdate

return M
