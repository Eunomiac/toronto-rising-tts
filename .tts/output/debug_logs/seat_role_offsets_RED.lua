-- Seat-role offset dump, shaped like the offsets table in lib/seat_role_offsets.ttslua.
-- lua DEBUG.dumpSeatRoleOffsets("Red")
-- localXZ is world-unit XZ vs the figurine yaw frame (lib.figurine_frame; same as layout apply).
-- Paste rows into the matching section of the offsets table. defaultY comes from that table.
-- occupant=Red tableKey=Table B0 figurineGuid=1e70cf
-- figurine position { x = 58.6487, y = -55.8166, z = -69.0561 } rotation { x = 0.0000, y = 108.0000, z = 0.0000 }
-- NEW roles (not in the offsets table; defaultY is the live Y, -200 if hidden — check before pasting): CSHEET_DICE_DRAWER, SEAT_FIGURE
-- skipped (no role): guid=04e847 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=155dc6 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=1a5561 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=1fc146 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=358641 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=36a18b name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=4070ee name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=430e58 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=4c8508 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=5486cc name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=5cbb89 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=6ae004 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=70ca67 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=7d1087 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=8592f4 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=90fff0 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=97c1d7 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=a2697f name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=ab1d11 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=b76d0f name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=bba7c3 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=bbb297 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=cf575a name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=d244a4 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=db9526 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=df3ecd name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=df4095 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=e3b895 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=e61e1c name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=e8e08e name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=ed001e name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=eeaa9c name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=ef1cf2 name="Normal Die" tags=d10Preload,HiddenObject,NormalDie,RedObject
-- skipped (no role): guid=f0d2ef name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject
-- skipped (no role): guid=f1d180 name="Rouse Die" tags=d10Preload,HiddenObject,RedObject,RouseDie
-- skipped (no role): guid=f351f9 name="Hunger Die" tags=d10Preload,HiddenObject,HungerDie,RedObject

