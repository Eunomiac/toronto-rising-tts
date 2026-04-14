## Table of Contents

* Member Variables
* Function Summary
* Function Details
  * getCurrentAudioclip()
  * getPlaylist()
  * pause()
  * play()
  * setCurrentAudioclip(...)
  * setPlaylist(...)
  * skipBack()
  * skipForward()

# Music Player

`MusicPlayer` is a static global class which allows you to control the in-game music playback i.e. the in-game "Music" menu.

## Member Variables {#member-variables}

|Variable|Description|Type|
|---|---|---|
|loaded|If all players loaded the current audioclip. Read only.|` boolean `|
|player_status|The current state of the music player. Read only. Options: "Stop", "Play", "Loading", "Ready".|` string `|
|playlistIndex|` deprecated ` Use [playlist_index](#playlist_index). Current index of the playlist. `-1` if no playlist audioclip is playing.|` int `|
|playlist_index|Current index of the playlist. `-1` if no playlist audioclip is playing.|` int `|
|repeat_track|If the current audioclip should be repeated.|` boolean `|
|shuffle|If the playlist should play shuffled.|` boolean `|

## Function Summary {#function-summary}

Functions that interact with the in-game music player.

|Function Name|Description|Return| |
|---|---|---|---|
|getCurrentAudioclip()|Gets the currently loaded audioclip.|return ` table `|[#getcurrentaudioclip](#getcurrentaudioclip)|
|getPlaylist()|Gets the current playlist.|return ` table `|[#getplaylist](#getplaylist)|
|pause()|Pauses currently playing audioclip. Returns true if the music player is paused, otherwise returns false.|return ` boolean `|[#pause](#pause)|
|play()|Plays currently loaded audioclip. Returns true if the music player is playing, otherwise returns false.|return ` boolean `|[#play](#play)|
|setCurrentAudioclip()|Sets the audioclip to be loaded.|return ` boolean `|[#setcurrentaudioclip](#setcurrentaudioclip)|
|setPlaylist()|Sets the current playlis| | |
|skipBack()|Skips to the beginning of the audioclip or if the play time is less than 3 seconds to the previous audioclip in playlist if possible. Returns true if skip was successful, otherwise returns false.|return ` boolean `|[#skipback](#skipback)|
|skipForward()|Skips to the next audioclip in playlist if possible. Returns true if skip was successful, otherwise returns false.|return ` boolean `|[#skipforward](#skipforward)|

## Function Details {#function-details}

### getCurrentAudioclip() {#getcurrentaudioclip}

[../types/](../types/)Gets the currently loaded audioclip.
> **Info: Returned table**
>
> * [../types/](../types/)Table describing the current audioclip.
>
> * [../types/](../types/) **url**: The URL of the current audioclip.
> * [../types/](../types/) **title**: The title of the current audioclip.
> * [../types/](../types/) **url**: The URL of the current audioclip.
> * [../types/](../types/) **title**: The title of the current audioclip.
> **Example: Example**
> Print the title of the current audioclip.
>
> ```lua
> local clip = MusicPlayer.getCurrentAudioclip()
> print("Currently playing '".. clip.title.. "'")
> ```
>
> ```lua
> local clip = MusicPlayer.getCurrentAudioclip()
> print("Currently playing '".. clip.title.. "'")
> ```

---

#### getPlaylist() {#getplaylist}

[../types/](../types/)Gets the current playlist.
> **Info: Returned table**
>
> * [../types/](../types/)Playlist table, consisting of zero or more audioclip sub-tables.
>
> * [../types/](../types/)Sub-table describing each audioclip.
>
> * [../types/](../types/) **url**: The URL of the current audioclip.
> * [../types/](../types/) **title**: The title of the current audioclip.
> * [../types/](../types/)Sub-table describing each audioclip.
>
> * [../types/](../types/) **url**: The URL of the current audioclip.
> * [../types/](../types/) **title**: The title of the current audioclip.
> * [../types/](../types/) **url**: The URL of the current audioclip.
> * [../types/](../types/) **title**: The title of the current audioclip.
> **Example: Example**
> Print the track number and title of each audioclip making up the playlist.
>
> ```lua
> local playlist = MusicPlayer.getPlaylist()
> for i, clip in ipairs(playlist) do
> print(i.. " - ".. clip.title)
> end
> ```
>
> ```lua
> local playlist = MusicPlayer.getPlaylist()
> for i, clip in ipairs(playlist) do
> print(i.. " - ".. clip.title)
> end
> ```

---

#### pause() {#pause}

[../types/](../types/)Pause the current audioclip.
Returns ` true ` if the music player is/was paused, otherwise ` false `.
> **Example: Example**
> Pause the current track.
>
> ```lua
> MusicPlayer.pause()
> ```
>
> ```lua
> MusicPlayer.pause()
> ```

---

#### play() {#play}

[../types/](../types/)Plays the current audioclip.
Returns ` true ` if the music player is/was playing, otherwise ` false `.
> **Example: Example**
> Play the current track.
>
> ```lua
> MusicPlayer.play()
> ```
>
> ```lua
> MusicPlayer.play()
> ```

---

#### setCurrentAudioclip(...) {#setcurrentaudioclip}

[../types/](../types/).Sets/loads the specified audioclip.
> **Info: setCurrentAudioclip(parameters)**
>
> * [../types/](../types/) **parameters**: A table describing an audioclip.
>
> * [../types/](../types/) **url**: The URL of the audioclip.
> * [../types/](../types/) **title**: The title of the audioclip.
> * [../types/](../types/) **url**: The URL of the audioclip.
> * [../types/](../types/) **title**: The title of the audioclip.
> **Example: Example**
> Set the current track.
>
> ```lua
> MusicPlayer.setCurrentAudioclip({
> url = "https://domain.example/path/to/clip.mp3",
> title = "Example"
> })
> ```
>
> ```lua
> MusicPlayer.setCurrentAudioclip({
> url = "https://domain.example/path/to/clip.mp3",
> title = "Example"
> })
> ```

---

#### setPlaylist(...) {#setplaylist}

[../types/](../types/)Sets the current playlist.
> **Info: setPlaylist(parameters)**
>
> * [../types/](../types/) **parameters**: A table containing zero or more audioclip sub-tables.
>
> * [../types/](../types/)Sub-table describing each audioclip.
>
> * [../types/](../types/) **parameters.url**: The URL of an audioclip.
> * [../types/](../types/) **parameters.title**: The title of an audioclip.
> * [../types/](../types/)Sub-table describing each audioclip.
>
> * [../types/](../types/) **parameters.url**: The URL of an audioclip.
> * [../types/](../types/) **parameters.title**: The title of an audioclip.
> * [../types/](../types/) **parameters.url**: The URL of an audioclip.
> * [../types/](../types/) **parameters.title**: The title of an audioclip.
> **Example: Example**
> Set the current playlist to include three pieces of music.
>
> ```lua
> MusicPlayer.setCurrentAudioclip({
> {
> url = "https://domain.example/path/to/clip.mp3",
> title = "Example"
> },
> {
> url = "https://domain.example/path/to/clip2.mp3",
> title = "Example #2"
> },
> {
> url = "https://domain.example/path/to/clip3.mp3",
> title = "Example #3"
> }
> })
> ```
>
> ```lua
> MusicPlayer.setCurrentAudioclip({
> {
> url = "https://domain.example/path/to/clip.mp3",
> title = "Example"
> },
> {
> url = "https://domain.example/path/to/clip2.mp3",
> title = "Example #2"
> },
> {
> url = "https://domain.example/path/to/clip3.mp3",
> title = "Example #3"
> }
> })
> ```

---

#### skipBack() {#skipback}

[../types/](../types/)Skips to the beginning of the audioclip or if the play time is less than 3 seconds to the previous audioclip in playlist if possible.
Returns ` true ` if skip was successful, otherwise returns ` false `.
> **Example: Example**
> Skip backwards to either the beginning of the audioclip, or the prior audioclip in the playlist.
>
> ```lua
> MusicPlayer.skipBack()
> ```
>
> ```lua
> MusicPlayer.skipBack()
> ```

---

#### skipForward() {#skipforward}

[../types/](../types/)Skips to the next audioclip in the current playlist. If the current
audioclip is the last of the playlist, loops around to the first audioclip in the playlist.
Returns ` true ` if skip was successful, otherwise returns ` false `.
> **Example: Example**
> Skip to the next audioclip.
>
> ```lua
> MusicPlayer.skipForward()
> ```
>
> ```lua
> MusicPlayer.skipForward()
> ```

---
