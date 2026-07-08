# Imported Audio Files by Category

## Agent Routing

Read this when:
- adding, renaming, or removing soundscape effect names in Unity or Lua
- checking track category, loop/trigger classification, import settings, or exact effect-name casing

Source of truth:
- this inventory for authored effect names and import guidance
- `lib/soundscape_catalog.ttslua` for runtime catalog keys and categories
- `.dev/Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md` for AssetBundle authoring workflow

Verification:
- `npm run build`
- keep Unity effect names exactly aligned with `lib/soundscape_catalog.ttslua`
- rebuild the AssetBundle after Unity catalog changes

## Unity Import Recommendation Notes

- For looped `.mp3` files, preconversion is recommended only because MP3 encoder delay can create tiny loop gaps. Convert from the best available source to `WAV 44.1kHz/16-bit PCM`, and trim the loop seam if needed before importing into Unity.
- For non-looping `.mp3` and `.ogg` music, no preconversion is necessary.
- Unity does not reliably use `.flac` as a TTS AssetBundle source format, so convert `.flac` files to `WAV 44.1kHz/16-bit PCM` before import.
- Blank **Compression Format** means leave Unity's default compression setting alone. In practice, this is usually Unity's compressed/Vorbis-style setting for standalone builds.
- **Preload Audio Data** is disabled for large on-demand playlists to avoid loading the whole soundscape catalog into memory at mod load. It is enabled for weather loops and very short thunder hits where immediate playback matters.
- **Effect List** means the `TTS Asset Bundle Effects` list where the clip belongs. Use **Looping Effects** for sustained/seamless loops and **Trigger Effects** for clips that play once and end naturally.

## Silent Track

The silent track is a 1-second silent audio file named `silent.wav`. It is used to stop all audio channels when the soundscape system is not in use.

| Effect Name   | Effect List     | Name         |    Size | Duration | isLoop | Preconvert | Load Type            | Compression Format | Preload Audio Data |
| ------------- | --------------- | ------------ | ------: | -------: | :----: | ---------- | -------------------- | ------------------ | ------------------ |
| silent        | Looping Effects | silent.wav   | 0.00 MB |     0:01 |  true  |            | Compressed In Memory |                    | Enabled            |

## Ambient Audio

Ambient audio is the location-based immersive background audio that plays over every scene and at all times. Ambient audio is generally determined by the Site at which the current scene is taking place. Each of the tracks below is meant to be looped until a different track is selected or triggered by movement to a different Site.

| Effect Name    | Effect List     | Name                 |    Size | Duration | isLoop | Preconvert                            | Load Type            | Compression Format | Preload Audio Data |
| -------------- | --------------- | -------------------- | ------: | -------: | :----: | ------------------------------------- | -------------------- | ------------------ | ------------------ |
| airport        | Looping Effects | Airport.mp3          | 5.76 MB |     4:07 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| church         | Looping Effects | Church.mp3           | 5.45 MB |     3:53 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| cityChatter    | Looping Effects | CityChatter.mp3      | 6.09 MB |     4:16 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| cityPark       | Looping Effects | CityPark.mp3         | 4.80 MB |     3:40 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| cityRevelers   | Looping Effects | CityRevelers.mp3     | 3.82 MB |     2:38 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| citySuburb     | Looping Effects | CitySuburb.mp3       | 4.43 MB |     3:13 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| cityTraffic    | Looping Effects | CityTraffic.mp3      | 4.89 MB |     3:59 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| cityWalking    | Looping Effects | CityWalking.mp3      | 5.08 MB |     3:44 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| crickets       | Looping Effects | Crickets.mp3         | 1.07 MB |     0:44 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| diveBar        | Looping Effects | DiveBar.mp3          | 3.51 MB |     2:35 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| eerieForest    | Looping Effects | EerieForest.mp3      | 2.69 MB |     2:01 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| fastClock      | Looping Effects | FastClock.mp3        | 2.04 MB |     1:59 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| fireplace      | Looping Effects | Fireplace.mp3        | 1.56 MB |     1:03 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| hospital       | Looping Effects | Hospital.mp3         | 3.13 MB |     2:27 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| indoorMarket   | Looping Effects | IndoorMarket.mp3     | 4.54 MB |     3:20 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| industry       | Looping Effects | Industry.mp3         | 6.62 MB |     4:36 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| lowWindAmbient | Looping Effects | LowWindAmbient.mp3   | 2.37 MB |     1:52 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| medicalClinic  | Looping Effects | MedicalClinic.mp3    | 2.17 MB |     1:50 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| nightclub      | Looping Effects | Nightclub.mp3        | 5.98 MB |     4:37 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| office         | Looping Effects | Office.mp3           | 2.46 MB |     2:01 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| quietCity      | Looping Effects | QuietCity.mp3        | 1.60 MB |     0:53 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| roofTop        | Looping Effects | RoofTop.mp3          | 4.04 MB |     3:02 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| sewers         | Looping Effects | Sewers.mp3           | 2.92 MB |     2:10 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| softHum        | Looping Effects | SoftHum.mp3          | 3.40 MB |     4:01 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| softIndoor     | Looping Effects | SoftIndoor.mp3       | 5.42 MB |     4:00 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| subway         | Looping Effects | Subway.mp3           | 4.25 MB |     3:23 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| tinkle         | Looping Effects | TinkleAmbient.mp3    | 1.01 MB |     0:42 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| urbanDark      | Looping Effects | UrbanDark.mp3        | 2.22 MB |     2:00 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| waterside      | Looping Effects | Waterside.mp3        | 5.69 MB |     4:00 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| whisperGhosts  | Looping Effects | WhisperingGhosts.mp3 | 1.62 MB |     1:13 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |

