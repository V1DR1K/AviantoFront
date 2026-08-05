# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript frontend, built with the Sites-compatible Vinext starter. The future service layer is Java/Spring Boot, Jakarta Persistence and PostgreSQL, deployed separately. The frontend is prepared for deployment on the user's Contabo VPS.

## Users

- Operario: works mainly from a mobile phone in a motorcycle workshop. He has reduced vision and needs a fast, highly legible way to create a job order, find or register a customer and motorcycle, add known catalogue items, notes and photos.
- Administración (Avril): works mainly from a PC. She standardizes the request, manages commercial data, adjusts quantities, prices and discounts, creates budgets or invoices, and follows the workshop's records and reports.

## Product Purpose

AviantoSoftware turns informal workshop notes into standardized, traceable work orders and customer-ready budgets. Success means fewer ambiguous descriptions and repeated price searches, with a simple handoff from the workshop floor to administration.

## Positioning

The product separates fast diagnosis capture from commercial review: the operative can leave an incomplete but useful request, while administration turns it into a standardized quotation without changing historical prices.

## Operating Context

An Argentine motorcycle workshop. Core records are customers, their motorcycles, catalogue pieces and labor, orders, budgets, photos, audit history and reports. Currency is ARS. Mobile use happens in a busy workshop; desktop use is a detail-heavy administrative workflow.

## Capabilities and Constraints

- Responsive frontend only, using coherent mock data and DTO-shaped services that can be replaced by a Spring Boot API.
- No real authentication yet; the interface must make Operario and Administración contexts distinct.
- Logical deletion, protected sensitive actions, filters, pagination, mock Excel export, PDF preview/download, and device-local data are required for the MVP.
- Photos are base64-style mock data until backend uploads are added.
- Brand assets exist but are not presently available. The design system must parameterize visual tokens so a future brand manual can replace them without restructuring the product.

## Brand Commitments

The visible product name is AviantoSoftware. The current brief binds a clear professional interface, deep blue as the working primary color, green for positive actions or states, red only for destructive/risk states, large accessible type, white and soft gray surfaces, and mechanics/motorcycles as a subtle—not decorative—reference.

## Evidence on Hand

The brief supplies product requirements and realistic example motorcycle and catalogue data. No logo, final brand manual, customer testimonials, commercial benchmarks, or real workshop photography is available; none may be invented as factual proof.

## Product Principles

1. Capture facts quickly at the motorcycle, then refine them precisely at the desk.
2. Make every important action readable, labeled and safely reversible.
3. Preserve history: pricing, status changes and removals remain traceable.
4. Keep workshop operations calm and legible under imperfect mobile conditions.
5. Keep data contracts replaceable, so frontend progress does not lock in the backend.

## Accessibility & Inclusion

The operative's reduced vision requires high contrast, large text, generous touch targets, clear labels alongside icons, and mobile-first critical workflows. Keyboard-visible focus and responsive layouts are required for the administrative interface.
