# PRD Summary

## Project name
Printing Factory AI Quote Assistant MVP

## Product goal
Build an AI-assisted quoting system for a printing factory store on 1688 / Alibaba.

The system should:
- understand customer quote requests
- collect missing quote parameters
- call a structured pricing engine
- return preliminary quote results
- answer basic printing FAQ
- hand off complex cases to human staff

## Business value
- faster first response
- reduce repetitive manual quoting work
- standardize quote logic and wording
- improve inquiry-to-quote conversion
- improve business team efficiency

## MVP scope
### Included
- standard printing inquiry handling
- product intent recognition
- parameter extraction
- multi-turn missing parameter follow-up
- structured quote engine
- basic shipping estimation
- quote result output
- knowledge-based FAQ
- conversation storage
- human handoff
- basic admin visibility

### Excluded
- automatic review of complex design source files
- full non-standard packaging quote automation
- full ERP / OMS integration
- fully automatic order closing
- complex complaint / after-sales automation

## Main user roles
### Internal users
- sales staff
- store admin
- operations staff

### External users
- customers asking for quotes in the 1688 store

## Core scenarios
1. Standard quote inquiry  
   Example: customer asks for 1000 A4 brochures and wants a price.

2. FAQ / printing knowledge  
   Example: customer asks the difference between coated paper and matte paper.

3. Customer thinks price is too high  
   System may suggest lower-cost alternatives within rules.

4. Customer sends design files  
   For PDF / AI / CDR / PSD / ZIP and similar files, default to human handoff.

5. Interrupted parameter collection  
   If customer stops replying, mark as pending follow-up.

6. Human handoff  
   Non-standard products, unclear requests, complaints, risky sessions, or complex files go to human staff.

## Product principles
1. LLM does not calculate final prices directly
2. Structured pricing engine is the source of truth for price
3. Knowledge retrieval is only for explanation, not final quote math
4. Complex design files are not auto-reviewed in MVP
5. Human fallback must always exist
6. Internal sensitive data must never be exposed
7. Platform integration must remain compliant and auditable

## MVP product categories
Start only with:
- brochure / album
- flyer
- business card
- poster
- sticker
- standard paper bag

## Required quote parameters
Typical parameters include:
- product type
- finished size
- page count
- cover material
- cover weight
- inner material
- inner weight
- binding type
- quantity
- printing process
- tax requirement
- shipping region
- delivery expectation

Different categories may require different parameter sets.

## Main system flow
1. customer sends inquiry
2. system identifies product type and intent
3. system extracts structured parameters
4. system checks missing required fields
5. if missing, system asks follow-up questions
6. when enough parameters are collected, system calls quote engine
7. system returns quote result
8. if case is risky / non-standard / file-based, hand off to human

## Human handoff triggers
- customer sends complex design files
- request is outside standard rules
- missing required parameters after repeated attempts
- complaint / angry customer
- abnormal quote probing / risk signals
- quote engine cannot return reliable result

## Admin-side requirements
- view conversations
- view extracted parameters
- view quote results
- trigger human handoff
- manage product categories
- manage parameter definitions
- manage pricing rules
- manage shipping rules
- store feedback annotations

## Core data entities
- Conversation
- Message
- Quote
- ProductCategory
- ProductParameterDefinition
- PricingRule
- ShippingRule
- HandoffRecord
- FeedbackAnnotation

## Core metrics
- AI resolution rate
- quote success rate
- handoff rate
- parameter extraction accuracy
- quote accuracy
- interrupted conversation recovery rate
- risky session interception rate

## Technical stack
- Next.js
- TypeScript
- PostgreSQL
- Prisma
- OpenAI Responses API
- zod

## Implementation priorities
### Phase 1
- project skeleton
- database schema
- one product category quote engine
- quote API
- parameter extraction
- minimal chat flow

### Phase 2
- conversation persistence
- admin pages
- quote records
- handoff workflow
- file upload recognition
- quote document export

### Phase 3
- richer category coverage
- better shipping logic
- better rule management
- feedback-driven optimization