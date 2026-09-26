# StockSense — UI/UX Design Brief & Design System

**Project Name:** StockSense  
**Hackathon:** Odoo x LPU Jalandhar Hackathon 2026  
**Document Version:** 1.0.0  
**Target Release:** Production / Hackathon Final Submission  
**Repository:** [STOCK-SENSE-ODOO-x-LPU](https://github.com/manas0306-ops/STOCK-SENSE-ODOO-x-LPU)  

---

## 1. Executive Summary & Product Personality

StockSense is an industrial-grade warehouse inventory ERP designed for high data density, rapid scan-ability, and operational ergonomics. Unlike consumer applications that prioritize decorative whitespace, warehouse software must facilitate rapid decision-making under diverse ambient lighting conditions (bright warehouse bays, dim racking aisles, and office monitors).

### Core Brand Principles:
1. **Clarity Over Novelty:** Standardized layout conventions, unambiguous typography, and high visual contrast.
2. **Speed & Ergonomics:** High touch/click target compliance, one-click test credentials for evaluators, and instant modal workflows.
3. **Auditability at a Glance:** Statuses, quantities, and movements are color-coded with semantic meaning (e.g., Green = Inbound/Positive, Blue = Movement, Amber/Red = Reorder/Deficit).
4. **Physical Reality Alignment:** Printable documents reflect actual industrial paperwork (shipping manifests, receiving tallies, carrier sign-off lines).

---

## 2. Color System & Semantic Palette

The design system utilizes **TailwindCSS** palette tokens calibrated for WCAG AA compliance (4.5:1 minimum contrast ratio).

| Color Role | Tailwind Token | Hex Code | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `emerald-600` | `#059669` | Primary action buttons, positive balance badges, inbound receipt tags. |
| **Primary Hover** | `emerald-700` | `#047857` | Focused and hovered interactive states. |
| **Surface Dark** | `slate-900` | `#0f172a` | Navigation sidebar background, primary typography headings. |
| **Surface Neutral**| `slate-800` | `#1e293b` | Active navigation links, elevated surface panels. |
| **Surface Light** | `slate-50` | `#f8fafc` | Application canvas background. |
| **Card White** | `white` | `#ffffff` | Content containers, modals, table backgrounds. |
| **Border Neutral** | `slate-200` | `#e2e8f0` | Subtle structural dividers and table cell borders. |
| **Status Ready** | `blue-500` / `blue-50` | `#3b82f6` | Ready for processing, transfer operations, order inspection. |
| **Status Done** | `emerald-500` / `emerald-50` | `#10b981` | Finalized, validated, and ledger-committed transactions. |
| **Status Draft** | `slate-500` / `slate-100` | `#64748b` | Editable, uncommitted draft orders. |
| **Warning / Alert**| `amber-500` / `amber-50` | `#f59e0b` | Low stock threshold warnings, inventory below reorder level. |
| **Danger / Error** | `rose-600` / `rose-50` | `#e11d48` | Rejection alerts, insufficient stock errors, delete actions. |

---

## 3. Typography Stack & Hierarchy

### 3.1 Font Families
* **Primary Sans-Serif:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`  
  Used for all user interface prose, labels, table headers, buttons, and navigation.
* **Monospace Stack:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`  
  Used for all SKUs (`RAW-STL-001`), order reference numbers (`REC-102934-821`), database ports (`5433`), and timestamps.

### 3.2 Type Scale

| Style | Tailwind Classes | Size / Line Height | Usage |
| :--- | :--- | :--- | :--- |
| **Page Title** | `text-2xl font-bold text-slate-900` | 24px / 32px | Top-level view headers (e.g., "Product Catalog"). |
| **Section Title**| `text-lg font-semibold text-slate-800` | 18px / 28px | Modal titles, card section headers. |
| **Body Bold** | `text-sm font-semibold text-slate-700` | 14px / 20px | Table row primary titles, input labels. |
| **Body Regular** | `text-sm text-slate-600` | 14px / 20px | Standard descriptions, secondary table columns. |
| **Metadata / Pill**| `text-xs font-medium` | 12px / 16px | Status pills, breadcrumbs, table column headers. |
| **Monospace SKU**| `font-mono text-xs font-bold text-slate-800` | 12px / 16px | Product SKUs, reference tracking numbers. |

---

## 4. Layout Architecture & App Shell

```
┌────────────────────────────────────────────────────────────────────────┐
│ Topbar: [Logo] | [● PostgreSQL Port: 5433] | [User Role] | [Logout]   │
├───────────────┬────────────────────────────────────────────────────────┤
│ Sidebar       │ Main Content Canvas (Scrollable)                       │
│               │                                                        │
│ [Dashboard]   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ [Products]    │  │ KPI 1    │ │ KPI 2    │ │ KPI 3    │ │ KPI 4    │   │
│ [Receipts]    │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│ [Deliveries]  │                                                        │
│ [Transfers]   │  ┌──────────────────────────────────────────────────┐  │
│ [Adjustments] │  │ Filter / Action Bar: [Search] [Export] [+ Create]│  │
│ [Ledger]      │  ├──────────────────────────────────────────────────┤  │
│ [Settings]    │  │ Data Table / Operational Grid                    │  │
│               │  │                                                  │  │
│               │  └──────────────────────────────────────────────────┘  │
└───────────────┴────────────────────────────────────────────────────────┘
```

* **Sidebar Navigation:** Persistent on desktop (`lg:w-64`), collapses into an overlay drawer on mobile. Features active link backgrounding and icon accents.
* **Sticky Topbar:** Always visible. Contains the real-time database heartbeat indicator, authenticated operator name, role badge, and quick logout.
* **Main Canvas:** Structured grid container (`max-w-7xl mx-auto`) with responsive horizontal and vertical padding.

---

## 5. Design System Components

### 5.1 KPI Summary Cards
* White background, subtle border (`border-slate-200`), and lightweight drop shadow (`shadow-xs`).
* Composed of:
  1. Icon container with translucent tinted background (`bg-emerald-500/10`).
  2. Large metric numeral (`text-2xl font-bold`).
  3. Clear descriptive subtitle (`text-xs text-slate-500`).

### 5.2 Operational Data Tables
* High density: 40px–48px row height.
* Alternating hover states (`hover:bg-slate-50/75`).
* Right-aligned numeric data and actionable buttons.
* Monospaced, bold SKU identifiers for instant visual recognition.

### 5.3 Status Badges (Pills)
* Rounded capsule geometry (`rounded-full px-2.5 py-0.5 text-xs font-medium`).
* **Draft:** Gray background (`bg-slate-100 text-slate-700 border-slate-200`).
* **Ready:** Blue background (`bg-blue-50 text-blue-700 border-blue-200`).
* **Done:** Emerald background (`bg-emerald-50 text-emerald-700 border-emerald-200`).

### 5.4 Modal Dialogs
* Full-screen backdrop overlay with dark opacity (`bg-slate-900/60 backdrop-blur-xs`).
* Centered card container (`max-w-2xl w-full bg-white rounded-xl shadow-xl`).
* Header with explicit document title and close button.
* Body with key-value metadata grid and itemized SKU table.
* Footer with primary CTA (e.g., `Validate & Increase Stock`), secondary print button, and dismiss action.

---

## 6. Printable Document Specifications

Warehouse documents must print reliably on both laser printers and thermal receipt printers without requiring third-party PDF plugins:

* **Output Media:** Standard A4 or US Letter paper via browser `window.print()`.
* **Print Styling:**
  * Strict monochrome black-and-white (`#000` on `#fff`).
  * Removed shadows, gradients, and interactive hover backgrounds.
  * Formatted header: Company title, document classification, reference number barcode box, validation timestamp.
  * Dual physical signature boxes: Dispatcher / Receiving Officer and Carrier / Customer Representative.

---

## 7. Accessibility & Evaluator Ergonomics

* **One-Click Judge Fast-Fill:** The login interface features quick-fill buttons for `Manager Demo` (`manager@stocksense.com`) and `Staff Demo` (`staff@stocksense.com`), allowing evaluators to bypass credential typing.
* **Visual Status Feedback:** Clear banner notifications with icon indicators upon validation errors (e.g., `Insufficient stock. Available: 20 kg, Requested: 25 kg`).
* **No Layout Shift:** Dynamic metric cards display skeleton placeholders during initial API fetches, preventing content jumping.
