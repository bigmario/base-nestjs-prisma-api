# AGENTS Guide

This file defines working rules for coding agents in this repository.
Follow these conventions unless the user explicitly asks otherwise.

## Repository Snapshot

- Stack: NestJS 8 + TypeScript + Prisma + PostgreSQL + Redis.
- Runtime: Node.js with npm (`package-lock.json` is present).
- API docs: Swagger in `src/main.ts` and `nest-cli.json`.
- Validation: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`).
- Structure: feature modules in `src/modules`, shared infra in `src/core`.

## Rule Files

- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.
- If added later, treat those as higher-priority instructions.

## Setup And Runtime Commands

- Install dependencies: `npm install`
- Start app: `npm run start`
- Dev watch mode: `npm run start:dev`
- Build dist bundle: `npm run build`
- Run prod bundle: `npm run start:prod`

## Docker Commands

- Dev stack (API + Postgres + Redis): `docker-compose up dev`
- Prod-like stack: `docker-compose up prod`
- Service file: `docker-compose.yaml`
- Ports: API `3000`, Postgres `5432`, Redis `6380`

## Prisma Commands

- Dev migrations: `npx prisma migrate dev`
- Deploy migrations: `npx prisma migrate deploy`
- Generate client: `npx prisma generate`
- Seed database: `npx prisma db seed`
- Seed script lives in `package.json` (`prisma.seed`).

## Lint / Format / Test

- Lint (auto-fix): `npm run lint`
- Format: `npm run format`
- Unit tests: `npm run test`
- Unit tests watch: `npm run test:watch`
- Coverage: `npm run test:cov`
- E2E tests: `npm run test:e2e`
- Debug tests: `npm run test:debug`

## Run A Single Test (Important)

- Unit test file: `npm run test -- src/path/to/file.spec.ts`
- Unit test by name: `npm run test -- -t "should return user profile"`
- E2E test file: `npm run test:e2e -- test/app.e2e-spec.ts`
- E2E test by name: `npm run test:e2e -- -t "GET /"`
- Fallback direct jest:
  - `npx jest src/path/to/file.spec.ts`
  - `npx jest --config ./test/jest-e2e.json test/app.e2e-spec.ts`

## Agent Verification Workflow

- After non-trivial edits, run `npm run lint` then `npm run test`.
- For API wiring or module registration changes, also run `npm run build`.
- For auth/guards/interceptors/bootstrap changes, also run `npm run test:e2e`.
- If tests are missing, state that explicitly in the final report.

## Code Organization

- Keep domain code under `src/modules/<domain>/`.
- Typical folders: `controllers`, `services`, `repositories`, `dtos`, `constants`.
- Shared cross-cutting code belongs in `src/core/`.
- Reuse existing helpers in `src/utils/` before adding new utilities.
- Follow file suffixes: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.dto.ts`, `*.guard.ts`, `*.decorator.ts`, `*.strategy.ts`, `*.types.ts`.

## Imports And Paths

- Prefer tsconfig aliases when available: `@core/*`, `@auth/*`, `@user/*`, `@utils*`.
- Import grouping order (with blank line between groups):
  1. Nest/third-party packages
  2. Internal alias imports
  3. Relative imports (`./`)
- Keep imports explicit; avoid wildcard barrels unless already established.

## Formatting

- Prettier is authoritative: single quotes, trailing commas, tab width 2.
- Keep semicolons consistent with existing code.
- Keep lines readable and avoid unnecessary long expressions.
- Avoid introducing non-ASCII unless required by existing file content.

## TypeScript Guidelines

- Repo permits `any` and `strictNullChecks: false`; still prefer safer typing in new code.
- Prefer typed DTOs and Prisma args over loose object literals.
- Prefer `unknown` with narrowing instead of `any` for external inputs/errors.
- Reuse existing types from `src/core/types` and module-local `types/`.
- Keep public controller/service signatures explicit and stable.

## Naming Conventions

- Classes/enums: `PascalCase`
- Functions/methods/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DTO classes end in `Dto`
- Query DTOs and arg types should be intent-revealing (`AllUsersQueryParams`, etc.)

## Error Handling

- Throw Nest HTTP exceptions at service/controller boundaries.
- Map known DB/domain failures to specific exceptions.
- Do not leak raw internal errors in API responses.
- Prefer Nest `Logger` over `console.log` in new/modified code.
- Keep error messages consistent and actionable.

## Validation And API Contracts

- Put request validation in DTOs with `class-validator`.
- Rely on global `ValidationPipe`; avoid duplicated manual validation.
- Keep Swagger decorators updated for public endpoints.
- Update module route constants when adding/changing endpoints.

## Prisma And Data Access

- Keep DB access in repositories, not controllers.
- Use explicit `select` to avoid over-fetching.
- Preserve soft-delete behavior (`deletedAt`) when applicable.
- Keep pagination behavior consistent with existing pagination service.
- For behavior-changing schema updates, include migration + code + seed updates.

## Auth And Security

- JWT auth is global via `APP_GUARD`; mark open routes with `@Public()`.
- Use `@Roles(...)` and `RolesGuard` for role-based authorization.
- Never log secrets, passwords, tokens, or full auth payloads.
- Keep password/token logic inside auth service/repository boundaries.

## PR / Change Checklist

- Keep diffs focused and avoid drive-by refactors.
- Preserve backward compatibility unless task requires a break.
- Update tests for behavior changes.
- Run relevant checks before finishing.
- Final report should include files changed, commands run, validation status, and follow-up work.
