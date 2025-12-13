- NL intake: let users describe a project in plain text (or paste scope docs) and have the estimator draft categories, line items, and quantities automatically; show a confidence ribbon and allow quick edits.
- Plan/photo extraction: accept PDFs/blueprints/images and OCR key dimensions/rooms/materials to seed the estimate; suggest missing items based on project type.
- Smart templates & reuse: mine prior estimates in Firestore to propose a template based on project metadata (type, sqft, region); auto-fill typical assemblies and localize costs.
- Cost intelligence: fine-tune cost multipliers by region and seasonality; flag outlier line items vs historical ranges; recommend contingencies and mark risk bands.
- Scenario modeling: what-if controls (spec changes, labor rate shifts, schedule compression) that recompute totals and margin impact with AI-backed reasoning on trade-offs.
- Vendor insight: suggest suppliers/subs for material lists with indicative lead times; track price volatility and prompt re-pricing when aged.
- Scope compliance: run a checklist against the project description to detect missing scopes (e.g., permits, waste hauling) and offer add-ons; generate RFIs for ambiguous details.
- Narrative outputs: generate proposal-ready summaries, assumptions, exclusions, and alternates directly from the estimate; different tones for client vs internal review.
- Change-order assist: detect scope deltas between versions of an estimate and draft change-order language with cost deltas highlighted.
- Guidance in-app: chat/command palette that can answer why is drywall high?, add acoustic insulation to level 2, or compare this to Project X.

## Progress
- [x] NL intake shipped via the AI Scope Intake panel on the estimator page, automatically drafting materials, labor, subs, and permit allowances with confidence scoring.
- [x] Material auto-selection now ties AI hints to catalog descriptions/formulas to improve match accuracy.
- [x] Plan/photo extraction panel ingests PDFs/images, derives footprint/floors, and feeds catalog-aligned drafts into the estimator.