## Music

Music will be played simultaneously with Ambient and Weather audio. There are two broad categories of music:

- **Background Music**: This is the ambient music that plays over every scene and at all times, unless Featured Music is playing. Background Music is further divided into four sub-categories: Main, Combat, Intrigue, and Location. Each sub-category comprises a playlist containing multiple tracks. The individual tracks are not loops, rather the entire playlist is meant to be looped, with random/shuffled selection of tracks. Switching between sub-categories changes the playlist.
- **Featured Music**: This is the music that plays during specific scenes or events. Featured Music is further divided into two sub-categories: the *Toronto Rising* theme song, and performances by "Scarlett & the Boys", a coterie of in-game musicians. Unless looped, when a Feature Music track is stopped, the Background Music will resume playing.

### Background Music: Main

These tracks comprise the main/default background music.

| Effect Name   | Effect List     | Name                               |   Size   | Duration | isLoop | Preconvert | Load Type | Compression Format | Preload Audio Data |
| ------------- | --------------- | ---------------------------------- | -------: | -------: | :----: | ---------- | --------- | ------------------ | ------------------ |
|  pt1          | Trigger Effects | PT_1_A Plague Tale.mp3             |  2.86 MB |     2:16 |  false |            | Streaming |                    | Disabled           |
|  pt2          | Trigger Effects | PT_2_Father.mp3                    |  3.71 MB |     2:36 |  false |            | Streaming |                    | Disabled           |
|  pt3          | Trigger Effects | PT_3_Grieving.mp3                  |  4.57 MB |     3:13 |  false |            | Streaming |                    | Disabled           |
|  pt4          | Trigger Effects | PT_4_In Shock.mp3                  |  2.32 MB |     1:39 |  false |            | Streaming |                    | Disabled           |
|  pt5A         | Trigger Effects | PT_5A_The Inquisition.mp3          |  4.06 MB |     2:55 |  false |            | Streaming |                    | Disabled           |
|  pt7          | Trigger Effects | PT_7_Strangers.mp3                 |  3.25 MB |     2:21 |  false |            | Streaming |                    | Disabled           |
|  pt9          | Trigger Effects | PT_9_Big Sister.mp3                |  2.27 MB |     1:38 |  false |            | Streaming |                    | Disabled           |
|  pt12         | Trigger Effects | PT_12_Together Forever.mp3         |  3.11 MB |     2:16 |  false |            | Streaming |                    | Disabled           |
|  pt14         | Trigger Effects | PT_14_Little Brother.mp3           |  2.27 MB |     1:39 |  false |            | Streaming |                    | Disabled           |
|  pt15         | Trigger Effects | PT_15_By the River.mp3             |  2.95 MB |     2:00 |  false |            | Streaming |                    | Disabled           |
|  pt16         | Trigger Effects | PT_16_Massacre.mp3                 |  4.27 MB |     3:12 |  false |            | Streaming |                    | Disabled           |
|  pt17A        | Trigger Effects | PT_17A_Prisoners.mp3               |  1.96 MB |     1:27 |  false |            | Streaming |                    | Disabled           |
|  pt19         | Trigger Effects | PT_19_The Shelter.mp3              |  3.97 MB |     3:01 |  false |            | Streaming |                    | Disabled           |
|  pt20         | Trigger Effects | PT_20_Exodus.mp3                   |  2.75 MB |     1:55 |  false |            | Streaming |                    | Disabled           |
|  pt21         | Trigger Effects | PT_21_The Son of a Blacksmith.mp3  |  2.34 MB |     1:40 |  false |            | Streaming |                    | Disabled           |
|  pt22         | Trigger Effects | PT_22_She Is Alive.mp3             |  2.44 MB |     1:45 |  false |            | Streaming |                    | Disabled           |
|  pt24A        | Trigger Effects | PT_24A_Reunited.mp3                |  2.39 MB |     1:43 |  false |            | Streaming |                    | Disabled           |
|  pt25         | Trigger Effects | PT_25_I'm Sorry.mp3                |  2.22 MB |     1:34 |  false |            | Streaming |                    | Disabled           |
|  pt27         | Trigger Effects | PT_27_Bedtime Story.mp3            |  3.60 MB |     2:33 |  false |            | Streaming |                    | Disabled           |
|  pt28         | Trigger Effects | PT_28_Deceiving Appearances.mp3    |  2.08 MB |     1:25 |  false |            | Streaming |                    | Disabled           |
|  pt29         | Trigger Effects | PT_29_No Turning Back.mp3          |  3.33 MB |     2:17 |  false |            | Streaming |                    | Disabled           |
|  pt30         | Trigger Effects | PT_30_Sacrifice.mp3                |  2.25 MB |     1:34 |  false |            | Streaming |                    | Disabled           |
|  pt31         | Trigger Effects | PT_31_Sister's Love.mp3            |  1.56 MB |     1:12 |  false |            | Streaming |                    | Disabled           |
|  pt32         | Trigger Effects | PT_32_The Alchemy.mp3              |  3.93 MB |     2:51 |  false |            | Streaming |                    | Disabled           |
|  pt34         | Trigger Effects | PT_34_The Plague.mp3               |  1.78 MB |     1:17 |  false |            | Streaming |                    | Disabled           |
|  pt35         | Trigger Effects | PT_35_The Night Before Leaving.mp3 |  5.65 MB |     4:27 |  false |            | Streaming |                    | Disabled           |
|  pt36         | Trigger Effects | PT_36_They Don't Know.mp3          |  2.08 MB |     1:23 |  false |            | Streaming |                    | Disabled           |
|  pt37         | Trigger Effects | PT_37_Freedom.mp3                  |  3.80 MB |     3:03 |  false |            | Streaming |                    | Disabled           |

