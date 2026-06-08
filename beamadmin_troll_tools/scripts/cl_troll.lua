-- cl_troll.lua  BeamAdmin client-side troll handler

local M = {}

local function onBeamAdminTroll(payload)
  local action, strengthStr, durationStr = payload:match("([^|]+)|([^|]+)|([^|]+)")
  if not action then return end
  local strength = tonumber(strengthStr) or 70
  local duration = tonumber(durationStr) or 0

  local vehicle = be:getObjectByID(be:getPlayerVehicleID(0))
  if not vehicle then return end

  local ok, err = pcall(function()
    if action == "fling" then
      local dir = vehicle:getDirectionVector()
      vehicle:setVelocity(vec3(dir.x * strength, dir.y * strength, strength * 0.6))

    elseif action == "launch" then
      vehicle:setVelocity(vec3(0, 0, strength * 1.5))

    elseif action == "nudge" then
      vehicle:setVelocity(vec3((math.random() - 0.5) * strength, (math.random() - 0.5) * strength, 2))

    elseif action == "spin" then
      vehicle:setAngularVelocity(vec3(0, 0, strength * 0.3))

    elseif action == "flip" then
      local pos = vehicle:getPosition()
      local rot = vehicle:getRotation()
      local flipped = quat(rot.x, rot.y, rot.z, rot.w) * quat(math.sin(math.pi/2), 0, 0, math.cos(math.pi/2))
      vehicle:setTransform(pos, flipped)

    elseif action == "freeze" then
      vehicle:setVelocity(vec3(0, 0, 0))
      vehicle:setAngularVelocity(vec3(0, 0, 0))
      if duration > 0 then
        Engine.Schedule(duration * 1000, function()
          -- unfreeze is a no-op; physics resumes on its own
        end)
      end

    elseif action == "unfreeze" then
      -- no-op: physics resumes automatically

    elseif action == "killengine" then
      electrics.values.ignitionLevel = 0
      electrics.values.engineRunning = 0
      input.event("ignition", 0, FILTER_DIRECT)

    elseif action == "poptires" then
      for i = 0, wheels.wheelCount - 1 do
        wheels.setTirePressure(i, 0)
      end

    elseif action == "repair" then
      vehicle:requestReset(RESET_PHYSICS)

    elseif action == "reset" then
      vehicle:requestReset(RESET_POSITION)

    elseif action == "blackout" then
      electrics.values.lights = 0
      electrics.values.headlights = 0
      electrics.values.fog = 0
      input.event("lights", 0, FILTER_DIRECT)

    elseif action == "honk" then
      input.event("horn", 1, FILTER_DIRECT)
      if duration > 0 then
        Engine.Schedule(duration * 1000, function()
          input.event("horn", 0, FILTER_DIRECT)
        end)
      end

    elseif action == "smoke" then
      input.event("throttle", 1, FILTER_DIRECT)
      input.event("brake", 1, FILTER_DIRECT)
      if duration > 0 then
        Engine.Schedule(duration * 1000, function()
          input.event("throttle", 0, FILTER_DIRECT)
          input.event("brake", 0, FILTER_DIRECT)
        end)
      end
    end
  end)

  if not ok then
    log('E', 'beamadmin_troll', 'action failed: ' .. tostring(err))
  end
end

MP.RegisterEvent("beamadmin_troll", "onBeamAdminTroll")

return M
