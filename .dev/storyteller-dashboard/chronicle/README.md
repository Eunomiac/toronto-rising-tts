# Chronicle Markdown Context

Place chronicle knowledge files here as Markdown (`.md`) when you are ready to import the Custom GPT source notes.

Recommended files:

- `setting.md`
- `player-characters.md`
- `important-npcs.md`
- `factions.md`
- `locations.md`
- `plot-threads.md`
- `mysteries.md`
- `tone.md`

MVP behavior:

1. If `OPENAI_VECTOR_STORE_ID` is blank, the server reads local `.md` files in this folder and injects them into NPC generation prompts, up to a conservative character cap.
2. If `OPENAI_VECTOR_STORE_ID` is set, the server enables the OpenAI Responses API `file_search` tool against that vector store instead.
3. Do not put secrets in these files. They are chronicle context, not configuration.

Future RAG upgrade path:

- Upload these Markdown files to an OpenAI vector store.
- Set `OPENAI_VECTOR_STORE_ID` in `.env`.
- Restart the dashboard server.
