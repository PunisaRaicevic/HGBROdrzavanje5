---
name: Shared operator return queue
description: Business ownership rule for tasks that workers return to operators.
---

Tasks in `returned_to_operator` belong to a shared operator queue. Any authenticated user with the operator role may perform the final “not executed because there were no conditions” return; do not require a matching individual operator owner.

**Why:** The business rule assigns this responsibility to the operator role as a group, and the existing return flow does not assign an individual operator before the task re-enters the operator queue.

**How to apply:** Enforce the operator role, the exact source status, a required reason, and an atomic transition. Revisit individual ownership only if the product later introduces explicit operator assignment for returned tasks.