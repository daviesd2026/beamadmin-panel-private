local trollState = {
    frozen = false,
    frozenPos = nil,
    frozenRot = nil,
    engineLocked = false,
    blackout = false,
    hornUntil = 0,
    smokeUntil = 0,
}

math.randomseed(os and os.time and os.time() or 1)

local function nowMs()
    if Engine and Engine.Platform and Engine.Platform.getRuntime then
        return Engine.Platform.getRuntime() * 1000
    end
    return os and os.clock and os.clock() * 1000 or 0
end

local function decodePayload(data)
    if type(data) == 'table' then return data end
    if type(data) == 'string' and data ~= '' then
        local action, strength, duration = data:match('^([^|]+)|([^|]*)|([^|]*)$')
        if action then
            return {
                action = action,
                strength = tonumber(strength) or 70,
                duration = tonumber(duration) or 0
            }
        end
    end
    if jsonDecode and type(data) == 'string' and data ~= '' then
        local ok, decoded = pcall(jsonDecode, data)
        if ok and type(decoded) == 'table' then return decoded end
    end
    return {}
end

local function flash(message, ttl)
    if guihooks and guihooks.trigger then
        guihooks.trigger('ScenarioFlashMessage', {{message, ttl or 1.5, 0, true}})
    end
end

local function playerVehicle()
    if not be or not be.getPlayerVehicle then return nil end
    return be:getPlayerVehicle(0)
end

local function clamp(value, low, high)
    value = tonumber(value) or low
    if value < low then return low end
    if value > high then return high end
    return value
end

local function randRange(minValue, maxValue)
    return minValue + math.random() * (maxValue - minValue)
end

local function getPosRot(vehicle)
    local pos = vehicle and vehicle.getPosition and vehicle:getPosition() or nil
    local rot = vehicle and vehicle.getRotation and quat(vehicle:getRotation()) or nil
    return pos, rot
end

local function setPosRot(vehicle, pos, rot)
    if not vehicle or not pos then return false end
    if rot and vehicle.setPosRot then
        vehicle:setPosRot(pos.x, pos.y, pos.z, rot.x, rot.y, rot.z, rot.w)
        return true
    end
    if vehicle.setPosition then
        vehicle:setPosition(vec3(pos.x, pos.y, pos.z))
        return true
    end
    return false
end

local function moveVehicle(vehicle, dx, dy, dz)
    local pos, rot = getPosRot(vehicle)
    if not pos then return false end
    pos = vec3(pos.x + dx, pos.y + dy, pos.z + dz)
    return setPosRot(vehicle, pos, rot)
end

local function applyVelocity(vehicle, x, y, z)
    if vehicle and vehicle.setVelocity then
        vehicle:setVelocity(vec3(x, y, z))
        return true
    end
    return moveVehicle(vehicle, x * 0.12, y * 0.12, z * 0.12)
end

local function applyAngularVelocity(vehicle, x, y, z)
    if vehicle and vehicle.setAngularVelocity then
        vehicle:setAngularVelocity(vec3(x, y, z))
        return true
    end
    return false
end

local function rotateRoll(vehicle, radians)
    local pos, rot = getPosRot(vehicle)
    if not pos or not rot then return false end
    local rollQuat = quatFromEuler and quatFromEuler(radians, 0, 0) or quat(math.sin(radians / 2), 0, 0, math.cos(radians / 2))
    local rolled = rollQuat * rot
    return setPosRot(vehicle, vec3(pos.x, pos.y, pos.z + 1.5), rolled)
end

local function vehicleLua(command)
    local vehicle = playerVehicle()
    if not vehicle or not vehicle.queueLuaCommand then return false end
    vehicle:queueLuaCommand(command)
    return true
end

local function zeroVehicle(vehicle)
    applyVelocity(vehicle, 0, 0, 0)
    applyAngularVelocity(vehicle, 0, 0, 0)
    vehicleLua([[
        if obj and obj.setVelocity then obj:setVelocity(vec3(0, 0, 0)) end
        if obj and obj.setAngularVelocity then obj:setAngularVelocity(vec3(0, 0, 0)) end
        if electrics then
            electrics.values.throttle = 0
            electrics.values.brake = 1
            electrics.values.parkingbrake = 1
        end
    ]])
