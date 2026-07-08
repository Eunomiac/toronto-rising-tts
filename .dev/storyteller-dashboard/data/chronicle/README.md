# Chronicle context (vector store)

## Agent Routing

Read this when:
- configuring chronicle retrieval for `.dev/storyteller-dashboard`
- deciding whether local files in this folder affect dashboard NPC generation

Source of truth:
- OpenAI vector store named by `OPENAI_VECTOR_STORE_ID`
- `.dev/storyteller-dashboard/.env`
- `.dev/storyteller-dashboard/README.md`

Verification:
- restart dashboard after changing `OPENAI_VECTOR_STORE_ID`
- `GET /api/health` reports vector-store status

Chronicle knowledge for this dashboard is **not** read from this folder. Upload your Toronto Rising chronicle files (Markdown, JSON, etc.) to an OpenAI vector store and set `OPENAI_VECTOR_STORE_ID` in `.env`.
