# SOP-003 Delta State Archiving  <!-- Sisyphus Audit: Context Bloat -->

Active memory = `progress_summary.md`
Raw logs = `Progress.txt` (ephemeral)

On slice finish:
1) update `progress_summary.md` (Verified + Bugs + Next)
2) move raw logs to `.agent-workflow/archive/<ts>_<slice_id>/`
3) clear `Progress.txt`
