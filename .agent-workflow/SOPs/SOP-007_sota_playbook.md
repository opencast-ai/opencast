# SOP-007 SOTA Playbook (agentic SDLC v4)

Why: align workflow w/ what works in public SWE-agent systems.

Observed patterns → v4 mapping
- Eval harness + reproducible bugs (SWE-bench) → PRD acceptance_tests + evidence gate
- Agent-computer interface / constrained actions (SWE-agent) → `allowed_paths` + contract-first `scratchpad.md`
- Multi-agent role decomposition (MetaGPT) → Implementer/Test/Integrator/Adversarial separation
- Critic + inference-time scaling (OpenHands) → Adversarial Reviewer + stop rules + 2-patch ladder
- Context/memory mgmt → `progress_summary.md` (RAM) + `archive/` (disk)

Refs
- SWE-bench: https://www.swebench.com/
- SWE-agent (arXiv): https://arxiv.org/abs/2405.15793
- MetaGPT (arXiv): https://arxiv.org/abs/2308.00352
- OpenHands SOTA on SWE-bench Verified: https://www.all-hands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling
