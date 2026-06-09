local M = {}

local frozen = false
local freezeTimer = 0
local freezePos = nil
local freezeRot = nil
local honkTimer = 0
local smokeTimer = 0
local blackoutTimer = 0

local function clamp(value, defaultValue, minValue, maxValue)
  value = tonumber(value) or defaultValue
  if value < minValue then return minValue end
  if value > maxValue then return maxValue end
  return value
end

local function getVehicle()
  if not be then return nil end
  if be.getPlayerVehicle then
    local ok, veh = pcall(function() return be:getPlayerVehicle(0) end)
    if ok and veh then return veh end
  end
  if be.getPlayerVehicleID and be.getObjectByID then
    local ok, veh = pcall(function()
      local vehId = be:getPlayerVehicleID(0)
      if not vehId or vehId < 0 then return nil end
      return be:getObjectByID(vehId)
    end)
    if ok and veh then return veh end
  end
  return nil
end

local function flash(text)
  if guihooks and guihooks.trigger then
    guihooks.trigger('Message', {
      ttl = 2,
      category = 'beamadmin',
      msg = tostring(text)
    })
  end
end

local function queue(veh, code)
  if veh and veh.queueLuaCommand then
    veh:queueLuaCommand(code)
    return true
  end
  return false
end

local function runTroll(payload)
  local action, strengthStr, durationStr = tostring(payload or ''):match('([^|]+)|([^|]+)|([^|]+)')
  if not action then return end

  local strength = clamp(strengthStr, 70, 0, 250)
  local duration = clamp(durationStr, 0, 0, 60)
  local veh = getVehicle()
  if not veh then
    log('W', 'beamadmin_troll_tools', 'no player vehicle for ' .. tostring(action))
    return
  end

  local ok, err = pcall(function()
    flash('BeamAdmin: ' .. tostring(action))

    if action == 'fling' then
      queue(veh, string.format([[
local dir = obj:getDirectionVector()
local s = %f
if obj.setVelocity then obj:setVelocity(vec3(dir.x * s, dir.y * s, s * 0.85)) end
if obj.applyForce then obj:applyForce(vec3(dir.x * s * 1400, dir.y * s * 1400, s * 1800)) end
]], strength))

    elseif action == 'launch' then
      queue(veh, string.format([[
local s = %f
if obj.setVelocity then obj:setVelocity(vec3(0, 0, s * 1.6)) end
if obj.applyForce then obj:applyForce(vec3(0, 0, s * 2600)) end
]], strength))

    elseif action == 'nudge' then
      queue(veh, string.format([[
local s = %f
local x = (math.random() - 0.5) * s
local y = (math.random() - 0.5) * s
if obj.setVelocity then obj:setVelocity(vec3(x, y, 2)) end
if obj.applyForce then obj:applyForce(vec3(x * 700, y * 700, 250)) end
]], strength))

    elseif action == 'spin' then
      queue(veh, string.format([[
local s = %f
if obj.setAngularVelocity then obj:setAngularVelocity(vec3(0, 0, s * 0.45)) end
if obj.applyForce then obj:applyForce(vec3(s * 1200, -s * 600, 0)) end
]], strength))

    elseif action == 'flip' then
      queue(veh, [[
if obj.setAngularVelocity then obj:setAngularVelocity(vec3(14, 0, 0)) end
if obj.applyForce then
  obj:applyForce(vec3(0, 0, 140000))
  obj:applyForce(vec3(190000, 0, 0))
end
]])

    elseif action == 'freeze' then
      frozen = true
      freezeTimer = duration > 0 and duration or 8
      if veh.getPosition then freezePos = veh:getPosition() end
      if veh.getRotation then freezeRot = veh:getRotation() end
      queue(veh, [[
if obj.setVelocity then obj:setVelocity(vec3(0, 0, 0)) end
if obj.setAngularVelocity then obj:setAngularVelocity(vec3(0, 0, 0)) end
]])

    elseif action == 'unfreeze' then
      frozen = false
      freezeTimer = 0
      freezePos = nil
      freezeRot = nil

    elseif action == 'killengine' then
      queue(veh, [[
if powertrain and powertrain.getDevice then
  local engine = powertrain.getDevice('mainEngine')
  if engine and engine.disable then engine:disable() end
end
if electrics and electrics.values then
  electrics.values.ignitionLevel = 0
  electrics.values.engineRunning = 0
end
if input and input.event then input.event('ignition', 0, FILTER_DIRECT) end
]])

    elseif action == 'poptires' then
      queue(veh, [[
if wheels then
  if wheels.setTirePressure and wheels.wheelCount then
    for i = 0, wheels.wheelCount - 1 do wheels.setTirePressure(i, 0) end
  elseif wheels.wheels then
    for _, wheel in pairs(wheels.wheels) do wheel.flatTire = true end
  end
end
]])

    elseif action == 'repair' then
      queue(veh, [[
if recovery and recovery.repairVehicle then recovery.repairVehicle()
elseif recovery and recovery.reset then recovery.reset()
elseif beamstate and beamstate.reset then beamstate.reset()
end
]])

    elseif action == 'reset' then
      queue(veh, [[
if recovery and recovery.loadLastRoadPosition then recovery.loadLastRoadPosition()
elseif recovery and recovery.loadHome then recovery.loadHome()
elseif recovery and recovery.reset then recovery.reset()
end
]])

    elseif action == 'blackout' then
      blackoutTimer = duration > 0 and duration or 10
      queue(veh, [[
if electrics and electrics.values then
  electrics.values.lights = 0
  electrics.values.headlights = 0
  electrics.values.fog = 0
end
if input and input.event then input.event('lights', 0, FILTER_DIRECT) end
]])

    elseif action == 'honk' then
      honkTimer = duration > 0 and duration or 6
      queue(veh, "if input and input.event then input.event('horn', 1, FILTER_DIRECT) end")

    elseif action == 'smoke' then
      smokeTimer = duration > 0 and duration or 8
      queue(veh, "if input and input.event then input.event('throttle', 1, FILTER_DIRECT) input.event('brake', 1, FILTER_DIRECT) end")
    end
  end)

  if not ok then
    log('E', 'beamadmin_troll_tools', 'action failed: ' .. tostring(err))
  end
