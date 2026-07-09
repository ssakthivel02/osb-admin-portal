# Architecture - osb-admin-portal

## Overview
Administration, operations, content, users, audit and support console. This repository is part of the OmSaravanaBhava Learning Ecosystem Enterprise Architecture v1.0.

## Context diagram
```mermaid
graph TD
    User[User / Service] --> Repo[osb-admin-portal]
    Repo --> Standards[osb-engineering-standards]
    Repo --> Platform[osb-platform-foundation]
```

## Architecture principles
- Secure by default
- Observable by default
- API-first where applicable
- Documentation-as-code
- ADR-controlled change

## Dependencies
See `ROADMAP.md` for implementation sequence and dependency notes.
