from pathlib import Path

p = Path("core/npcs.ttslua")
s = p.read_text(encoding="utf-8")
old = """    for _, name in ipairs(names) do
        if validateNpcNameKey(name) then
            local cap = name
            Wait.time(function()
                local ok, err = NPCS.ensureNpcInPreloadZone(cap, { deferUiRefresh = true, skipSeatSync = true })
                if not ok then
                    print("[NPCS] ensureAllNpcsPreloaded failed for " .. tostring(cap) .. ": " .. tostring(err))
                end
            end, delay)
            delay = delay + 0.06
        end
    end"""
new = """    for _, name in ipairs(names) do
        if validateNpcNameKey(name) and getInstances()[name] == nil then
            local cap = name
            Wait.time(function()
                local ok, err = NPCS.ensureNpcInPreloadZone(cap, { deferUiRefresh = true, skipSeatSync = true })
                if not ok then
                    print("[NPCS] ensureAllNpcsPreloaded failed for " .. tostring(cap) .. ": " .. tostring(err))
                end
            end, delay)
            delay = delay + 0.06
        end
    end"""
if old not in s:
    raise SystemExit("pattern missing")
p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("ok")
