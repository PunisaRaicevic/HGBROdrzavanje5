---
name: Nested Radix modal focus trap
description: Why secondary AlertDialog/Dialog (especially with inputs) must render as siblings, not nested inside another open Dialog
---

A Radix `AlertDialog`/`Dialog` that contains a focusable input (e.g. `Textarea`) must NOT be rendered inside the JSX tree of another open Radix `Dialog`. The parent Dialog's FocusScope can trap focus so the inner input cannot be typed into — the dialog appears open but the field is uneditable, so required-field validation always fails and the feature looks "dead".

**Why:** In TaskDetailsDialog the reject flow (reason `Textarea` in an AlertDialog) was nested inside the task `<Dialog>`. Trigger opened the dialog but the reason could not be typed, so confirm hit the "razlog obavezan" guard every time. A delete AlertDialog in the same spot worked only because it has no text input.

**How to apply:** Wrap the component return in a fragment and place secondary dialogs (and modals like image preview) as siblings AFTER `</Dialog>`, not between `<Dialog>` and `</Dialog>`. They are portaled anyway and stay controlled by the same state, but escape the parent focus scope.
