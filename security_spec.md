# Security Specification: QMS Firestore Database (ABAC Model)

## 1. Data Invariants
1. **Authentication Gate**: No read or write access is allowed to anonymous or unauthenticated requests.
2. **Identity Match**: Users can only create or modify events where `createdBy` matches their authenticated Google account email.
3. **Data Integrity (Size & Typings)**:
    - `id` must be alphanumeric, maximum 128 characters.
    - `title` must be maximum 200 characters.
    - `description` must be maximum 1000 characters.
    - `location` must be maximum 500 characters.
    - `eventType` must be one of: `['Internal Audit', 'External Audit', 'Document Review', 'Management Review', 'CAPA Follow-up']`.
    - `status` must be one of: `['Scheduled', 'Confirmed', 'Completed', 'Cancelled']`.
4. **Temporal Invariants**:
    - `createdAt` must be exactly the server timestamp (`request.time`) during document creation and is immutable thereafter.
    - `updatedAt` must be exactly the server timestamp (`request.time`) during document updates.
5. **No Blind Escalation / Field Hijacking**: During updates, the `createdBy` and `id` fields are strictly immutable to prevent event hijacking.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 specific JSON payloads designed to violate system rules and probe the constraints. All of these MUST result in a `PERMISSION_DENIED` outcome.

### Payload 1: Unauthenticated Create
- **Attempt**: Write a valid event without a valid authentication token.
- **Payload**:
  ```json
  {
    "id": "evt_101",
    "title": "Unauthenticated Event",
    "eventType": "Internal Audit",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com"
  }
  ```
- **Expectation**: Reject (Missing Auth token).

### Payload 2: Creator Identity Spoofing (Create)
- **Attempt**: Authenticated as `attacker@gmail.com` but attempting to create an event with `createdBy` set to `contact@globalexpertdragan.com`.
- **Payload**:
  ```json
  {
    "id": "evt_102",
    "title": "Spoofed Creator",
    "eventType": "Internal Audit",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com"
  }
  ```
- **Expectation**: Reject (createdBy must match authenticated user's email).

### Payload 3: Creator Hijacking (Update)
- **Attempt**: Update an existing event to change its owner / creator.
- **Payload**:
  ```json
  {
    "createdBy": "attacker@gmail.com"
  }
  ```
- **Expectation**: Reject (createdBy is immutable).

### Payload 4: Invalid Event Type
- **Attempt**: Write an event with a non-matching `eventType` field (e.g. "Coffee Break").
- **Payload**:
  ```json
  {
    "id": "evt_104",
    "title": "Coffee Break Meeting",
    "eventType": "Coffee Break",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com"
  }
  ```
- **Expectation**: Reject (eventType is invalid).

### Payload 5: Invalid Event Status
- **Attempt**: Write an event with an invalid `status` field (e.g. "Drafting").
- **Payload**:
  ```json
  {
    "id": "evt_105",
    "title": "Status Test",
    "eventType": "Internal Audit",
    "status": "Drafting",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com"
  }
  ```
- **Expectation**: Reject (status is invalid).

### Payload 6: Oversized Title
- **Attempt**: Write a title exceeding 200 characters to crash indexing or waste resources.
- **Payload**:
  ```json
  {
    "id": "evt_106",
    "title": "A very long title... [Repeated characters to exceed 200...]",
    "eventType": "Internal Audit",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com"
  }
  ```
- **Expectation**: Reject (title size limit exceeded).

### Payload 7: Shadow Field Injection
- **Attempt**: Inject a malicious "ghost field" (`isAdminOverride: true`) to bypass secondary application validation checks.
- **Payload**:
  ```json
  {
    "id": "evt_107",
    "title": "Shadow Field Attack",
    "eventType": "Internal Audit",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com",
    "isAdminOverride": true
  }
  ```
- **Expectation**: Reject (Strict key size and content matching enforces exact schema keys).

### Payload 8: Client-Manipulated Creation Date
- **Attempt**: Send a client-constructed date as `createdAt` rather than using the server timestamp gate.
- **Payload**:
  ```json
  {
    "id": "evt_108",
    "title": "Fake CreatedAt Date",
    "eventType": "Internal Audit",
    "status": "Scheduled",
    "startDateTime": "2026-07-20T10:00:00Z",
    "endDateTime": "2026-07-20T11:00:00Z",
    "createdBy": "contact@globalexpertdragan.com",
    "createdAt": "2000-01-01T00:00:00Z"
  }
  ```
- **Expectation**: Reject (createdAt must equal request.time).

### Payload 9: Client-Manipulated Update Date
- **Attempt**: Update an event but set the `updatedAt` to a historical or future date.
- **Payload**:
  ```json
  {
    "title": "Title Update",
    "updatedAt": "2099-12-31T23:59:59Z"
  }
  ```
- **Expectation**: Reject (updatedAt must equal request.time).

### Payload 10: ID Poisoning Attack
- **Attempt**: Inject huge/poisoned string as the document ID path variable (e.g. a 5KB path segment).
- **Expectation**: Reject (isValidId checks string sizes on the path variable).

### Payload 11: Cross-User Read Attempt (Strict Verification)
- **Attempt**: A user who is not signed in or is signed in with a spoofed/unverified email attempts to read another user's private events collection.
- **Expectation**: Reject (Read is restricted to verified users with matched creator emails or admins).

### Payload 12: Invalid ID Pattern
- **Attempt**: Use special characters in the Event ID (e.g., `evt_#101` or `evt/../../hack`).
- **Expectation**: Reject (ID must match regex: `^[a-zA-Z0-9_\-]+$`).

---

## 3. Test Runner Definition

The testing script `firestore.rules.test.ts` validates all constraints.