local DUMP_SEAT_ROLE_OFFSETS = {
  shared = {
    CSHEET_DICE_DRAWER_ANCHOR_OFF = { localXZ = { x = 0.0000, z = -19.5036 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 200.0000 },
    CSHEET_DICE_DRAWER_ANCHOR_ON = { localXZ = { x = 0.0000, z = -39.6241 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 200.0000 },
    SEAT_LIGHT_1 = { localXZ = { x = 0.0000, z = -7.7369 }, localRotation = { x = -1.7968, y = 180.0000, z = 0.0000 }, defaultY = 23.0000 },
    SEAT_LIGHT_2 = { localXZ = { x = 0.0000, z = -32.3036 }, localRotation = { x = 64.7800, y = 0.0000, z = 180.0000 }, defaultY = 17.0400 },
  },
  player = {
    COMPULSION_CARD_1_ANCHOR = { localXZ = { x = 8.0000, z = -21.6649 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_2_ANCHOR = { localXZ = { x = 0.0000, z = -23.7249 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_3_ANCHOR = { localXZ = { x = -8.0000, z = -21.6649 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_4_ANCHOR = { localXZ = { x = 0.0000, z = -19.5949 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_DRAWN_ANCHOR = { localXZ = { x = 0.0000, z = -21.6649 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_SELECTED_ANCHOR = { localXZ = { x = 9.3100, z = -32.3148 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_CARD_SELECTED_LIVEROLL_ANCHOR = { localXZ = { x = 16.2035, z = -32.3148 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    COMPULSION_DECK = { localXZ = { x = 9.3100, z = -31.9870 }, localRotation = { x = 90.0000, y = -179.9857, z = 0.0000 }, defaultY = 5.5400 },
    COMPULSION_LIGHT = { localXZ = { x = 9.3100, z = -28.7738 }, localRotation = { x = 90.0000, y = 0.0000, z = 0.0000 }, defaultY = 9.3048 },
    CSHEET_BASE = { localXZ = { x = 0.0000, z = -19.5036 }, localRotation = { x = -19.4400, y = 180.0000, z = 0.0000 }, defaultY = -1.2000 },
    CSHEET_BASE_BACK = { localXZ = { x = 0.0000, z = -30.2052 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 1.4300 },
    CSHEET_PAGE_1 = { localXZ = { x = 6.1500, z = -20.7349 }, localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_2 = { localXZ = { x = -6.1500, z = -20.7336 }, localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_3 = { localXZ = { x = 6.1500, z = -20.7336 }, localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_4 = { localXZ = { x = -6.1500, z = -20.7336 }, localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_5 = { localXZ = { x = 6.1500, z = -20.7336 }, localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_6 = { localXZ = { x = -6.1500, z = -20.7336 }, localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_7 = { localXZ = { x = 6.1500, z = -20.7336 }, localRotation = { x = 19.4360, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    CSHEET_PAGE_8 = { localXZ = { x = -6.1500, z = -20.7336 }, localRotation = { x = 19.4400, y = 0.0000, z = 0.0000 }, defaultY = 3.2000 },
    DICEBAG_HUNGER = { localXZ = { x = -2.8038, z = -30.2169 }, localRotation = { x = 0.0000, y = 0.0193, z = 0.0000 }, defaultY = 5.9800 },
    DICEBAG_NORMAL = { localXZ = { x = 0.0000, z = -29.7848 }, localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 }, defaultY = 5.9800 },
    DICEBAG_ROUSE = { localXZ = { x = 2.7500, z = -30.2169 }, localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 }, defaultY = 5.9800 },
    FAMULUS_FIGURINE = { localXZ = { x = -8.2905, z = -32.4928 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = -1.0300 },
    FAMULUS_LIGHT_1 = { localXZ = { x = -8.8465, z = -39.1469 }, localRotation = { x = 31.8995, y = 0.0000, z = 180.0000 }, defaultY = 0.6400 },
    FAMULUS_LIGHT_2 = { localXZ = { x = -8.8465, z = -15.5552 }, localRotation = { x = 90.0000, y = 0.0000, z = 0.0000 }, defaultY = 14.8500 },
    HAND_ZONE = { localXZ = { x = 0.0000, z = 3.8752 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 3.2200 },
    HUNGER_SMOKE = { localXZ = { x = 0.0000, z = -30.6027 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 1.8700 },
    SEAT_LIGHT_1_LOOKAT_ANCHOR = { localXZ = { x = 0.0000, z = -10.0269 }, localRotation = { x = 60.0000, y = 0.0000, z = 0.0000 }, defaultY = 200.0000 },
    SEAT_LIGHT_1_POSITION_ANCHOR = { localXZ = { x = 0.0000, z = -7.7369 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 200.0000 },
    SEAT_LIGHT_3 = { localXZ = { x = 0.0000, z = 3.8752 }, localRotation = { x = 0.0000, y = 0.0000, z = 180.0000 }, defaultY = -5.0000 },
    SIGNAL_CANDLE = { localXZ = { x = 11.0211, z = -29.7836 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 4.7388 },
    SIGNAL_FIRE = { localXZ = { x = 11.0200, z = -29.7869 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = 7.2006 },
    STORAGE_TOME = { localXZ = { x = -13.9548, z = -15.1566 }, localRotation = { x = 0.0000, y = 0.0143, z = 0.0000 }, defaultY = -0.0146 },
  },
  extraByOccupant = {
    Red = {
      COMPANION_TOGGLE_A = { localXZ = { x = -8.1662, z = -29.8995 }, localRotation = { x = 0.0000, y = 0.0428, z = 0.0000 }, defaultY = 6.0050 },
      CSHEET_DICE_DRAWER = { localXZ = { x = 0.0000, z = -19.5036 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = -1.0000 },
      PRINCE_CURTAIN = { localXZ = { x = 0.0000, z = 15.8352 }, localRotation = { x = 0.0000, y = -179.9714, z = 0.0000 }, defaultY = -37.9311 },
      PRINCE_SIGNET = { localXZ = { x = 0.0000, z = 12.7698 }, localRotation = { x = 90.0000, y = -179.9714, z = 0.0000 }, defaultY = 46.5711 },
      PRINCE_SIGNET_BORDER = { localXZ = { x = 0.0000, z = 13.3618 }, localRotation = { x = 0.0000, y = 0.0286, z = 0.0000 }, defaultY = 26.8937 },
      SEAT_CHAIR = { localXZ = { x = 0.0000, z = 13.0852 }, localRotation = { x = 0.0000, y = 180.0000, z = 0.0000 }, defaultY = -31.9300 },
      SEAT_FIGURE = { localXZ = { x = 0.0000, z = 0.0000 }, localRotation = { x = 0.0000, y = 0.0000, z = 0.0000 }, defaultY = -55.8166 },
    },
  },
}