### Background Music: Combat

These tracks comprise the combat background music.

| Effect Name   | Effect List     | Name                | Size    | Duration | isLoop | Preconvert | Load Type | Compression Format | Preload Audio Data |
| ------------- | --------------- | ------------------- | ------: | -------: | :----: | ---------- | --------- | ------------------ | ------------------ |
|  pt8          | Trigger Effects | PT_8_Escape.mp3     | 2.04 MB |     1:28 |  false |            | Streaming |                    | Disabled           |
|  pt13         | Trigger Effects | PT_13_The Rats.mp3  | 1.47 MB |     1:06 |  false |            | Streaming |                    | Disabled           |
|  pt24B        | Trigger Effects | PT_24B_Reunited.mp3 | 3.42 MB |     2:25 |  false |            | Streaming |                    | Disabled           |

### Background Music: Intrigue

These tracks comprise the intrigue background music.

| Effect Name   | Effect List     | Name                      | Size    | Duration | isLoop | Preconvert | Load Type | Compression Format | Preload Audio Data |
| ------------- | --------------- | ------------------------- | ------: | -------: | :----: | ---------- | --------- | ------------------ | ------------------ |
|  pt5B         | Trigger Effects | PT_5B_The Inquisition.mp3 | 2.17 MB |     1:30 |  false |            | Streaming |                    | Disabled           |
|  pt6          | Trigger Effects | PT_6_Orphans.mp3          | 2.82 MB |     2:01 |  false |            | Streaming |                    | Disabled           |
|  pt10         | Trigger Effects | PT_10_The Killing.mp3     | 1.95 MB |     1:25 |  false |            | Streaming |                    | Disabled           |
|  pt11         | Trigger Effects | PT_11_Adulthood.mp3       | 2.49 MB |     1:45 |  false |            | Streaming |                    | Disabled           |
|  pt17B        | Trigger Effects | PT_17B_Prisoners.mp3      | 2.47 MB |     1:46 |  false |            | Streaming |                    | Disabled           |

