# Chronicle Markdown Context

Place your Toronto Rising chronicle Markdown files in this folder (or nested folders) when you are ready to let the dashboard use them as generation context.

Recommended layout:

```text
data/chronicle/
  setting.md
  player-characters.md
  important-npcs.md
  factions.md
  locations.md
  mysteries.md
  tone.md
```

The MVP reads `.md` files from this folder at request time and sends a bounded context bundle to the server-side OpenAI Responses API call. This is intentionally simple and local-first; a later iteration can replace this with OpenAI file search/vector stores or a local embedding index without changing the UI contract.

Do not put API keys or private machine secrets in these Markdown files.
