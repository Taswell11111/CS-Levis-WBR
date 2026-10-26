# 4-Week Department Progression Hub

A dedicated executive reporting gateway positioned beside **"Launch Review Pack"** on the landing portal, giving users direct control to select and explore department-specific week-on-week progression for the last 4 weeks: **Freshdesk & Calls Only**, **Parcelninja Only**, and **ReturnGO Only** (with an optional Combined Executive mode).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed User Selection & Controls**:
> - **Category Selectability (Confirmed)**: The user has full control to select which department report to view. They can choose either:
>   1. Directly on the landing card gateway via dedicated category launch buttons: **Freshdesk & Calls**, **Parcelninja**, or **ReturnGO**.
>   2. Inside the full-screen progression view via prominent department switcher tabs at the top of the screen.
> - **Gateway Placement**: Accessible directly on the landing portal next to the "Launch Review Pack" card.
> - **Presentation Model**: Full-screen specialized executive dashboard with side-by-side 4-week comparison columns (Week 39, Week 40, Week 41, and Week 42).
> - **Metric Depth**: Prioritizes key KPI progression cards, volume deltas (percentage & absolute WoW changes), and operational SLA compliance percentages across the 4 cohorts.

---

## 1. Overview & Core Concept

### What It Does
Provides an isolated, deep-dive multi-week progression view for each operational silo over a rolling 4-week horizon (Weeks 39 through 42). Users are not forced to view all departments together; they can choose exactly which department report they need to examine:

1. **Freshdesk & Calls Only**:
   - 4-week ticket volume progression (Total Tickets, Resolved, Closed, Reopened, One-Touch Resolutions).
   - Live unresolved backlog progression and aging tickets (> 7 days).
   - Support SLA trends: First Contact Resolution (FCR %) and Average Resolution Time (ART in hours).
   - Telephony call volumes, missed call percentage, and call duration trends.
   - Top 5 contact drivers comparison across all 4 weeks.

2. **Parcelninja Fulfilment Only**:
   - 4-week outbound shipping volume and delivery throughput.
   - Delivery SLA compliance curve (% delivered within carrier SLA targets).
   - Courier distribution shift week-over-week (The Courier Guy vs. DPD Laser split).
   - Pipeline progression: Picking/Queue, In-Transit Aging, and Depot Stalled exceptions.
   - Undelivered / Stale shipments count and commercial Value at Risk (ZAR).

3. **ReturnGO Returns Only**:
   - 4-week RMA intake volume (Total Returns Requested, Returns Received at Warehouse).
   - Return rate % progression relative to paid order volume.
   - Financial resolution retention: Exchange Value & Store Credit (Revenue Retained) vs. Cash Refunds (Cash Loss).
   - Status pipeline breakdown: Pending Approval, To Be Sent, In Transit, Received to Resolve.
   - Top returned products & primary return reason progression (e.g. Sizing/Fit vs. Defect).

4. **Executive Combined Overview**:
   - Unified side-by-side executive scorecards summarizing all three departments.

---

## 2. User Experience & Visual Design

### A. Landing Portal Gateway Card (`src/App.tsx`)
Positioned immediately adjacent to "Launch Review Pack" on the landing page:
- **Card Header**: "4-Week Department Progression Hub" with an executive blue/indigo badge and subtitle (`W39 – W42 Multi-Week Progression`).
- **Direct Department Quick-Launch Selector**:
  - Three distinct, clickable departmental pills directly on the card:
    - `🎧 Freshdesk & Calls`
    - `📦 Parcelninja Fulfilment`
    - `🔄 ReturnGO Returns`
  - A primary button: `"Open 4-Week Progression Hub"`, launching directly into the last selected or default department.

