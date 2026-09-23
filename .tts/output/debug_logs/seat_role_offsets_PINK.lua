-- Phase 0 seat-role offset dump (current layout still running).
-- lua DEBUG.dumpSeatRoleOffsets("Pink")
-- localXZ is world-unit XZ vs the figurine yaw frame (lib.figurine_frame; same as layout apply).
-- Do not use Figurine_Custom:positionToLocal — that space is not world inches.
-- Hidden objects may have defaultY = -200; replace those with the in-use height before pasting.
-- Copy roles into C.SeatRoleOffsets.shared / .player / .extraByOccupant["Pink"].
-- occupant=Pink tableKey=Table B0 figurineGuid=390349

local DUMP_SEAT_ROLE_OFFSETS = {
  occupant = "Pink",
  tableKey = "Table B0",
  referenceFigurine = {
    guid = "390349",
    position = Vector({ x = 0.0000, y = -55.8166, z = -111.6669 }),
    rotation = Vector({ x = 0.0000, y = 180.0000, z = 0.0000 }),
  },
  roles = {
    ["COMPULSION_CARD_1_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_1_ANCHOR",
      guid = "0e4ba8",
      localXZ = { x = 8.0000, z = -21.6649 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world -8.0000, 10.0000, -90.0020
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_2_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_2_ANCHOR",
      guid = "04cd7b",
      localXZ = { x = 0.0000, z = -23.7249 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -87.9420
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_3_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_3_ANCHOR",
      guid = "c6fe51",
      localXZ = { x = -8.0000, z = -21.6649 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 8.0000, 10.0000, -90.0020
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_4_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_4_ANCHOR",
      guid = "eedd02",
      localXZ = { x = 0.0000, z = -19.5949 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -92.0720
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_DRAWN_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_DRAWN_ANCHOR",
      guid = "a7ddd9",
      localXZ = { x = 0.0000, z = -21.6649 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -90.0020
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_SELECTED_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_SELECTED_ANCHOR",
      guid = "a78358",
      localXZ = { x = 9.3100, z = -32.3148 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world -9.3100, 10.0000, -79.3521
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_CARD_SELECTED_LIVEROLL_ANCHOR"] = {
      roleKey = "COMPULSION_CARD_SELECTED_LIVEROLL_ANCHOR",
      guid = "188c1d",
      localXZ = { x = 16.2035, z = -32.3148 },
      localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world -16.2035, 10.0000, -79.3521
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_DECK"] = {
      roleKey = "COMPULSION_DECK",
      guid = "221f0f",
      localXZ = { x = 9.3100, z = -31.9870 },
      localRotation = { x = 90.0000, y = -179.9857, z = 0.0000 },
      defaultY = 5.5400,
      -- world -9.3100, 5.5400, -79.6799
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["COMPULSION_LIGHT"] = {
      roleKey = "COMPULSION_LIGHT",
      guid = "c1abf7",
      localXZ = { x = 9.3100, z = -28.7738 },
      localRotation = { x = 90.0000, y = 0.0000, z = 0.0000 },
      defaultY = 9.3048,
      -- world -9.3100, 9.3048, -82.8931
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["CSHEET_BASE"] = {
      roleKey = "CSHEET_BASE",
      guid = "d0b68a",
      localXZ = { x = 0.0000, z = -19.5036 },
      localRotation = { x = -19.4400, y = -180.0000, z = 0.0000 },
      defaultY = -1.2000,
      -- world 0.0000, -1.2000, -92.1633
      scale = { x = 25.0800, y = 7.6000, z = 10.7191 },
    },
    ["CSHEET_BASE_BACK"] = {
      roleKey = "CSHEET_BASE_BACK",
      guid = "6d0572",
      localXZ = { x = 0.0000, z = -30.2052 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 1.4300,
      -- world 0.0000, 1.4300, -81.4617
      scale = { x = 25.0799, y = 8.9500, z = 2.0799 },
    },
    ["CSHEET_DICE_DRAWER"] = {
      roleKey = "CSHEET_DICE_DRAWER",
      guid = "248013",
      localXZ = { x = 0.0000, z = -40.3241 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 2.9700,
      -- world 0.0000, 2.9700, -71.3428
      scale = { x = 23.5700, y = 3.9200, z = 7.6800 },
    },
    ["CSHEET_DICE_DRAWER_ANCHOR_OFF"] = {
      roleKey = "CSHEET_DICE_DRAWER_ANCHOR_OFF",
      guid = "880abb",
      localXZ = { x = 0.0000, z = -19.5036 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -92.1633
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["CSHEET_DICE_DRAWER_ANCHOR_ON"] = {
      roleKey = "CSHEET_DICE_DRAWER_ANCHOR_ON",
      guid = "47b608",
      localXZ = { x = 0.0000, z = -40.3241 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -71.3428
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["CSHEET_PAGE_1"] = {
      roleKey = "CSHEET_PAGE_1",
      guid = "c4abec",
      localXZ = { x = 6.1500, z = -20.7349 },
      localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 },
      defaultY = 3.2000,
      -- world -6.1500, 3.2000, -90.9320
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_2"] = {
      roleKey = "CSHEET_PAGE_2",
      guid = "c0f4b5",
      localXZ = { x = -6.1500, z = -20.7336 },
      localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 },
      defaultY = 3.2000,
      -- world 6.1500, 3.2000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_3"] = {
      roleKey = "CSHEET_PAGE_3",
      guid = "5166e7",
      localXZ = { x = 6.6250, z = -20.7336 },
      localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world -6.6250, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_4"] = {
      roleKey = "CSHEET_PAGE_4",
      guid = "802d14",
      localXZ = { x = -5.6165, z = -20.7336 },
      localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world 5.6165, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_5"] = {
      roleKey = "CSHEET_PAGE_5",
      guid = "00fc87",
      localXZ = { x = 6.6250, z = -20.7336 },
      localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world -6.6250, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_6"] = {
      roleKey = "CSHEET_PAGE_6",
      guid = "555372",
      localXZ = { x = -5.6165, z = -20.7336 },
      localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world 5.6165, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_7"] = {
      roleKey = "CSHEET_PAGE_7",
      guid = "f38d69",
      localXZ = { x = 6.6250, z = -20.7336 },
      localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world -6.6250, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["CSHEET_PAGE_8"] = {
      roleKey = "CSHEET_PAGE_8",
      guid = "645189",
      localXZ = { x = -5.6165, z = -20.7336 },
      localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world 5.6165, -200.0000, -90.9333
      scale = { x = 8.0000, y = 1.0000, z = 8.0000 },
    },
    ["DICEBAG_HUNGER"] = {
      roleKey = "DICEBAG_HUNGER",
      guid = "90f17d",
      localXZ = { x = -2.8038, z = -30.2169 },
      localRotation = { x = 0.0000, y = 0.0193, z = 0.0000 },
      defaultY = 5.9800,
      -- world 2.8038, 5.9800, -81.4500
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["DICEBAG_NORMAL"] = {
      roleKey = "DICEBAG_NORMAL",
      guid = "4637da",
      localXZ = { x = 0.0000, z = -29.7848 },
      localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 },
      defaultY = 5.9800,
      -- world 0.0000, 5.9800, -81.8821
      scale = { x = 1.3500, y = 1.3500, z = 1.3500 },
    },
    ["DICEBAG_ROUSE"] = {
      roleKey = "DICEBAG_ROUSE",
      guid = "1f5ceb",
      localXZ = { x = 2.7500, z = -30.2169 },
      localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 },
      defaultY = 5.9800,
      -- world -2.7500, 5.9800, -81.4500
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["HAND_ZONE"] = {
      roleKey = "HAND_ZONE",
      guid = "8fe0fe",
      localXZ = { x = 0.0000, z = 3.8752 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 3.2200,
      -- world 0.0000, 3.2200, -115.5421
      scale = { x = 29.8700, y = 6.6900, z = 11.6200 },
    },
    ["HUNGER_SMOKE"] = {
      roleKey = "HUNGER_SMOKE",
      guid = "fb25b1",
      localXZ = { x = 0.5035, z = -30.6027 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = -200.0000,
      -- world -0.5035, -200.0000, -81.0642
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_CHAIR"] = {
      roleKey = "SEAT_CHAIR",
      guid = "570f9b",
      localXZ = { x = 0.0000, z = 13.0852 },
      localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 },
      defaultY = -20.2900,
      -- world 0.0000, -20.2900, -124.7521
      scale = { x = 14.9244, y = 21.4949, z = 0.5365 },
    },
    ["SEAT_FIGURE"] = {
      roleKey = "SEAT_FIGURE",
      guid = "390349",
      localXZ = { x = 0.0000, z = 0.0000 },
      localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 },
      defaultY = -55.8166,
      -- world 0.0000, -55.8166, -111.6669
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_LIGHT_1"] = {
      roleKey = "SEAT_LIGHT_1",
      guid = "937fac",
      localXZ = { x = 0.0000, z = -7.7352 },
      localRotation = { x = -10.0000, y = -180.0000, z = 0.0000 },
      defaultY = 23.0000,
      -- world 0.0000, 23.0000, -103.9317
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_LIGHT_1_LOOKAT_ANCHOR"] = {
      roleKey = "SEAT_LIGHT_1_LOOKAT_ANCHOR",
      guid = "1cdd7f",
      localXZ = { x = 0.0000, z = -10.0269 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -101.6400
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_LIGHT_1_POSITION_ANCHOR"] = {
      roleKey = "SEAT_LIGHT_1_POSITION_ANCHOR",
      guid = "8fbe34",
      localXZ = { x = 0.0000, z = -7.7369 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 10.0000,
      -- world 0.0000, 10.0000, -103.9300
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_LIGHT_2"] = {
      roleKey = "SEAT_LIGHT_2",
      guid = "1736cb",
      localXZ = { x = 0.0000, z = -32.3036 },
      localRotation = { x = 64.7800, y = 0.0000, z = 180.0000 },
      defaultY = 17.0400,
      -- world 0.0000, 17.0400, -79.3633
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SEAT_LIGHT_3"] = {
      roleKey = "SEAT_LIGHT_3",
      guid = "7d3caf",
      localXZ = { x = 0.5035, z = 3.8752 },
      localRotation = { x = 0.0000, y = 0.0000, z = 180.0000 },
      defaultY = -5.0000,
      -- world -0.5035, -5.0000, -115.5421
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["SIGNAL_CANDLE"] = {
      roleKey = "SIGNAL_CANDLE",
      guid = "e6836c",
      localXZ = { x = 11.0211, z = -29.7836 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 4.7388,
      -- world -11.0211, 4.7388, -81.8833
      scale = { x = 1.6500, y = 5.0000, z = 1.6500 },
    },
    ["SIGNAL_FIRE"] = {
      roleKey = "SIGNAL_FIRE",
      guid = "f1b7af",
      localXZ = { x = 11.0200, z = -29.7869 },
      localRotation = { x = 0.0000, y = -180.0000, z = 0.0000 },
      defaultY = 7.2006,
      -- world -11.0200, 7.2006, -81.8800
      scale = { x = 0.0100, y = 0.0100, z = 0.0100 },
    },
    ["STORAGE_TOME"] = {
      roleKey = "STORAGE_TOME",
      guid = "e57e55",
      localXZ = { x = -13.9548, z = -15.1566 },
      localRotation = { x = 0.0000, y = 0.0143, z = 0.0000 },
      defaultY = -0.0146,
      -- world 13.9548, -0.0146, -96.5102
      scale = { x = 10.0000, y = 15.0000, z = 10.0000 },
    },
    ["TAROT_BUTTON"] = {
      roleKey = "TAROT_BUTTON",
      guid = "4dc8ad",
      localXZ = { x = -8.2958, z = -29.9693 },
      localRotation = { x = 0.0000, y = 179.9863, z = 0.0000 },
      defaultY = 6.0000,
      -- world 8.2958, 6.0000, -81.6976
      scale = { x = 0.7000, y = 1.0000, z = 0.7000 },
    },
    ["TAROT_BUTTON_ANCHOR_OFF"] = {
      roleKey = "TAROT_BUTTON_ANCHOR_OFF",
      guid = "542096",
      localXZ = { x = -8.2958, z = -29.9693 },
      localRotation = { x = 0.0000, y = 179.9863, z = 0.0000 },
      defaultY = 10.0000,
      -- world 8.2958, 10.0000, -81.6976
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["TAROT_BUTTON_ANCHOR_ON"] = {
      roleKey = "TAROT_BUTTON_ANCHOR_ON",
      guid = "a1c043",
      localXZ = { x = -8.2958, z = -29.9693 },
      localRotation = { x = 0.0000, y = -0.0140, z = 180.0000 },
      defaultY = 12.0000,
      -- world 8.2958, 12.0000, -81.6976
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["TAROT_DECK_ANCHOR"] = {
      roleKey = "TAROT_DECK_ANCHOR",
      guid = "764db1",
      localXZ = { x = -5.6408, z = -37.0964 },
      localRotation = { x = 17.6000, y = -0.0141, z = 180.0000 },
      defaultY = 10.0000,
      -- world 5.6408, 10.0000, -74.5705
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["TAROT_DRAWER"] = {
      roleKey = "TAROT_DRAWER",
      guid = "7f0246",
      localXZ = { x = -5.6446, z = -25.3428 },
      localRotation = { x = 0.0000, y = 179.9863, z = 0.0000 },
      defaultY = 2.4100,
      -- world 5.6446, 2.4100, -86.3241
      scale = { x = 7.4900, y = 0.0100, z = 5.7200 },
    },
    ["TAROT_DRAWER_ANCHOR_OFF"] = {
      roleKey = "TAROT_DRAWER_ANCHOR_OFF",
      guid = "c1f530",
      localXZ = { x = -5.6446, z = -25.3428 },
      localRotation = { x = 0.0000, y = 179.9863, z = 0.0000 },
      defaultY = 10.0000,
      -- world 5.6446, 10.0000, -86.3241
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
    ["TAROT_DRAWER_ANCHOR_ON"] = {
      roleKey = "TAROT_DRAWER_ANCHOR_ON",
      guid = "936758",
      localXZ = { x = -5.6408, z = -37.0811 },
      localRotation = { x = -14.6501, y = 179.9863, z = 0.0000 },
      defaultY = 12.0000,
      -- world 5.6408, 12.0000, -74.5858
      scale = { x = 1.0000, y = 1.0000, z = 1.0000 },
    },
  },
  skippedNoRole = {
    { guid = "032194", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "0423db", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "0aef5a", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "1354ba", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "185122", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "188ae1", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "2e49b8", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "3a814a", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "3c6ce3", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "43f72e", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "46d348", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "48c234", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "48eeb3", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "4d9f2b", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "508c02", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "607a1a", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "621579", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "6b0659", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "6dec47", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "73ff51", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "75d30b", name = "", tags = "HiddenObject,PinkObject,Tarot" },
    { guid = "797b4f", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "7a6774", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "833077", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "898511", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "98d072", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "a3bc3b", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "a41eda", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "b54e2c", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "b830a0", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "b9cd1e", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "bd5188", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "cadc0f", name = "Rouse Die", tags = "d10Preload,HiddenObject,PinkObject,RouseDie" },
    { guid = "ce1122", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "eea53c", name = "Hunger Die", tags = "d10Preload,HiddenObject,HungerDie,PinkObject" },
    { guid = "ef7cb5", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
    { guid = "fe41ff", name = "Normal Die", tags = "d10Preload,HiddenObject,NormalDie,PinkObject" },
  },
}
