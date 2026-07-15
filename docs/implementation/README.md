# Implementation Guide

This directory describes the implemented LMS runtime and the constraints that future work must preserve. The executable source, `docker-compose.yml`, `infra/mysql-init/`, and the contracts under `shared/` are authoritative when an older planning example disagrees.

## Contents

1. [technology-stack.md](technology-stack.md) — technologies used by the current source and Docker topology.
2. [development-phases.md](development-phases.md) — completed implementation milestones and credential-dependent verification.
3. [service-build-order.md](service-build-order.md) — dependency-aware order for maintaining or rebuilding the stack.
4. [local-development-plan.md](local-development-plan.md) — actual Docker service names, ports, and network rules.
5. [rabbitmq-event-flow.md](rabbitmq-event-flow.md) — actual `lms_events` contracts and the synchronous authoritative enrollment path.
6. [implementation-boundaries.md](implementation-boundaries.md) — service, database, external-system, and secret boundaries.

For the complete deployment guide, see [Docker deployment](../deployment/DOCKER_DEPLOYMENT.md). For exact table definitions, see [database documentation](../database/README.md).
