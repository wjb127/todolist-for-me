# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔴 CRITICAL: Mobile-First Development

**ALL DEVELOPMENT MUST BE MOBILE-OPTIMIZED FIRST**
- This is a mobile-first PWA application
- Design and test for mobile screens (390px - 430px width) FIRST
- Desktop is secondary consideration
- Touch interactions must be prioritized over hover effects
- Minimum touch target size: 44x44px (Apple HIG) / 48x48px (Material Design)
- Ensure all interactive elements are easily tappable on mobile
- Avoid hover-only interactions - always provide mobile alternatives

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
# 4. migration-add-bulk-update-function.sql (bulk update performance)
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

## 🔔 작업 완료 알림 규칙
**중요**: 모든 주요 작업 완료 시 터미널에서 `notify` 명령을 실행하여 사용자에게 알림을 보낸다.
```bash
# 작업 완료 시 실행
notify
```