-- cl_troll.lua  BeamMP client relay
local function onBeamAdminTroll(payload)
  TriggerClientEvent("beamadmin_troll_ge", payload)
end

AddEventHandler("beamadmin_troll", onBeamAdminTroll)
