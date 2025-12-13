# Manual Test Scenarios

Use these checks before shipping. They focus on the current auth, list creation, grouping, and claim flows.

## Account state
- Sign-out default: Load home signed out, confirm "Sign in to Create" shows; clicking opens auth dialog.
- Auth gate: Attempt to create a list while signed out; verify blocked and prompt shown.
- Sign in: Sign in, ensure "Create a List" button shows and My Lists page loads.

## Create list dialog
- Type-first: Open create dialog; verify type must be selected before other fields appear.
- Gift type: Select Gift, fill title/description, optionally set group name and create; ensure success.
- Potluck type: Select Potluck; confirm group fields stay hidden; create succeeds.
- Group reuse: In Gift mode, paste a share code from an existing grouped list, click "Use group," and confirm group name is populated.

## Gift list behavior
- Ownership add: Owner can add items to gift list; non-owner from share link does not see Add Item section.
- Claims hidden from owner: Owner viewing their gift list does not see claim status; other signed-in viewer sees claims.
- Claim auth: Signed-out viewer sees sign-in prompt above items; clicking claim opens auth dialog and blocks action until signed in.
- Back link: Signed-out viewer from a group link sees back-to-group link on list header; signed-in user sees My Lists.

## Potluck/event behavior
- Add/edit: Any signed-in viewer can add items to a potluck list and edit/delete their own items (or owner edits any).
- Claims visible: Claims are visible to all viewers.

## Groups
- Group link uniqueness: Create a gift list with a group; confirm group page URL uses group code, not the plain name.
- Group page anon: Open `/group/{code}` while signed out; no back link is shown.
- Join/Leave: On group page, click Join/Leave and confirm My List Groups section shows/hides the group accordingly.
- My List Groups: On My Lists, verify grouped lists and joined groups appear with links using group code.

## Sharing
- Share list: Copy share code/link, open in private window; list loads, enforces gift restrictions.
- Share group: Copy group link from group page, open in private window; group lists render; navigating to a list preserves gift rules.

## Firestore rules sanity (spot checks)
- Signed-out create blocked: Attempt create (e.g., via UI) while signed out; should fail.
- Claim blocked when signed out: Attempt claim while signed out; should be blocked until sign-in.
- Signed-in owner can edit/update list and items; non-owner cannot delete list.

## Regression smoke
- Home join-by-code: Enter valid share code, navigates to list; invalid shows error toast.
- My Lists: Signed-in user sees their lists, can delete; signed-out sees sign-in prompt.
- Auth dialog: Google and email flows render without console errors (no need to complete OAuth in manual test).*** End Patch**িয়**