### Background Music: Location

These tracks are linked to specific locations in the game world, specifically to Sites. When a scene takes place at a Site that defines a location playlist, that playlist will serve as the Background Music for that scene instead of the generic playlists described above. (It should still be possible to switch to one of the generic playlists if desired, for example if combat breaks out and we want to play the Combat background music.)

| Effect Name   | Effect List     | Site/Playlist     | Name                  | Size    | Duration | isLoop | Preconvert                            | Load Type            | Compression Format | Preload Audio Data |
| ------------- | --------------- | ----------------- | --------------------- | ------: | -------: | :----: | ------------------------------------- | -------------------- | ------------------ | ------------------ |
| casaLomaA     | Trigger Effects | CasaLoma          | Casa Loma Waltz A.mp3 | 5.66 MB |     4:32 |  false |                                       | Streaming            |                    | Disabled           |
| casaLomaB     | Trigger Effects | CasaLoma          | Casa Loma Waltz B.mp3 | 8.28 MB |     6:33 |  false |                                       | Streaming            |                    | Disabled           |
| casaLomaC     | Trigger Effects | CasaLoma          | Casa Loma Waltz C.mp3 | 8.04 MB |     6:13 |  false |                                       | Streaming            |                    | Disabled           |
| casaLomaD     | Trigger Effects | CasaLoma          | Casa Loma Waltz D.mp3 | 4.40 MB |     3:39 |  false |                                       | Streaming            |                    | Disabled           |
| casaLomaE     | Trigger Effects | CasaLoma          | Casa Loma Waltz E.mp3 | 6.91 MB |     5:30 |  false |                                       | Streaming            |                    | Disabled           |
| gioCatacombs  | Looping Effects | GiovanniCatacombs | Catacombs Loop.mp3    | 8.31 MB |     3:37 |   true | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Disabled           |
| gioEstateA    | Trigger Effects | GiovanniEstate    | Giovanni Music A.mp3  | 3.30 MB |     1:24 |  false |                                       | Streaming            |                    | Disabled           |
| gioEstateB    | Trigger Effects | GiovanniEstate    | Giovanni Music B.mp3  | 4.14 MB |     1:49 |  false |                                       | Streaming            |                    | Disabled           |
| gioEstateC    | Trigger Effects | GiovanniEstate    | Giovanni Music C.mp3  | 14.5 MB |     6:20 |  false |                                       | Streaming            |                    | Disabled           |

### Featured Music

Occasionally a scene will call for a specific piece of music to be played. Unlike background music, featured music is meant to be central to the soundscape of the scene. There are currently two categories of featured music: *Toronto Rising* theme song, and performances by "Scarlett & the Boys", a coterie of in-game musicians.

- **Toronto Rising Theme Song**: The theme song for *Toronto Rising* is fully contained in `Toronto Rising.flac`. Its introduction instrumental sequence has been extracted into `Toronto Rising Intro.flac` and the remainder of the song (which is loopable) has been extracted into `Toronto Rising Loop.flac`. This is to allow looping the theme song without playing the introduction sequence every time.
- **Scarlett & the Boys**: This is a coterie of in-game musicians who perform at various events throughout the city. Currently, the only piece of music available for them is `S&tB - House of the Rising Sun.ogg`, though I anticipate adding more in the future.

