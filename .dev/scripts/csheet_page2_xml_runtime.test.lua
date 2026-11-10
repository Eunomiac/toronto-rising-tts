package.path = package.path .. ";./?.ttslua;./?/init.ttslua"

local Page2 = require("lib.csheet_page2_xml")

local function assertHas(xml, needle, label)
  assert(xml:find(needle, 1, true) ~= nil, label .. " missing " .. needle)
end

local function assertLacks(xml, needle, label)
  assert(xml:find(needle, 1, true) == nil, label .. " unexpectedly contains " .. needle)
end

local disciplinesOnly = Page2.buildPage2DocumentXml({
  disciplines = {
    animalism = { base = 2, temp = 1, powers = {} },
    auspex = { base = 0, temp = 0, powers = {} },
  },
})

assertHas(disciplinesOnly, 'id="paper_root"', "disciplines")
assertHas(disciplinesOnly, 'id="page2_dynamic"', "disciplines")
assertHas(disciplinesOnly, 'id="db_disc_cell_animalism"', "disciplines")
assertHas(disciplinesOnly, 'id="db_disc_cell_auspex"', "disciplines")
assertHas(disciplinesOnly, 'id="dot_animalism_1"', "disciplines")
assertHas(disciplinesOnly, 'id="dot_animalism_3"', "disciplines")
assertHas(disciplinesOnly, 'id="dot_animalism_5"', "disciplines")
assertHas(disciplinesOnly, 'image="dot_yellow"', "disciplines")
assertHas(disciplinesOnly, 'image="dot_white"', "disciplines")
assertHas(disciplinesOnly, 'id="db_powers_animalism"', "disciplines")
assertHas(disciplinesOnly, 'id="db_disc_cell_empty_3"', "disciplines")
assertHas(disciplinesOnly, 'id="db_disc_cell_empty_6"', "disciplines")
assertLacks(disciplinesOnly, 'id="db_disc_cell_empty_7"', "disciplines")
assertLacks(disciplinesOnly, 'id="db_rc_divider"', "disciplines")
assertLacks(disciplinesOnly, "RC_SECTION", "disciplines")
assertHas(disciplinesOnly, 'class="page2_disc_row"', "disciplines")

local withBoth = Page2.buildPage2DocumentXml({
  disciplines = {
    bloodSorcery = {
      base = 1,
      temp = 0,
      rituals = {
        { name = "Ward & Salt", level = 2 },
        { name = "Sixth <Rite>", level = 1 },
      },
    },
    oblivion = {
      base = 1,
      temp = 0,
      ceremonies = {
        { name = "Harrow", level = 3 },
      },
    },
  },
})

assertHas(withBoth, 'image="divider_ritualsAndCeremonies"', "both")
assertHas(withBoth, 'id="db_rc_col_L"', "both")
assertHas(withBoth, 'id="db_rc_col_R"', "both")
assertHas(withBoth, 'id="dot_rc_L_1_1"', "both")
assertHas(withBoth, 'id="dot_rc_L_1_2"', "both")
assertHas(withBoth, 'id="dot_rc_R_1_3"', "both")
assertHas(withBoth, 'text="Ward &amp; Salt"', "both")
assertHas(withBoth, 'text="Sixth &lt;Rite&gt;"', "both")
assertHas(withBoth, 'text="Harrow"', "both")
assertHas(withBoth, 'id="db_rc_name_L_2"', "both")
assertLacks(withBoth, 'id="db_rc_name_L_6"', "both")

local ritualsOnly = Page2.buildPage2DocumentXml({
  disciplines = {
    bloodSorcery = {
      base = 1,
      temp = 0,
      rituals = { { name = "Only Ritual", level = 1 } },
    },
  },
})
assertHas(ritualsOnly, 'image="divider_rituals"', "rituals")
assertLacks(ritualsOnly, "divider_ritualsAndCeremonies", "rituals")
assertLacks(ritualsOnly, "divider_ceremonies", "rituals")

local ok, err = pcall(function()
  Page2.buildPage2DocumentXml({
    disciplines = {
      animalism = { base = 1 },
      auspex = { base = 1 },
      bloodSorcery = { base = 1 },
      celerity = { base = 1 },
      dominate = { base = 1 },
      fortitude = { base = 1 },
      obfuscate = { base = 1 },
    },
  })
end)
assert(ok == false, "seven disciplines should be refused")
assert(tostring(err):find("at most 6", 1, true) ~= nil, "seven-discipline error should name the limit")

assertLacks(disciplinesOnly, 'id="condition_container_1"', "conditions")
assertLacks(disciplinesOnly, "Condition 1 Title", "conditions")
assertLacks(disciplinesOnly, "@@TITLE@@", "conditions")
assertHas(disciplinesOnly, 'class="condition_container condition_slot_8"', "conditions")
assertHas(disciplinesOnly, 'width="700"', "conditions")

local withCard = Page2.buildPage2DocumentXml({
  disciplines = {
    animalism = { base = 1, temp = 0, powers = {} },
  },
}, nil, {
  personalConditions = {
    {
      id = "pc-1",
      seq = 1,
      appliedOn = "2026-09-04T20:00",
      displayOnSheet = true,
      displayType = "theBeast",
      textColor = "gold",
      title = "Beast & Bone",
      subtitle = "The hunt",
      description = "It watches.",
      duration = "Until dawn",
    },
  },
})
assertHas(withCard, 'id="condition_container_1"', "filled card")
assertHas(withCard, 'class="condition_container condition_slot_1"', "filled card")
assertHas(withCard, 'class="condition_container_title text_gold"', "filled card")
assertHas(withCard, 'text="Beast &amp; Bone"', "filled card")
assertHas(withCard, 'image="bg_condition_theBeast"', "filled card")
assertLacks(withCard, 'id="condition_container_2"', "filled card")
local whitePrint = Page2.fingerprintPage2Stats({ disciplines = {} }, nil, {
  personalConditions = {
    { id = "pc-1", seq = 1, appliedOn = "1", displayOnSheet = true, displayType = "general", textColor = "white", title = "A" },
  },
})
local redPrint = Page2.fingerprintPage2Stats({ disciplines = {} }, nil, {
  personalConditions = {
    { id = "pc-1", seq = 1, appliedOn = "1", displayOnSheet = true, displayType = "general", textColor = "red", title = "A" },
  },
})
assert(whitePrint ~= redPrint, "a text color change should rebuild page 2")

print("page 2 template XML ok")
