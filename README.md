# Body Artist Coaching & Nutrition Platform

An internal web app built for a specialized coaching group managing enhanced athletes. Two roles: coach and athlete.

---

## Features

**Coach**
- Bento-grid dashboard with one card per athlete
- Daily adherence score (0–100) and streak tracking
- Adherence heatmap (green to red, contribution-style)
- Time-series charts for macros, weight, and hydration
- Athlete provisioning and diet plan configuration
- Per-athlete drill-down with full meal history

**Athlete**
- Photo-based meal logging via AI vision API
- Confirm / adjust nutrition estimates before saving
- Water, supplement checklist, steps, cardio logging
- Personal heatmap and score history

**General**
- Role-based access (coach vs athlete)
- Row-level security via Supabase / PostgreSQL
- DPDP Act 2025 consent flow on onboarding
- Vision API cost telemetry for pricing analysis

---

> Private project. Not open source.