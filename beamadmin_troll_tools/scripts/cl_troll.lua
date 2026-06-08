local TAG = 'beamadmin_troll'

local function loadExtension(name)
    if extensions and extensions.load then
        pcall(function() extensions.load(name) end)
    end
end

local function schedule(delaySeconds, callback)
    local delayMs = math.max(0, tonumber(delaySeconds) or 0) * 1000
    if Engine and Engine.Schedule then
        Engine.Schedule(callback, delayMs)
        return
    end
    if timer and timer.setTimeout then
        timer.setTimeout(delayMs, callback)
        return
    end
    callback()
end

local function localVehicle()
    if not be or not be.getPlayerVehicleID or not be.getObjectByID then return nil end
    local vehicleId = be:getPlayerVehicleID(0)
    if not vehicleId then return nil end
    return be:getObjectByID(vehicleId)
end

local function parsePayload(payload)
    local action, strength, duration = tostring(payload or ''):match("([^|]+)|([^|]+)|([^|]+)")
    return tostring(action or ''), tonumber(strength) or 0, tonumber(duration) or 0
end

local function releaseInput(name)
    loadExtension('input')
    if input and input.event then
        input.event(name, 0, FILTER_DIRECT)
    end
end

function onBeamAdminTroll(payload)
    local ok, err = pcall(function()
        local action, strength, duration = parsePayload(payload)
        local vehicle = localVehicle()
        if not vehicle then
            log('E', TAG, 'no local vehicle for action ' .. tostring(action))
            return
        end

        if action == 'fling' then
            vehicle:setVelocity(vehicle:getDirectionVector() * strength + vec3(0, 0, strength * 0.6))
            return
        end

        if action == 'launch' then
            vehicle:setVelocity(vec3(0, 0, strength * 1.5))
            return
        end

        if action == 'nudge' then
            vehicle:setVelocity(vec3((math.random() - 0.5) * strength, (math.random() - 0.5) * strength, 0))
            return
        end

        if action == 'spin' then
            vehicle:setAngularVelocity(vec3(0, 0, strength * 0.3))
            return
        end

        if action == 'flip' then
            local pos = vehicle:getPosition()
            local rot = vehicle:getRotation()
            local roll = quatFromEuler(math.pi, 0, 0)
            local newRot = roll * quat(rot)
            vehicle:setTransform(pos, newRot)
            return
        end

        if action == 'freeze' then
            vehicle:setVelocity(vec3(0, 0, 0))
            vehicle:setAngularVelocity(vec3(0, 0, 0))
            return
        end

        if action == 'unfreeze' then
            log('I', TAG, 'unfreeze received')
            return
        end

        if action == 'killengine' then
            loadExtension('electrics')
            if electrics and electrics.values then
                electrics.values.ignitionLevel = 0
                electrics.values.engineRunning = 0
            end
            return
        end

        if action == 'poptires' then
            loadExtension('wheels')
            if wheels and wheels.wheelRotators and wheels.setTirePressure then
                for wheelIndex, _ in pairs(wheels.wheelRotators) do
                    wheels.setTirePressure(wheelIndex, 0)
                end
            else
                log('E', TAG, 'wheels API unavailable for poptires')
            end
            return
        end

        if action == 'repair' then
            vehicle:requestReset(RESET_PHYSICS)
            return
        end

        if action == 'reset' then
            vehicle:requestReset(RESET_POSITION)
            return
        end

        if action == 'blackout' then
            loadExtension('electrics')
            if electrics and electrics.values then
                electrics.values.lights = 0
                electrics.values.headlights = 0
                electrics.values.fog = 0
            end
            return
        end

        if action == 'honk' then
            loadExtension('input')
            if input and input.event then
                input.event('horn', 1, FILTER_DIRECT)
                schedule(duration, function() releaseInput('horn') end)
            end
            return
        end

        if action == 'smoke' then
            loadExtension('input')
            if input and input.event then
                input.event('throttle', 1, FILTER_DIRECT)
                input.event('brake', 1, FILTER_DIRECT)
                schedule(duration, function()
                    releaseInput('throttle')
                    releaseInput('brake')
                end)
            end
            return
        end

        log('E', TAG, 'unknown troll action ' .. tostring(action))
    end)

    if not ok then
        log('E', TAG, tostring(err))
    end
end

if MP and MP.RegisterEvent then
    MP.RegisterEvent("beamadmin_troll", "onBeamAdminTroll")
end