| Effect Name             | Effect List     | Name                               |    Size | Duration | isLoop | Preconvert                            | Load Type            | Compression Format | Preload Audio Data |
| ----------------------- | --------------- | ---------------------------------- | ------: | -------: | :----: | ------------------------------------- | -------------------- | ------------------ | ------------------ |
| TR_Full                 | Trigger Effects | Toronto Rising.flac                | 11.3 MB |     2:26 |  false | WAV 44.1kHz/16-bit PCM                | Streaming            |                    | Disabled           |
| TR_Intro                | Trigger Effects | Toronto Rising Intro.flac          | 2.08 MB |     0:32 |  false | WAV 44.1kHz/16-bit PCM                | Compressed In Memory |                    | Enabled            |
| TR_Loop                 | Looping Effects | Toronto Rising Loop.flac           | 9.13 MB |     1:53 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| STB_HouseOfTheRisingSun | Trigger Effects | S&tB - House of the Rising Sun.ogg | 5.02 MB |     4:35 |  false |                                       | Streaming            |                    | Disabled           |

## Weather Audio: Three Layers

Weather audio is somewhat more complex than initially planned. We want to be able to construct weather soundscapes using three separate layers: "Rain", "Wind", and "Thunder". All of these must be able to play one track each simultaneously, and all must be subject to the indoor/outdoor ducking factor

For example, to construct the soundscape for a thunderstorm, we might loop `RainHeavy.mp3` (from the "Rain" layer) and `WindMax.mp3` (from the "Wind" layer), while playing randomly-selected thunder tracks (from the "Thunder" layer) at random intervals.

### Layer One: Rain Loops

| Effect Name   | Effect List     | Name          |    Size | Duration | isLoop | Preconvert                            | Load Type            | Compression Format | Preload Audio Data |
| ------------- | --------------- | ------------- | ------: | -------: | :----: | ------------------------------------- | -------------------- | ------------------ | ------------------ |
| rainHeavy     | Looping Effects | RainHeavy.mp3 | 3.43 MB |     2:31 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| rainLight     | Looping Effects | RainLight.mp3 | 2.77 MB |     2:01 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |

### Layer Two: Wind Loops

| Effect Name   | Effect List     | Name              |    Size | Duration | isLoop | Preconvert                            | Load Type            | Compression Format | Preload Audio Data |
| ------------- | --------------- | ----------------- | ------: | -------: | :----: | ------------------------------------- | -------------------- | ------------------ | ------------------ |
| windLow       | Looping Effects | WindLow.mp3       | 5.45 MB |     4:10 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| windMax       | Looping Effects | WindMax.mp3       | 2.64 MB |     2:00 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| windMed       | Looping Effects | WindMed.mp3       | 3.41 MB |     2:41 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| windWinterLow | Looping Effects | WindWinterLow.mp3 | 3.17 MB |     2:23 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| windWinterMax | Looping Effects | WindWinterMax.mp3 | 2.69 MB |     2:00 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |
| windWinterMed | Looping Effects | WindWinterMed.mp3 | 2.69 MB |     2:04 |  true  | WAV 44.1kHz/16-bit PCM; trim loop gap | Compressed In Memory |                    | Enabled            |

### Layer Three: Thunder Hits

| Effect Name   | Effect List     | Name         |    Size | Duration | isLoop | Preconvert | Load Type          | Compression Format | Preload Audio Data |
| ------------- | --------------- | ------------ | ------: | -------: | :----: | ---------- | ------------------ | ------------------ | ------------------ |
| thunder1      | Trigger Effects | Thunder1.mp3 | 0.07 MB |     0:03 |  false |            | Decompress On Load | ADPCM              | Enabled            |
| thunder2      | Trigger Effects | Thunder2.mp3 | 0.06 MB |     0:03 |  false |            | Decompress On Load | ADPCM              | Enabled            |
| thunder3      | Trigger Effects | Thunder3.mp3 | 0.04 MB |     0:03 |  false |            | Decompress On Load | ADPCM              | Enabled            |
| thunder4      | Trigger Effects | Thunder4.mp3 | 0.06 MB |     0:03 |  false |            | Decompress On Load | ADPCM              | Enabled            |
