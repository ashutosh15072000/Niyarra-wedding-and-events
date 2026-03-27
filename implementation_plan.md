# Goal Description

The objective is to expand the Guest Model with a `description` (Notes) and `extra_bedding` field, updating the Add Guest forms to intake this data. Furthermore, the standalone [transport.html](file:///c:/Users/ayush/.gemini/antigravity/scratch/niyarra/frontend/transport.html) page will be entirely removed and replaced with a new `modification.html` page. This new operational hub will feature a "Department Role" selector (RSVP, Hotel, Transport/Logistics). When editing a guest from this page, the available fields in the Edit Modal will dynamically restrict themselves based on the active Department Role.

## Proposed Changes

### Database & Backend layer
#### [MODIFY] backend/models.py
- Add `description` (String) column to the [Guest](file:///c:/Users/ayush/.gemini/antigravity/scratch/niyarra/backend/models.py#4-36) model.
- Add `extra_bedding` (Boolean) column to the [Guest](file:///c:/Users/ayush/.gemini/antigravity/scratch/niyarra/backend/models.py#4-36) model.

#### [MODIFY] backend/schemas.py
- Add `description` (Optional[str]) and `extra_bedding` (Optional[bool]) to Pydantic schemas.

#### [NEW] backend/migrate7.py
- Create an SQLite migration script to safely run `ALTER TABLE guests ADD COLUMN description TEXT` and `ALTER TABLE guests ADD COLUMN extra_bedding BOOLEAN`.

---

### Frontend UI & Forms
#### [MODIFY] frontend/index.html
- Update the **Add Guest Form** to include a textarea for `description` and a checkbox/select for `extra_bedding`.
- Update the Navigation Bar: Remove the "Transport" link and replace it with a "Modifications" link pointing to `modification.html`.

#### [DELETE] frontend/transport.html
- Completely delete this file as requested to remove the legacy transport functionality.

#### [NEW] frontend/modification.html
- Create a new dashboard mirroring the guest list but featuring a top-level **Department Selector**:
  - `RSVP Department (Admin)`
  - `Hotel Department`
  - `Transport/Logistics Department`
- Include the standard Guest Table, but heavily customize the Edit Modal trigger.

#### [MODIFY] frontend/app.js
- Update [handleAddGuest](file:///c:/Users/ayush/.gemini/antigravity/scratch/niyarra/frontend/app.js#62-102) payload to harvest `description` and `extra_bedding`.
- Update `editGuestForm` payload to safely maintain state for fields that are "hidden" by the Department Role. (i.e., if a Hotel Dept user submits an edit, we must not accidentally wipe the transport fields just because they weren't rendered in the modal. We must merge the update with the existing guest data organically).
- Implement dynamic modal rendering logic:
  - **RSVP**: Sees everything.
  - **Hotel**: Sees *only* `room`, `floor`, and `extra_bedding`.
  - **Transport/Logistics**: Sees *only* `driver_name` and `driver_mobile`.

## Verification Plan
### Automated Tests
- Run [migrate7.py](file:///c:/Users/ayush/.gemini/antigravity/scratch/niyarra/backend/migrate7.py) locally and verify the schema.
- Validate the backend API accepts the new fields natively.

### Manual Verification
- Launch the application and visit `modification.html`.
- Alter the role to **Hotel** and open an Edit modal; verify only Room, Floor, and Extra Bedding are exposed. Submit an edit and verify other fields (like Driver Name) are *not* erased in the background.
