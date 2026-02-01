# Workflow Isolation Protocol

When running multiple parallel workflows (e.g., frontend + backend simultaneously), use folder-based isolation to prevent log bottlenecks and merge conflicts.

---

## Directory Structure

```
.agent-workflow/
├── workflows/
│   ├── {workflow-id}/
│   │   ├── Progress.txt        # Workflow-specific log (ephemeral; archive+prune)
│   │   ├── WorkGraph.json      # Workflow-specific tasks (optional)
│   │   └── context.md          # Workflow context/goals
│   ├── wf-frontend-ui/
│   │   ├── Progress.txt
│   │   └── context.md
│   └── wf-backend-secure/
│       ├── Progress.txt
│       └── context.md
├── Progress.txt                 # Main log (merged from workflows)
├── WorkGraph.json               # Master task graph
└── ...
```

---

## Workflow Lifecycle

### 1. Create Workflow
When starting isolated work:

```bash
mkdir -p .agent-workflow/workflows/wf-{name}
```

**context.md template:**
```markdown
# Workflow: wf-{name}
Created: [date]
Owner: [agent]
Parent slice: [slice name or "independent"]

## Goals
- [goal 1]
- [goal 2]

## Scope (allowed_paths)
- path/to/files/
- another/path/

## Exit criteria
- [ ] [criterion 1]
- [ ] [criterion 2]

## Dependencies
- Blocked by: [WG-XXX or "none"]
- Blocks: [WG-YYY or "none"]
```

### 2. Work Within Workflow
Agents working in an isolated workflow:
- Write to `workflows/{id}/Progress.txt` (not root Progress.txt)
- Reference workflow ID in all commits/messages: `[wf-{name}]`
- Stay within declared `allowed_paths`

### 3. Merge Workflow
When workflow completes:

```bash
# Append to main Progress.txt
echo "## Workflow Merge: wf-{name}" >> .agent-workflow/Progress.txt
cat .agent-workflow/workflows/wf-{name}/Progress.txt >> .agent-workflow/Progress.txt

# Archive
mv .agent-workflow/workflows/wf-{name} .agent-workflow/workflows/archived/
```

---

## Workflow Naming Convention

| Prefix | Meaning | Example |
|--------|---------|---------|
| `wf-frontend-` | Frontend work | `wf-frontend-note-import` |
| `wf-backend-` | Backend/contract work | `wf-backend-secure-borrow` |
| `wf-infra-` | Infrastructure/tooling | `wf-infra-ci-setup` |
| `wf-research-` | Research/spike | `wf-research-zk-alternatives` |
| `wf-hotfix-` | Urgent fix | `wf-hotfix-tx-size` |

---

## Collision Rules

1. **One agent per workflow**: A workflow is owned by one agent at a time.
2. **No cross-workflow edits**: Agents must not edit files outside their workflow's `allowed_paths`.
3. **Sync via orchestrator**: If workflow A needs something from workflow B, request via `@sisyphus`.
4. **Merge before handoff**: Complete workflows must be merged before another agent continues.

---

## Operator Commands

| Command | Effect |
|---------|--------|
| `/workflow create {name}` | Create new workflow folder |
| `/workflow list` | Show active workflows |
| `/workflow merge {name}` | Merge workflow to main Progress.txt |
| `/workflow delete {name}` | Delete workflow (requires confirmation) |
