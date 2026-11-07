package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

local TPL = require("lib.ui_xml_template")
TPL.registerPack(require("lib.ui_xml_templates_csheet_page3"))
local TraitXml = require("lib.trait_sheet_xml")

local function assertBalancedXml(xml, label)
    local withoutSelfClosing = xml:gsub("<[^>]-/%s*>", "")
    local stack = {}
    for closing, name in withoutSelfClosing:gmatch("<%s*(/?)%s*([%a][%w:_-]*)[^>]*>") do
        if closing == "/" then
            local expected = stack[#stack]
            assert(name == expected, label .. ": closing </" .. name .. "> does not match <" .. tostring(expected) .. ">")
            stack[#stack] = nil
        else
            stack[#stack + 1] = name
        end
    end
    assert(#stack == 0, label .. ": unclosed tag <" .. tostring(stack[#stack]) .. ">")
end

local templateKeyBySection = {
    bg = "csheet/partials/bg_block",
    merit = "csheet/partials/merit_block",
    flaw = "csheet/partials/flaw_block",
}

for _, sectionKey in ipairs({ "bg", "merit", "flaw" }) do
    local base = {
        name = "Resources",
        base = 2,
        max = 2,
        description = { "A useful background." },
    }
    local noPortrait = TraitXml.buildTraitBoxXml(base, sectionKey, 0, sectionKey == "flaw", {
        pageNum = 3,
        templateKeyBySection = templateKeyBySection,
    })
    assert(not noPortrait:find('<Image image=""', 1, true), sectionKey .. ": no empty image")
    assert(noPortrait:find('text="A useful background%."') ~= nil, sectionKey .. ": body text remains")
    assert(noPortrait:find('childAlignment="UpperLeft" spacing="8"', 1, true) == nil, sectionKey .. ": no portrait row")
    assertBalancedXml(noPortrait, sectionKey .. " without portrait")

    local withPortrait = {
        name = base.name,
        base = base.base,
        max = base.max,
        description = base.description,
        portrait = "npcPortrait_test",
    }
    local portraitXml = TraitXml.buildTraitBoxXml(withPortrait, sectionKey, 0, sectionKey == "flaw", {
        pageNum = 3,
        templateKeyBySection = templateKeyBySection,
    })
    assert(portraitXml:find('image="npcPortrait_test"', 1, true) ~= nil, sectionKey .. ": portrait remains")
    assertBalancedXml(portraitXml, sectionKey .. " with portrait")
end

print("csheet_page3_portraits_runtime.test.lua: PASS")
