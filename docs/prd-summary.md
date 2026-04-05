# PRD Summary

## Project name
Printing Factory AI Quote Assistant MVP

## Product goal
Build an AI-assisted quoting system for a printing factory store on 1688 / Alibaba.

The system should:
- understand customer quote requests
- collect missing quote parameters
- call a structured pricing engine
- return quote or structured pre-quote results
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
- simple product inquiry handling
- phase-one complex packaging inquiry handling
- product intent recognition
- parameter extraction
- multi-turn missing parameter follow-up
- structured quote engine
- structured pre-quote for phase-one complex packaging
- basic shipping estimation
- quote result output
- knowledge-based FAQ
- conversation storage
- human handoff
- basic admin visibility
- combination quote expression for main item + sub-components

### Excluded
- automatic review of complex design source files
- stable automatic dieline parsing
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
   For PDF / AI / CDR / PSD / ZIP / dieline files and similar files, default to human handoff or manual review.

5. Phase-one complex packaging inquiry  
   Example: customer asks for a mailer box, tuck-end box, window box, leaflet, insert, or seal sticker pre-quote.

6. Combination quote inquiry  
   Example: customer asks for one main box plus insert plus leaflet plus seal sticker in the same request.

7. Interrupted parameter collection  
   If customer stops replying, mark as pending follow-up.

8. Human handoff  
   Non-standard products, unclear requests, complaints, risky sessions, or complex files go to human staff.

## Product principles
1. LLM does not calculate final prices directly
2. Structured pricing engine is the source of truth for price
3. Knowledge retrieval is only for explanation, not final quote math
4. Complex design files and dieline files are not auto-reviewed in MVP
5. Human fallback must always exist
6. Internal sensitive data must never be exposed
7. Platform integration must remain compliant and auditable

## MVP product categories
Current live scope in this repository:
- brochure / album
- flyer
- business card
- poster

Phase-one complex packaging scope:
- mailer_box
- tuck_end_box
- window_box
- leaflet_insert
- box_insert
- seal_sticker

Planned for later MVP expansion, but not yet implemented in the current codebase:
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

### Complex packaging phase-one parameter examples

- length / width / height
- material and weight
- print color / spot color
- surface finishing
- window size / window position / film requirement
- die-cut, mounting, gluing and related process notes
- quantity and packing method

### Combination quote concept

Phase-one complex packaging should allow one inquiry to contain:

- one main package component
- one or more sub-components

Typical example:

- main box + insert + leaflet + seal sticker

The system should normalize this into a structured pre-quote context, but final confirmation may still require human review.

## Main system flow
1. customer sends inquiry
2. system identifies product type and intent
3. system extracts structured parameters
4. system checks missing required fields
5. if missing, system asks follow-up questions
6. when enough parameters are collected, system calls quote engine or structured pre-quote logic
7. system returns quote result or structured pre-quote result
8. if case is risky / non-standard / file-based / dieline-based, hand off to human

## Human handoff triggers
- customer sends complex design files
- customer sends dieline PDF / AI / CDR or similar packaging files
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

## File handling boundary

### PDF as knowledge or sample material

- may be used as reference or explanatory material
- should not be treated as a stable machine-readable structure source in this phase

### PDF as customer design attachment or dieline file

- current product direction allows file intake and file-type recognition
- complex design and dieline files still require manual review
- the system should not promise stable automatic structural parsing of dieline PDFs in this phase