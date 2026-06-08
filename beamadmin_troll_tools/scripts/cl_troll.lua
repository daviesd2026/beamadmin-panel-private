-- cl_troll.lua  BeamMP client-side relay
-- Only has access to AddEventHandler, TriggerServerEvent, TriggerClientEvent
-- Forwards troll payloads into BeamNG GE Lua via TriggerClientEvent

local function onBeamAdminTroll(payload)
  -- Forward into BeamNG's own client event system so the GE extension can handle it
  TriggerClientEvent("beamadmin_troll_ge", payload)
end

AddEventHandler("beamadmin_troll", onBeamAdminTroll)
