# SOP-006 Test Selection (speed)

Default loop:
- run the **one failing** test (grep/target)
- then run **fast suite** if it exists
Full suite only when:
- integration boundary changed
- release/demo gate
- prior failures suggest hidden coupling
Evidence can be: console output + file path.
