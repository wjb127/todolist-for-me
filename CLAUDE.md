# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database migrations
# Run these SQL files in Supabase SQL Editor in order:
# 1. supabase-schema.sql (initial schema)
# 2. migration-add-template-fields.sql (template enhancements)
# 3. migration-add-plan-order.sql (plan ordering)
```

## Architecture Overview

This is a personal Todo management app built with Next.js 15 App Router, Supabase, and deployed on Vercel.

### Core Application Structure

**Four Main Pages (Bottom Navigation):**
- `/templates` - Manage reusable todo templates
- `/todos` - Date-based todo management with template integration
- `/plans` - One-time plans with priority and due dates
- `/dashboard` - Performance analytics and achievement tracking

**Key Data Flow:**
1. **Templates** can be activated to auto-generate daily todos for 3 months
2. **Todos** are either template-generated or manually created per date
3. **Plans** are independent one-time items with drag-and-drop ordering
4. **Dashboard** aggregates completion data for weekly analytics

### Database Schema (Supabase)

**Templates Table:**
- Stores reusable todo templates with JSONB items array
- `is_active` + `applied_from_date` controls auto-generation
- When activated, creates todos for 90 days starting from applied_from_date

**Todos Table:**
- Date-based todos with optional template_id linkage
- `order_index` for sorting within each date
- Auto-generated from active templates or manually created

**Plans Table:**
- One-time plans with priority (low/medium/high) and due_date
- `order_index` enables drag-and-drop reordering via @dnd-kit
- Filtered by completion status (default: pending)

### Key Technical Patterns

**Template System:**
- Active templates automatically generate todos via `checkAndApplyActiveTemplate()`
- Template items are stored as JSONB with id, title, description, order_index
- Only one template can be active at a time

**Date Management:**
- Uses date-fns for formatting and date-fns/locale/ko for Korean localization
- Dates stored as YYYY-MM-DD strings in database
- TodosPage includes date navigation (previous/next day)

**Drag and Drop:**
- Plans page uses @dnd-kit for reordering
- Updates order_index in database immediately after drag end
- SortableItem component with GripVertical handle

**UI Patterns:**
- Mobile-first design with bottom navigation
- Tailwind CSS for styling
- Lucide React for icons
- Modal overlays for create/edit forms

## Environment Setup

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Important Implementation Notes

- Templates auto-generate todos for 90 days when activated
- Plans default to 'pending' filter on page load
- Todo completion rates drive dashboard analytics
- All tables use UUID primary keys and have updated_at triggers
- Bottom navigation uses pathname.startsWith() for active state
- Korean language used throughout UI text