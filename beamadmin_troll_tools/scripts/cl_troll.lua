-- cl_troll.lua  BeamAdmin client-side troll handler

local M = {}

local freezeActive = false
local freezeTimer = 0
local honkTimer = 0
local smokeTimer = 0
local blackoutTimer = 0

local function onBeamAdminTroll(payload)
  local action, strengthStr, durationStr = payload:match("([^|]+)|([^|]+)|([^|]+)")
  if not action then return end
  local strength = tonumber(strengthStr) or 70
  local duration = tonumber(durationStr) or 0

  local ok, err = pcall(function()
    if action == "fling" then
      local dir = obj:getDirectionVector()
      obj:applyForce(vec3(dir.x * strength * 800, dir.y * strength * 800, strength * 600))

    elseif action == "launch" then
      obj:applyForce(vec3(0, 0, strength * 1200))

    elseif action == "nudge" then
      obj:applyForce(vec3((math.random() - 0.5) * strength * 400, (math.random() - 0.5) * strength * 400, 0))

    elseif action == "spin" then
      obj:applyForce(vec3(strength * 300, 0, 0))

    elseif action == "flip" then
      obj:applyForce(vec3(0, 0, strength * 400))
      obj:applyForce(vec3(strength * 600, 0, 0))

    elseif action == "freeze" then
      freezeActive = true
      freezeTimer = duration > 0 and duration or 8

    elseif action == "unfreeze" then
      freezeActive = false
      freezeTimer = 0

    elseif action == "killengine" then
      local engine = powertrain.getDevice("mainEngine")
      if engine then engine:disable() end

    elseif action == "poptires" then
      if wheels and wheels.wheels then
        for i = 0, #wheels.wheels - 1 do
          local wheel = wheels.wheels[i]
          if wheel and wheel.nodes then
            for _, nodeIdx in ipairs(wheel.nodes) do
              beamstate.setBeamBroken(nodeIdx)
            end
          end
        end
      end

    elseif action == "repair" then
      if obj.resetBrokenFlexMesh then obj:resetBrokenFlexMesh() end
      if beamstate and beamstate.reset then beamstate.reset() end

    elseif action == "reset" then
      recovery.loadLastRoadPosition()

    elseif action == "blackout" then
      input.event("lights", 0, FILTER_DIRECT)
      blackoutTimer = duration > 0 and duration or 10

    elseif action == "honk" then
      input.event("horn", 1, FILTER_DIRECT)
      honkTimer = duration > 0 and duration or 6

    elseif action == "smoke" then
      input.event("throttle", 1, FILTER_DIRECT)
      input.event("brake", 1, FILTER_DIRECT)
      smokeTimer = duration > 0 and duration or 8
    end
  end)

  if not ok then
    log('E', 'beamadmin_troll', 'action failed: ' .. tostring(err))
  end
end

local function updateGFX(dt)
  if freezeActive then
    local mass = 1500
    if obj.getMass then mass = obj:getMass() end
    obj:applyForce(vec3(0, 0, 9.81 * mass))
    freezeTimer = freezeTimer - dt
    if freezeTimer <= 0 then
      freezeActive = false
    end
  end

  if honkTimer > 0 then
    honkTimer = honkTimer - dt
    if honkTimer <= 0 then
      input.event("horn", 0, FILTER_DIRECT)
    end
  end

  if smokeTimer > 0 then
    smokeTimer = smokeTimer - dt
    if smokeTimer <= 0 then
      input.event("throttle", 0, FILTER_DIRECT)
      input.event("brake", 0, FILTER_DIRECT)
    end
  end

  if blackoutTimer > 0 then
    blackoutTimer = blackoutTimer - dt
    if blackoutTimer <= 0 then
      input.event("lights", 1, FILTER_DIRECT)
    end
  end
end

M.updateGFX = updateGFX

MP.RegisterEvent("beamadmin_troll", "onBeamAdminTroll")

log('I', 'beamadmin_troll', 'cl_troll.lua loaded and event registered')

return M
