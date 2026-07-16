# CLAUDE.md - Project Rules & Commands

All development and command executions in this repository must strictly adhere to the guidelines defined in the [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) file.

## Build, Test & Lint Commands

* **Run Development Server:** `npm run dev`
* **Build/Compile Project:** `npm run build`
* **Execute Test Suite:** `npm run test`
* **Run Linter:** `npm run lint`
* **Prisma Migrations:** `npx prisma migrate dev --schema=src/database/prisma/schema.prisma`

## Core Guidelines

* **Simple Commands:** Always use simple, direct commands. Avoid over-engineered pipelines or custom shell scripts.
* **Actionable TODOs:** Never leave empty functions or blocks without descriptive `// TODO:` comments detailing the next steps.
* **No Over-Engineering:** Follow YAGNI strictly. Do not write speculative helpers or extra layers.
* **Layered Architecture:** Keep new features strictly modularized inside `/src/modules` matching the Controllers-Services-Repositories pattern.
