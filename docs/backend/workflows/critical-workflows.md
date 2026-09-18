# Critical backend workflows

## Authentication

```mermaid
sequenceDiagram
 participant C as Client
 participant A as Auth service
 participant DB as DB
 C->>A: POST login (email/password)
 A->>DB: user lookup
 A->>A: Argon2 verify or dummy verify
 A->>DB: update login state, create session + hashed refresh
 A->>DB: best-effort login audit
 A-->>C: access token + HTTP-only refresh cookie
```

**Known issue:** login/session/audit is not atomic; refresh rotation has SEC-001 race.

## Student lifecycle

```mermaid
flowchart LR
 Admission[Confirmed admission] --> Student[Student enrollment]
 Student --> Term[Semester enrollment attempt]
 Term --> Batch[Promotion decision]
 Batch -->|PROMOTE/REPEAT| Term
 Batch -->|WITHDRAW/DISCONTINUE/GRADUATE| Student
```

Each write uses a transaction/audit in the relevant service. Admission cancellation is rejected once enrollment exists. Promotion, not semester enrollment routes, owns subsequent term transitions.

## Scheduling and attendance

```mermaid
sequenceDiagram
 participant Admin
 participant T as Timetable service
 participant L as Lecture service
 participant AT as Attendance service
 Admin->>T: create (assignment, room, slot)
 T-->>Admin: timetable
 Admin->>L: create dated occurrence
 L-->>Admin: lecture
 Admin->>AT: create session / bulk mark / lock
 AT-->>Admin: attendance DTOs
```

All of these Phase-1 mutations are transactional and audited. Room/time-slot setup is not exposed by the API.
