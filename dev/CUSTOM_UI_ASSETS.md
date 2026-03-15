# Custom UI Assets (used by Toronto Rising)

Only assets referenced by the current UI are listed. Source: Heritage and King's Dilemma TTS saves.

## Pasting into your save file

1. Close TTS so the save file isn’t locked.
2. Open your Toronto Rising save `.json` and find the **CustomUIAssets** (or **CustomAssets**) section.
3. Open **`dev/CUSTOM_UI_ASSETS.json`** in this repo.
4. Copy the **entire file contents** (the JSON array from `[` to `]`).
5. In the save JSON, replace the existing `CustomUIAssets` value with that array — i.e. the line(s) that look like `"CustomUIAssets": [ ... ]` should become `"CustomUIAssets":` followed by the pasted array.
6. Save the `.json` and reopen the save in TTS.

Alternatively, add assets in-game via **Modding > Custom UI Assets** using the Name + URL table below.

---

## Heritage (sidebar + camera) — 53 assets

| Name | URL |
| ------ | ----- |
| ref-symbols | <http://cloud-3.steamusercontent.com/ugc/2003568586248076249/3B55C6ACE6BF78088742E43AD9FAC28D1019758C/> |
| hud-border-gold-top | <http://cloud-3.steamusercontent.com/ugc/1951776845198738001/67349D7337CC209A780554F3F542E98B32E3851A/> |
| hud-border-gold-bottom | <http://cloud-3.steamusercontent.com/ugc/1951776845198741119/E032632E9936B3245D94CDBF1D3BB469E9DC29CD/> |
| hud-border-silver-bottom | <http://cloud-3.steamusercontent.com/ugc/1951776845198743055/22476ACE913C7196930DA48C4786EC1ABC4E67A8/> |
| hud-border-silver-top | <http://cloud-3.steamusercontent.com/ugc/1951776845198744620/411700FB9F31AE499E9E5DA2A0664BACEB996A56/> |
| hud-toggle-battlegrounds | <http://cloud-3.steamusercontent.com/ugc/2045234494068020403/A16D0512AE39C63651D64991AEBDB4F887F3B4A0/> |
| hud-toggle-expansions | <http://cloud-3.steamusercontent.com/ugc/2045234494068030243/489C34A6A1F5E765EA5CE9A6AD14F9C7ECC600CA/> |
| hud-toggle-clanBrujah | <http://cloud-3.steamusercontent.com/ugc/2045234494068018933/C87BB0699859B52290B313F8D08438DB0DCA3C0F/> |
| hud-toggle-clanGangrel | <http://cloud-3.steamusercontent.com/ugc/2045234494068025133/A23ABFCCB7576B5BD4EA34650B2A5C3A96438326/> |
| hud-toggle-clanLasombra | <http://cloud-3.steamusercontent.com/ugc/2045234494068025659/E9BB740AA51EB81F640D5487E4F5F4638AB81509/> |
| hud-toggle-clanMalkavian | <http://cloud-3.steamusercontent.com/ugc/2045234494068026297/788F8F20E721D4BA95C756545845C885F9AA507E/> |
| hud-toggle-clanNosferatu | <http://cloud-3.steamusercontent.com/ugc/2045234494068026844/7E48975C8B417047C0C82CB482FCC7A49E4307C5/> |
| hud-toggle-clanToreador | <http://cloud-3.steamusercontent.com/ugc/2045234494068027475/CC5D09C02055E47AA90B2339E58B0A98B664ECF3/> |
| hud-toggle-clanTremere | <http://cloud-3.steamusercontent.com/ugc/2045234494068028080/8D0AF04D63D9F621070AB5447886C778D2F8E4D1/> |
| hud-toggle-clanTzimisce | <http://cloud-3.steamusercontent.com/ugc/2045234494068028658/1F5925B9F745383C8B6435778A42631E85568A6D/> |
| hud-toggle-clanVentrue | <http://cloud-3.steamusercontent.com/ugc/2045234494068029425/426F47BE753A8E3F389A355F0F2A0527CD4FB2AE/> |
| ref-expansions | <http://cloud-3.steamusercontent.com/ugc/2003568586248076625/70FC82ABD05AA96784D6EF19506ED3D788AD5CE5/> |
| ref-battlegrounds | <http://cloud-3.steamusercontent.com/ugc/2064376690974074604/7335FEECED477D6688AF04A326281FA26BD64229/> |
| ref-clanGangrel | <http://cloud-3.steamusercontent.com/ugc/2064377033360631555/6BFD293A0E17E1B416AB57AABFB584995A53E92A/> |
| ref-clanLasombra | <http://cloud-3.steamusercontent.com/ugc/2045235128489572995/745ADA5B10137FB66782B73ABEC2145E70D6926E/> |
| ref-clanBrujah | <http://cloud-3.steamusercontent.com/ugc/2045235761566976774/E807D532ED02A27C28F763673E5F96CF7549A34E/> |
| ref-clanMalkavian | <http://cloud-3.steamusercontent.com/ugc/2045235128489573776/FEF63191BCAB64E34D72EA5A6F047413467A9971/> |
| ref-clanNosferatu | <http://cloud-3.steamusercontent.com/ugc/2045235128489574471/2D260C4E101585CAA433794B78CE2CA18C659BAC/> |
| ref-clanToreador | <http://cloud-3.steamusercontent.com/ugc/2064377033360632341/C1CA14A40CB281926F3458247D793189C45F9060/> |
| ref-clanTremere | <http://cloud-3.steamusercontent.com/ugc/2064377033360633221/989BD49D3CC3750F381F2610E98409EAC76125C3/> |
| ref-clanTzimisce | <http://cloud-3.steamusercontent.com/ugc/2064377033354724945/0A1053076A8AB6051FA9024D4E30E575002F77E9/> |
| ref-clanVentrue | <http://cloud-3.steamusercontent.com/ugc/2064377033354725494/5D990EF9BD4ADA6B1E6818A44F6A5F07357DC78B/> |
| ref-players | <http://cloud-3.steamusercontent.com/ugc/2064377033360633995/68E526942A6653FB622ABA6449DC0E68178E14B2/> |
| hud-toggle-traits1 | <http://cloud-3.steamusercontent.com/ugc/2045235128493297353/CC6356639DB57DE8F0458B75A7AB2CC1D69C5825/> |
| hud-toggle-players | <http://cloud-3.steamusercontent.com/ugc/2045234494068030865/64E4D737982F7674A6A11BC2327CBBB651AE7944/> |
| camera-zoom-player-one | <http://cloud-3.steamusercontent.com/ugc/2003568586248198431/055A4BBBF44C6EA67DAB80D6D6A1E2CC978AF2A3/> |
| camera-zoom-player-two | <http://cloud-3.steamusercontent.com/ugc/2004695120348196414/809C732062F6F0846273C96BE1688183954AA6EB/> |
| camera-zoom-player-three | <http://cloud-3.steamusercontent.com/ugc/2003568586248198327/E222C4CA34688BD594D65ECB0F278CB7F656DEDA/> |
| camera-zoom-queue | <http://cloud-3.steamusercontent.com/ugc/2004695120348197664/526A55A1B557B417821FEDC071293082588623F6/> |
| camera-zoom-battlegrounds | <http://cloud-3.steamusercontent.com/ugc/2004695120348198427/12ACFE768FBAEB83AD4F45D92CCCE676FA7033F7/> |
| camera-wide-angle | <http://cloud-3.steamusercontent.com/ugc/2003568586248198510/D6795EEC6F6F5D4DB9231A6C98D7599EF931A235/> |
| hud-toggle-assets | <http://cloud-3.steamusercontent.com/ugc/2045234494068024529/EE015A3D1682D520ADCA1E9E59F270F6D8169EA2/> |
| hud-toggle-symbols | <http://cloud-3.steamusercontent.com/ugc/2045234494068031561/05689BD488C6774F4EFC5685E7B96F09A7C3CEA3/> |
| ref-assets | <http://cloud-3.steamusercontent.com/ugc/2004695120348091840/58CAF322B6EA6B4AAE61A70B101F9B8D928CFB78/> |
| hud-toggle-ancillaeA | <http://cloud-3.steamusercontent.com/ugc/2045235128493293435/A0D8FD696B833596790E72BD506DE1AAA3F688B3/> |
| hud-toggle-ancillaeB | <http://cloud-3.steamusercontent.com/ugc/2045235128493294040/DD63E0E8386702F73C728449E4CD1E06DEF95334/> |
| hud-toggle-ancillaeC | <http://cloud-3.steamusercontent.com/ugc/2045235128493294653/E2E2EB19AB02BAEBE1EFCD6831AFCC8B3907AD28/> |
| ref-ancillaeA | <http://cloud-3.steamusercontent.com/ugc/2064377033375179274/C88F3A4D1C4DA5FFB1C67C68425F57F735CE45F5/> |
| ref-ancillaeB | <http://cloud-3.steamusercontent.com/ugc/2064376788717430046/14B3EE5F82067288E5106BF90D21FABAB001B5D8/> |
| ref-ancillaeC | <http://cloud-3.steamusercontent.com/ugc/2064377033375180815/1675B7DFAC4E385F1F34D11181C2098AA2D65DA7/> |
| hud-toggle-fourthRow | <http://cloud-3.steamusercontent.com/ugc/2045234494066820750/AFD85EF315521F1A943B642560A61D3766926235/> |
| ref-traits1 | <http://cloud-3.steamusercontent.com/ugc/2064377033360654407/41B7F83F5F3F631EC2410FB0740E653130930A2E/> |
| ref-traits2 | <http://cloud-3.steamusercontent.com/ugc/2064377033354727557/A4C60009C72E242F0FA58B54F52A49B9C4E9E788/> |
| ref-traits3 | <http://cloud-3.steamusercontent.com/ugc/2064377033360637630/8C630EE235E2740BDC02C1AE4960699307E7B28C/> |
| hud-toggle-ancillaeD | <http://cloud-3.steamusercontent.com/ugc/2045235128493295304/886CDA1A2C62EA2B9D31BC2735236C60250848F9/> |
| hud-toggle-ancillaeE | <http://cloud-3.steamusercontent.com/ugc/2045235128493295955/DE06047590E85D440FF4B2AA7C077C40C7B2BF17/> |
| hud-toggle-traits2 | <http://cloud-3.steamusercontent.com/ugc/2045235128493297922/3D7DCFD9FE97E015F80734011358B450550FED88/> |
| hud-toggle-traits3 | <http://cloud-3.steamusercontent.com/ugc/2045235128493298532/C70654F304CEE49B6EB8C74C006DEC10330E4DEA/> |
| ref-ancillaeD | <http://cloud-3.steamusercontent.com/ugc/2064377033356282320/E571D758E290CCDF67B0BED7DA514A3B740E8FCF/> |
| ref-ancillaeE | <http://cloud-3.steamusercontent.com/ugc/2064377033375182297/7BBC49F6B55B57A726297E60ECFCC0C1DB1E7931/> |

