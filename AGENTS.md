# AGENTS.md

## Project
This project is an MVP for an AI quoting assistant for a printing factory selling on 1688/Alibaba.

Main goal:
- Handle standard printing inquiries
- Extract quote parameters from user messages
- Use a structured pricing engine to calculate quotes
- Answer basic printing/production questions
- Support human handoff
- Generate quote records and quote documents

## MVP scope
Current MVP only focuses on:
- Standard product categories
- Multi-turn parameter collection
- Structured quote calculation
- Basic FAQ / knowledge retrieval
- Human handoff
- Conversation record storage
- Quote result storage

Not in current MVP:
- Fully automatic negotiation
- Automatic review of complex design files
- Full ERP integration
- Full 1688 production integration
- All non-standard packaging products
- Complex after-sales automation

## Core product rules
1. LLM must never calculate final prices directly.
2. All prices must come from a structured pricing engine.
3. RAG / knowledge retrieval is only for explanatory knowledge, not final pricing.
4. If user sends complex design files (PDF/AI/CDR/PSD/ZIP), default action is human handoff.
5. If required parameters are missing, system should ask follow-up questions instead of guessing.
6. If the request is outside standard rules, hand off to human.
7. Do not implement simulated login, scraping, or unofficial 1688 automation.
8. Do not generate platform-external payment flows by default.
9. Keep implementation simple and locally runnable first.

## Product categories for MVP
Current live scope in this repository:
- Album / brochure
- Flyer
- Business card
- Poster

Planned but not yet implemented in the current codebase:
- Sticker
- Standard paper bag

Do not expand categories unless explicitly asked.

## Architecture principles
- Frontend: Next.js
- Backend: Next.js API routes or server actions
- Database: PostgreSQL
- ORM: Prisma
- AI: OpenAI Responses API
- Validation: zod

Recommended code structure:
- pricing logic must be separated from AI logic
- AI extraction must be separated from quote calculation
- API routes should remain thin
- business logic should live in src/server or src/lib

## Database design principles
The project should at minimum support:
- conversations
- messages
- quotes
- product categories
- parameter definitions
- pricing rules
- shipping rules
- handoff records
- feedback annotations

## Quote engine principles
- Pricing engine must be deterministic
- Functions should be pure where possible
- Keep formulas explicit and readable
- Keep all amounts rounded to 2 decimal places
- Shipping fee should be separated from product subtotal
- Final quote result should include normalized parameters and notes

## AI behavior rules
- AI should extract structured parameters from user input
- AI should identify missing fields
- AI should not fabricate unavailable parameters
- AI should not expose internal cost, margin, supplier info, or other customer data
- AI should clearly act as an assistant, not a final decision maker
- AI responses should be concise, practical, and business-oriented

## Conversation / workflow rules
- If parameters are incomplete, continue guided questioning
- If customer stops replying, system may mark the conversation as interrupted / pending follow-up
- If risk, complaint, or complex case is detected, hand off to human
- Quote output should be treated as preliminary unless confirmed by business workflow

## Coding instructions
When working on this project:
1. Explain which files you will modify before making changes
2. Keep code minimal and maintainable
3. Do not over-engineer
4. Prefer small incremental changes
5. After changes, explain:
   - what changed
   - how to run
   - how to test
6. If assumptions are needed, state them clearly
7. If a feature depends on unavailable external APIs, stub it cleanly instead of faking it

## Definition of done
A task is considered done only if:
- code compiles
- local run instructions are clear
- validation path is provided
- behavior matches MVP scope