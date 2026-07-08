# External Config Access Note

The user has explicitly allowed Codex to read private/local agent and editor configuration exposed through `.external-agent-config/` for the purpose of auditing global rules and agent instructions.

Operational boundary:

- Reading local config, rules, skills, prompts, and related settings is allowed.
- Avoid copying secrets, API keys, tokens, session contents, or database dumps into reports or chat unless the user specifically asks and it is necessary.
- Prefer summarizing sensitive-adjacent findings by file/path and purpose rather than reproducing secret values.