---

## King's Dilemma (turn, splash, fetcher) — 12 assets

| Name | URL |
| ----- | ----- |
| button-bg | <http://cloud-3.steamusercontent.com/ugc/2064379389811000691/6ABB5E8A5EF4321E502A58D047926A1C4706DFA7/> |
| splash-bg | <http://cloud-3.steamusercontent.com/ugc/2064379389815179280/6BEEECD9F070C5836F4A00B1B8D3797C0AB25B61/> |
| splash-border-above | <http://cloud-3.steamusercontent.com/ugc/2065505853651874078/0D42EF4D6C5B8D0D925FB3B051E23B3A70A18578/> |
| splash-border-under | <http://cloud-3.steamusercontent.com/ugc/2065505853651874909/E7C919F2381584C9AB468D8FB47D5A75F804F5C5/> |
| powerIcon | <http://cloud-3.steamusercontent.com/ugc/2064379389801246528/31B31077CA10B52D19392FAC8A3D8002AAD99F86/> |
| moderatorIcon | <http://cloud-3.steamusercontent.com/ugc/2064379389811002692/CD5474F38F62DC4FD74FB3AF9846CB09EF46F316/> |
| fetch-sticker-bg | <http://cloud-3.steamusercontent.com/ugc/2065505853652014489/F0E00560F3E338141A238CC4BA55A71E313C1023/> |
| fetch-sticker-border | <http://cloud-3.steamusercontent.com/ugc/2065505853652015222/601BB901B42EC5DDF866964B5DE136BB7C95ED20/> |
| fetch-sticker-icon | <http://cloud-3.steamusercontent.com/ugc/2065505853652016299/CBC1CF2CD7ED7B9B38CAD2B143D284624ED6056B/> |
| fetch-envelope-bg | <http://cloud-3.steamusercontent.com/ugc/2065505853652017067/F64C01C9BF12D896EC1E662BA620B4326A2B95D4/> |
| fetch-envelope-border | <http://cloud-3.steamusercontent.com/ugc/2065505853652017610/9F39FF8C708FB8763A37E9FC7F6594976A2A3722/> |
| fetch-envelope-icon | <http://cloud-3.steamusercontent.com/ugc/2065505853652019205/11937C729F3FE3AC5177B8B9929DB4963FFAF52D/> |

---

**Total: 65 assets.** House grid images use direct Steam Cloud URLs in XML and do not need Custom UI Asset entries.