end

local function onUpdate(dt)
  if frozen then
    local veh = getVehicle()
    if veh then
      queue(veh, "if obj.setVelocity then obj:setVelocity(vec3(0, 0, 0)) end if obj.setAngularVelocity then obj:setAngularVelocity(vec3(0, 0, 0)) end")
      if freezePos and freezeRot and veh.setPositionRotation then
        veh:setPositionRotation(freezePos.x, freezePos.y, freezePos.z, freezeRot.x, freezeRot.y, freezeRot.z, freezeRot.w)
      elseif freezePos and veh.setPosition then
        veh:setPosition(freezePos)
      end
    end
    freezeTimer = freezeTimer - dt
    if freezeTimer <= 0 then
      frozen = false
      freezePos = nil
      freezeRot = nil
    end
  end

  if honkTimer > 0 then
    honkTimer = honkTimer - dt
    if honkTimer <= 0 then
      local veh = getVehicle()
      queue(veh, "if input and input.event then input.event('horn', 0, FILTER_DIRECT) end")
    end
  end

  if smokeTimer > 0 then
    smokeTimer = smokeTimer - dt
    if smokeTimer <= 0 then
      local veh = getVehicle()
      queue(veh, "if input and input.event then input.event('throttle', 0, FILTER_DIRECT) input.event('brake', 0, FILTER_DIRECT) end")
    end
  end

  if blackoutTimer > 0 then
    blackoutTimer = blackoutTimer - dt
    if blackoutTimer <= 0 then
      local veh = getVehicle()
      queue(veh, "if input and input.event then input.event('lights', 1, FILTER_DIRECT) end")
    end
  end
end

if AddEventHandler then
  AddEventHandler('beamadmin_troll', runTroll, 'beamadmin_troll_tools_troll')
  AddEventHandler('beamadmin_troll_ge', runTroll, 'beamadmin_troll_tools_troll_ge')
end

M.runTroll = runTroll
M.onUpdate = onUpdate

return M