end

local function clearDrivingLocks()
    vehicleLua([[
        if electrics then
            electrics.values.brake = 0
            electrics.values.parkingbrake = 0
            electrics.values.horn = 0
        end
    ]])
end

local function lockEngine()
    vehicleLua([[
        beamadminEngineLocked = true
        if electrics and electrics.setIgnitionLevel then electrics.setIgnitionLevel(0) end
        if electrics then
            electrics.values.ignition = 0
            electrics.values.running = 0
            electrics.values.starter = 0
            electrics.values.throttle = 0
        end
        if powertrain and powertrain.setIgnition then powertrain.setIgnition(false) end
    ]])
end

local function popTires()
    vehicleLua([[
        local popped = false
        if wheels and wheels.wheels then
            for _, wheel in pairs(wheels.wheels) do
                wheel.tirePressure = 0
                wheel.pressure = 0
                wheel.isTireDeflated = true
                popped = true
            end
        end
        if hydros and hydros.hydros then
            for _, hydro in pairs(hydros.hydros) do
                if hydro.name and tostring(hydro.name):lower():find("tire") then
                    hydro.beamPrecompression = 0
                    hydro.beamSpring = 0
                    popped = true
                end
            end
        end
        if not popped then
            log('W', 'beamadmin_troll_tools', 'poptires unsupported on this vehicle: no wheels.wheels/tire hydros exposed')
        end
    ]])
end

local function repairVehicle()
    vehicleLua([[
        if recovery and recovery.repairVehicle then recovery.repairVehicle() end
        if beamstate and beamstate.reset then beamstate.reset() end
        if electrics then
            electrics.values.brake = 0
            electrics.values.parkingbrake = 0
            electrics.values.horn = 0
        end
    ]])
end

local function resetVehicle(vehicle)
    zeroVehicle(vehicle)
    local pos = vehicle and vehicle.getPosition and vehicle:getPosition() or nil
    if pos and vehicle.setPosRot then
        vehicle:setPosRot(pos.x, pos.y, pos.z + 0.5, 0, 0, 0, 1)
    elseif recovery and recovery.loadHome then
        recovery.loadHome()
    end
end

local function lightsOff()
    vehicleLua([[
        beamadminBlackout = true
        if electrics then
            electrics.values.lowbeam = 0
            electrics.values.highbeam = 0
            electrics.values.signal_L = 0
            electrics.values.signal_R = 0
            electrics.values.lightbar = 0
            electrics.values.fog = 0
            electrics.values.reverse = 0
            electrics.values.brake_lights = 0
        end
    ]])
end

local function triggerSmoke(duration)
    trollState.smokeUntil = nowMs() + duration * 1000
    vehicleLua([[
        if electrics then
            electrics.values.throttle = 1
            electrics.values.brake = 1
            electrics.values.parkingbrake = 1
        end
        if powertrain and powertrain.setIgnition then powertrain.setIgnition(true) end
    ]])
end

