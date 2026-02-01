# SOP-005 Convergence Ladder (stop fix-break-fix)

Goal: converge fast, avoid random patch loops.

0) Repro: single cmd that fails (copy/paste runnable)
1) Localize: failing file/line/test
2) Hypothesis: 1 root cause
3) Patch: minimal diff
4) Verify: rerun failing cmd + 1 nearby test
Stop rules:
- 2 failed patches -> switch mode:
  A) harness problem
  B) spec/contract mismatch
  C) missing repro
Escalate with a DECISION PANEL.
