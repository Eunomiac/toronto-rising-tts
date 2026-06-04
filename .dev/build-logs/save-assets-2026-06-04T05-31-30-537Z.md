# TTS save asset report

## Summary

- Custom UI registry (`CustomUIAssets`): **579** entries
- Decal pallet: **29**
- Distinct XmlUI asset ids: **428** (17 not in registry)
- Object URLs not in registry: **281**
- Repo-required names: **812** (233 missing from save)

### By category

| Category | Count |
| --- | ---: |
| hudToggle | 234 |
| siteCard | 168 |
| mapOverlay | 72 |
| district | 42 |
| referencePanel | 22 |
| dieFace | 20 |
| pin | 5 |
| nameLabel | 5 |
| background | 3 |
| button | 3 |
| border | 2 |
| popout | 2 |
| other | 1 |

### Prune hints (Custom UI only)

| Hint | Count | Meaning |
| --- | ---: | --- |
| keep | 579 | Referenced in save and/or repo sources |
| review | 0 | Only found as quoted string in bundled save Lua |
| candidate_prune | 0 | No references detected — safe to review first |

## XmlUI refs not in Custom UI registry (sample)

- `overlay_health_impaired`
- `overlay_humanity_impaired`
- `overlay_torpor`
- `overlay_willpower_impaired`
- `refPanel_Experience`
- `refPanel_Recovery`
- `refPanel_SocialCombat`
- `toggle_aishe_hover`
- `toggle_aishe_inactive`
- `toggle_blackCaesar_hover`
- `toggle_blackCaesar_inactive`
- `toggle_fomorach_hover`
- `toggle_fomorach_inactive`
- `toggle_lucien_hover`
- `toggle_lucien_inactive`
- `toggle_rashid_hover`
- `toggle_rashid_inactive`

## Repo expects asset but save lacks it (sample)

- `@@DOT_IMG_1@@`
- `@@DOT_IMG_2@@`
- `@@DOT_IMG_3@@`
- `@@DOT_IMG_4@@`
- `@@DOT_IMG_5@@`
- `@@DOT_IMG_6@@`
- `@@IMAGE_REF@@`
- `border-gold-left-bottom`
- `border-gold-left-top`
- `border-silver-left-bottom`
- `border-silver-left-top`
- `border-silver-right-bottom`
- `border-silver-right-top`
- `box_black`
- `box_grey_slash`
- `box_red`
- `box_red_x`
- `box_white`
- `divider_bloodBonds`
- `divider_childer`
- `divider_experienceLog`
- `divider_flaws_@@COLOR@@`
- `divider_merits`
- `divider_otherRelationships`
- `dot_blank`
- `dot_large_blank`
- `dot_large_red`
- `dot_yellow`
- `hud-border-gold-bottom`
- `hud-border-gold-top`
- `hud-border-silver-bottom`
- `hud-border-silver-top`
- `hud-toggle-ancillaeA`
- `hud-toggle-ancillaeB`
- `hud-toggle-ancillaeC`
- `hud-toggle-ancillaeD`
- `hud-toggle-ancillaeE`
- `hud-toggle-assets`
- `hud-toggle-battlegrounds`
- `hud-toggle-clanBrujah`
- … and 193 more