local function runTroll(data)
    local payload = decodePayload(data)
    local action = tostring(payload.action or 'fling'):lower()
    local strength = clamp(payload.strength, 10, 220)
    local duration = clamp(payload.duration or 5, 1, 30)
    local vehicle = playerVehicle()
    if not vehicle then
        flash('BeamAdmin: no vehicle')
        return
    end

    flash('BeamAdmin: ' .. action, 1.2)

    if action == 'fling' then
        local x = randRange(-strength * 0.75, strength * 0.75)
        local y = randRange(-strength * 0.75, strength * 0.75)
        local z = strength * randRange(1.15, 1.45)
        applyVelocity(vehicle, x, y, z)
        applyAngularVelocity(vehicle, randRange(-4, 4), randRange(-4, 4), randRange(-6, 6))
        return
    end

    if action == 'launch' then
        applyVelocity(vehicle, 0, 0, strength * 1.8)
        applyAngularVelocity(vehicle, 0, 0, 0)
        return
    end

    if action == 'nudge' then
        applyVelocity(vehicle, randRange(-strength * 0.45, strength * 0.45), randRange(-strength * 0.45, strength * 0.45), 1.5)
        return
    end

    if action == 'spin' then
        applyAngularVelocity(vehicle, 0, 0, clamp(strength / 8, 6, 22))
        return
    end

    if action == 'flip' then
        zeroVehicle(vehicle)
        rotateRoll(vehicle, math.pi)
        return
    end

    if action == 'freeze' then
        trollState.frozen = true
        trollState.frozenPos, trollState.frozenRot = getPosRot(vehicle)
        zeroVehicle(vehicle)
        return
    end

    if action == 'unfreeze' then
        trollState.frozen = false
        trollState.frozenPos = nil
        trollState.frozenRot = nil
        clearDrivingLocks()
        return
    end

    if action == 'enginekill' then
        trollState.engineLocked = true
        lockEngine()
        return
    end

    if action == 'poptires' then
        popTires()
        return
    end

    if action == 'repair' then
        trollState.engineLocked = false
        trollState.blackout = false
        trollState.smokeUntil = 0
        trollState.hornUntil = 0
        repairVehicle()
        return
    end

    if action == 'resetvehicle' then
        trollState.frozen = false
        trollState.frozenPos = nil
        trollState.frozenRot = nil
        resetVehicle(vehicle)
        return
    end

    if action == 'blackout' then
        trollState.blackout = not trollState.blackout
        if trollState.blackout then
            lightsOff()
        else
            vehicleLua("beamadminBlackout = false")
        end
        return
    end

    if action == 'honk' then
        trollState.hornUntil = nowMs() + duration * 1000
        vehicleLua("if electrics then electrics.values.horn = 1 end")
        return
    end

    if action == 'smoke' then
        triggerSmoke(duration)
        return
    end

    flash('BeamAdmin: unsupported ' .. action)
end

local function applyPersistentState()
    local vehicle = playerVehicle()
    if not vehicle then return end

    if trollState.frozen and trollState.frozenPos then
        zeroVehicle(vehicle)
        setPosRot(vehicle, trollState.frozenPos, trollState.frozenRot)
    end

    if trollState.engineLocked then
        lockEngine()
    end

    if trollState.blackout then
        lightsOff()
    end

    local t = nowMs()
    if trollState.hornUntil > t then
        vehicleLua("if electrics then electrics.values.horn = 1 end")
    elseif trollState.hornUntil ~= 0 then
        trollState.hornUntil = 0
        vehicleLua("if electrics then electrics.values.horn = 0 end")
    end

    if trollState.smokeUntil > t then
        vehicleLua("if electrics then electrics.values.throttle = 1 electrics.values.brake = 1 electrics.values.parkingbrake = 1 end")
    elseif trollState.smokeUntil ~= 0 then
        trollState.smokeUntil = 0
        vehicleLua("if electrics then electrics.values.throttle = 0 electrics.values.brake = 0 electrics.values.parkingbrake = 0 end")
    end
end

local updateAccumulator = 0
function onUpdate(dtReal)
    updateAccumulator = updateAccumulator + ((dtReal or 0.05) * 1000)
    if updateAccumulator < 150 then return end
    updateAccumulator = 0
    applyPersistentState()
end

if AddEventHandler then
    AddEventHandler('beamadmin_fling', runTroll, 'beamadmin_troll_tools_fling_plain')
    AddEventHandler('beamadmin_troll', runTroll, 'beamadmin_troll_tools_troll_plain')
    AddEventHandler('beamadmin:fling', runTroll, 'beamadmin_troll_tools_fling')
    AddEventHandler('beamadmin:troll', runTroll, 'beamadmin_troll_tools_troll')
end

flash('BeamAdmin troll tools loaded', 1.0)
