# .agent-workflow (agentic SDLC v4)

Core: slice-first + contract-first + evidence + low operator load.

Keep hot (RAM)
- `progress_summary.md` (state of truth)

Keep cold (disk)
- `archive/` (raw logs, screenshots, diffs)

Key files
- `Conversation_Policy.md` (clarify floor + confidence bypass + decision panels)
- `09_MASTER_AGENT_PROMPT_SISYPHUS.md`
- `WorkGraph.json` (tasks + allowed_paths + lock)
- `scratchpad.md` (interface contract; must be SIGNED before code)
- `PRD.json` (acceptance tests; passes=true needs evidence)
- `PRESETS.md` + `presets/` (incl. spike)

Logging rule  <!-- Sisyphus Audit: Context Bloat -->
- `Progress.txt` is ephemeral; archive + prune every slice.