### B. Full-Screen Progression View (`src/components/FourWeekProgressionView.tsx`)
1. **Top Bar & Sticky Department Switcher**:
   - Clean breadcrumb: `Levi's SA Operations / 4-Week Progression Hub`.
   - **Prominent Department Selector Tabs**:
     ```
     [ 🎧 Freshdesk & Calls Only ]   [ 📦 Parcelninja Only ]   [ 🔄 ReturnGO Only ]   [ 📊 Combined Overview ]
     ```
   - Clicking any tab smoothly transitions the view in $\le 100\text{ms}$ with zero reload, recalculating all metrics, charts, and comparison columns for that department.
   - Action controls: "Export 4-Week CSV", "Copy Summary", and "Back to Portal".

2. **Top Metric Progression Strip**:
   - 4 prominent KPI trend cards tailored specifically to the active department (e.g. for Parcelninja: *Total Outbounds*, *Delivery SLA %*, *Avg Delivery Time*, *Stalled Exceptions*).
   - Each card displays the current Week 42 figure, 4-week net delta, and mini visual trend sparkline.

3. **4-Week Comparison Columns (Desktop 1440px Grid)**:
   - Side-by-side vertical columns for **Week 39**, **Week 40**, **Week 41**, and **Week 42**.
   - Each column features:
     - Week header with calendar dates (e.g. `12 Oct – 18 Oct · Audited Snapshot`).
     - Key operational metrics with color-coded WoW badges (`▲ +12%` / `▼ -4%`).
     - Category/courier breakdown strips.
     - Operational health benchmark indicators.

4. **Interactive Multi-Week Trend Chart**:
   - SVG joint-point area and line chart tracking the department's primary volume and SLA percentage across the 28-day span.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Direct Category Launch vs. Single Generic Entry
- **Chosen Approach**: Dual-entry capability. The landing card includes 1-click shortcut buttons for *Freshdesk*, *Parcelninja*, and *ReturnGO*, and the internal view includes sticky switcher tabs.
- **Why**: Allows users who only care about customer care or warehouse deliveries to jump directly into their specific silo in one click, while retaining the ability to toggle between departments inside the view.

### Decision 2: Zero-Mock Historical Continuity
- **Chosen Approach**: Ingests actual audited snapshots from `weekly_reports.json` (Weeks 38, 39, 40, 41) combined with the verified live Week 42 checkpoint.
- **Why**: Guarantees 100% genuine data integrity across all 4 weeks with zero synthetic numbers.

---

## 4. Technical Architecture & Data Strategy

### System Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LANDING PORTAL (App.tsx)                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Editor Gateway ]    [ Launch Review Pack ]   [ 4-Week Progression] │
│                                                  │ [🎧 FD] [📦 PN] [🔄RG│
└──────────────────────────────────────────────────┴──────────┬──────────┘
                                                              │
                                                              ▼
                                                ┌────────────────────────┐
                                                │ 4-WEEK PROGRESSION HUB │
                                                ├────────────────────────┤
                                                │ Department Tabs:       │
                                                │ [Freshdesk]            │
                                                │ [Parcelninja]          │
                                                │ [ReturnGO]             │
                                                │ [Combined]             │
                                                └───────────┬────────────┘
                                                            │
                                                            ▼
                                                ┌────────────────────────┐
                                                │ 4-WEEK COMPARISON      │
                                                │ [ W39 | W40 | W41 | W42│
                                                │  ├─ KPI Trend Cards    │
                                                │  ├─ Volume Deltas      │
                                                │  ├─ SLA Percentages    │
                                                │  └─ Department Metrics │
                                                └────────────────────────┘
```

### Component Structure
1. **`src/components/FourWeekProgressionView.tsx`**:
   - Full-screen dashboard component.
   - Slices historical weeks: `[week39, week40, week41, week42]`.
   - Controls active category: `activeCategory: 'freshdesk' | 'parcelninja' | 'returngo' | 'overview'`.
2. **`src/components/ProgressionColumn.tsx`**:
   - Specialized column renderer for each week with departmental metric blocks and delta badges.
3. **`src/App.tsx`**:
   - Updates landing grid with the new gateway and category quick-launcher buttons.
   - Adds `'progression'` view state with smooth back-navigation to the landing portal.
