# Loading UX Plan — Skeleton vs Spinner (Full Project)

Status: implemented. Scope: all 5 panels + auth + shell.
Based on a full read of every view/component in `src/views`, `src/layouts`, `src/components/common`.
See §3 for the shipped primitives and §6 for phase status / deferred polish.

---

## 1. Current state (verified facts)

- **No spinner or skeleton component exists.** Every async area uses `<p class="muted">Loading…</p>`
  (55 occurrences across views) or shows nothing at all.
- Three loading patterns exist today:
  1. **Text swap** — loading text replaces the real layout (`v-if`/`v-else`), so the page jumps
     when data arrives (e.g. StudentDetailView, SalaryDetailView, SettingsView, all teacher "me" gates).
  2. **Silent loads** — data-dependent values render as `0` / empty-state / raw id until the
     query resolves, then snap to real values. Users briefly believe the data is empty.
     Examples: ParentDashboardView (all of it), TeacherDashboard/Schedule/Salary, AccountsView
     stat cards + head tables, FeeCollectView due amounts, AttendanceView "No students in this
     selection." row, AcademicsView "No classes yet…" flash.
  3. **Button text swap** — "Saving…", "Sending…", "Importing…", "Paying…", "Loading…" on exports.
     Plus `AppConfirmDialog`/`PublishExamDialog` busy states (good).
- **Two good dim patterns already exist** (keep + reuse): `DashboardView` attendance strip
  (`.att-strip--fetching` opacity) and `ReportsView` accounts grid (`.acc-grid--fetching` +
  "· Updating…" inline note).
- **Query layer** (`src/main.ts`): `staleTime: 30s`, `refetchOnWindowFocus: false`, retry ≤ 1.
  `useStudents`, `useTeachers`, `useRoutines`, `useAttendanceDay`, `useLedger`(list) use
  `placeholderData: (prev) => prev` → on filter/pagination refetch the old rows stay visible
  (`isLoading` is false). Other lists (Payments, SmsLogs, Dues, Catalog, Settings, Modules…)
  have no placeholder → the whole region swaps back to "Loading…" on every param change.
- **Polling**: only `useRecentAttendance` (DashboardView 15s, LiveAttendanceView 2s). Polling
  must never show skeletons (flicker).
- **Gaps that are not loading-states but surface as them**: `AppPagination` renders "0–0 of 0"
  while loading and has no busy prop; async `<select>` options render empty; several per-row
  actions have no busy state at all (see §5).

---

## 2. Decision framework

| Situation | Use | Why |
|---|---|---|
| **First load** of a region whose shape is known before data (fixed columns, card count, kv pairs, 7-day grids) | **Skeleton** | Prevents layout jump and the "empty/0 flash"; sets expectation of what is coming. |
| **First load** of a large content region (dashboard, detail page, printable sheet) | **Skeleton** | Same as above; skeleton mirrors final layout 1:1. |
| **Refetch while stale content is visible** (`placeholderData`, filter/page change) | **Dim + small spinner** (never full skeleton) | Full skeleton would flicker; user needs to know data is updating. |
| **User-triggered action** (save, send, pay, import, export, confirm in dialog) | **Spinner inside the button** + `disabled` + `aria-busy` | Feedback belongs at the point of action. |
| **Small option list / select options / autocomplete** | **Inline spinner in the control** (or "Searching…" row) | Region too small for a skeleton. |
| **Live/polling refresh** | **No skeleton** — keep content, optional tiny spinner/dim | Polling every 2–15s would otherwise flash constantly. |
| **Shape unknown / variable** (N+1 per-row loads, chart with dynamic legend) | **Spinner** or fixed-count skeleton approximation | Skeleton must not lie about structure. |
| **Loads finishing < ~200ms** | **Nothing** (delay skeletons/spinners by 150–200ms) | Avoids flicker on cache hits; `staleTime` is 30s so revisits are instant. |
| **Error / empty** | Keep existing empty states; never show a skeleton in place of an error | — |

Accessibility rules: skeletons get `aria-hidden="true"`; the loading region gets `aria-busy="true"`;
spinners get an accessible label via `role="status"`; all animation respects
`prefers-reduced-motion` (static pulse fallback).

---

## 3. Infrastructure (shipped)

1. **`AppSpinner.vue`** — sizes `sm / md / lg`, `label` prop (`role="status"`), optional `delay` (ms)
   to avoid flicker on fast loads; currentColor ring so it works on every button variant; static
   (non-spinning) under `prefers-reduced-motion`.
2. **`AppSkeleton.vue`** — variants: `text`, `lines` (n, last line 62%), `circle`, `chip`, `block`
   (height), `card`, `list` (n avatar rows), `table` (n rows × cols). Skeletons keep their layout
   space and fade in after a 150ms `delay`, so sub-150ms loads never flash; `aria-hidden`; pulse
   disabled under `prefers-reduced-motion`.
3. **`AppButton` `loading` prop** — prepends `<AppSpinner size="sm">`, disables the button,
   sets `aria-busy`; keeps current slot text (no need to remove every "Saving…" swap).
4. **`AppPagination` `busy` prop** — dims + locks the pager and prints "…" instead of "0–0 of 0"
   during a first load; views pass `:busy="isFetching"`.
5. **`useDebouncedRef(source, ms)`** — PaymentsView search/fee-type and SmsView history search fire
   once the user pauses (300ms), not per keystroke.
6. **Global CSS** — `.is-fetching` (dim regions that keep stale rows during a refetch) and
   `.sk-stack` (grid gap 16px for page-gate skeleton stacks) in `src/assets/main.css`.
7. **Scanner feedback** — `scannerPending` in `useCardScanner`; Admin/Live shells show an inline
   spinner in the reader status pill while a tap POST is in flight.
8. **Convention** — `isLoading` (no placeholder) → skeleton; `isFetching && hasData` → dim/spinner;
   actions → `AppButton :loading`; live/polling → no skeleton; errors/empty states never render
   skeletons.

---

## 4. Per-page / per-block mapping

Legend: **SK** = skeleton, **SP** = spinner (overlay/inline), **SPbtn** = spinner inside button,
**dim+SP** = keep stale content, dim + small spinner, **none** = nothing needed.

### 4.1 Admin — dashboard & students

| Page | Skeleton (first load) | Spinner | Notes / gaps to fix |
|---|---|---|---|
| DashboardView | stat grid (5 cards), attendance strip (4 chips), 2 chart cards (plot-area block), Top Dues / Live Attendance / Recent Students / Recent Exams list rows (4–5 each) | Live Attendance poll → tiny header spinner only; strip date change keeps existing dim | Stat grid + strip are fixed-count → ideal SK. List cards currently flash "No data." — gate them with the same SK. `attSumData`/`classData`/`settingsData` are silent lookups → leave silent. |
| StudentsView | table rows (10) + filter bar skeleton on very first load | filter/page refetch → dim+SP (placeholderData keeps rows); CSV/PDF → SPbtn; bulk Apply → SPbtn; delete dialog busy (existing) | Async selects (class/section/dept) → inline SP. |
| StudentDetailView | page head + Profile/Guardian/Subjects/Fees cards (fixed kv rows); Payment History table rows (4) | payments card has its own flag → SP/skeleton rows only in that card | class/dept lookups stay silent. Wrong/empty flash: payments load independently — keep skeleton until its own flag clears. |
| StudentEditView | form skeleton (2-col grid, 8 fields + photo block) | subject chips → SK chips (while `editSubjectsFetching`); meta selects → inline SP; Save → SPbtn; photo busy → small SP on the photo block | `editSubjectsFetching` already exists — just wire it to UI. |
| StudentAdmitView | subjects preview → SK chips (4); fee breakdown → SK rows (3) | meta selects → inline SP; Admit → SPbtn | Current "No fees set…"/"No subjects…" text flashes during load → gate with fetch flags (`subjectsFetching`, `catalogFetching` already exist). |
| StudentImportView | — | class/section selects → inline SP; Import → SPbtn | Page is otherwise static. |
| StudentCardsView | summary chips (2) + table rows (10) | refetch → dim+SP; per-row Remove → per-row SPbtn; modal Save → SPbtn | Chips currently read "0 assigned / 0 missing" → SK chips. |
| StudentAttendanceDetailView | 6 summary cards + calendar grid (7×5 cells) + recorded-days table rows | manual retry → keep error UI + SP; refetch keeps stale (already) | Calendar SK is the highest-value one (biggest layout jump today). |
| TeachersView | table rows (10) | refetch → dim+SP; Save → SPbtn; dialog busy (existing) | Salary-type select inside modal → inline SP (or preload silently; it loads on mount already). |
| TeacherCreateView | — | salary-type select → inline SP; Save → SPbtn | Pure form otherwise. |
| TeacherSubjectsView | assigned table rows + heading count | Assign → SPbtn; **unassign has no busy** → add per-row SPbtn; selects → inline SP; title "…" → SK text | Net: page needs skeleton + two busy gaps filled. |
| UsersView | role chips (4) + table rows (10) | Save → SPbtn; toggle status **no busy** → per-row SPbtn; delete dialog busy (existing); roster search inside modal (500-row lists) → inline SP if still loading | Client-side pagination — skeleton rows still correct (perPage fixed). |
| AcademicsView | Sessions list rows (3) + Classes table rows (6) | savingSession → SPbtn; reorder → overlay SP on the table while POSTing | Fix "No classes yet…" flash (gate with classData.isLoading). Sessions card currently renders empty — add SK. |

### 4.2 Admin — academics & exams (detail)

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| ClassCreateView | — | Create → SPbtn | Static form only. |
| ClassDetailView | hero block + Departments/Subjects/Sections list rows (3 each) | Add buttons currently disabled-only → inline SPbtn; Copying → SPbtn; dept toggle (async setter) → tiny SP next to checkbox | Whole page is gated by `classesLoading` today → replace text with page SK. |
| RoutineView | grid table rows (7 weekday rows × ~6 placeholder columns) + exam-mode group blocks (2) | filter/mode refetch → dim+SP; selects → inline SP; delete dialog busy | Grid columns are data-dependent — use a fixed 6-column approximation, NOT real headers. |
| RoutineFormView | form skeleton when `loadingEdit` (fixed grid) | every mapping select (sections/subjects/depts/teachers) → inline SP; teacher picker list → SK chips (4); Save → SPbtn | Many silent option loads; SP must be in-control (small), not page-level. |
| ExamsView | table rows (10) | refetch/class filter → dim+SP; Unpublish **no busy** → per-row SPbtn; publish dialog busy (existing) | Add an error branch (currently errors render as empty table) — not loading but same family. |
| ExamCreateView | subject-config rows (2–3) while class subjects load | selects → inline SP; Save → SPbtn | "No subjects set for this class…" flashes during load → gate on loading. |
| ExamDetailView | exam gate → page SK (head + setup card + marks card); marks table rows (8) | Save Marks → SPbtn (existing); fill/assign dialogs → dialog busy; teacher select in Assign dialog → inline SP | Marks table columns are dynamic (CQ/MCQ/all modes) → 5–6 column approximation. |
| ExamResultCardView | printable sheet SK (header 2 lines + table rows 10) | — | Static print view otherwise. |
| MeritListView | exam gate → head + meta chips SK; merit table rows (10) | Send Result SMS → SPbtn (existing); dialog busy | tplData gate stays silent. |
| ResultsView | table rows (8) | per-row cells (Appeared/Passed/%) → per-row mini SP or SK cells (N+1 loads today) | Bigger fix: consider a single aggregate endpoint; until then each row needs its own tiny indicator instead of "0/0/0%". |

### 4.3 Admin — attendance & live

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| AttendanceView | mark roster rows (8) + roster chips; Recent Summary rows (4); report table rows (8) | tap card → SPbtn; Close day → SPbtn; Save → SPbtn; all class/section/dept selects → inline SP | **Bug-class gap:** `studentData` is silent → "No students in this selection." row renders while loading. Gate combined. Report pagination already hidden while loading (keep). |
| AttendanceDayView | table rows (10) + the 4 tab-count chips | SMS confirm dialog busy (existing) | Tab counts show 0 → SK chips. Pagination renders "0–0 of 0" → AppPagination `busy`. |
| LiveAttendanceView | none (idle ring IS the placeholder by design) | optional tiny SP inside avatar while photo loads | Kiosk view is already flicker-free; do NOT add skeletons here. |
| StaffLiveAttendanceView | "Tapped today" table rows (5) + the count in the heading | Punch → small SPbtn + disable while posting (currently none); scan reader status → tiny SP in status pill | Table counts as first-load SK. |

### 4.4 Admin — fees, payments, payroll, finance

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| FeeCollectView | payment-history table rows (5); due-card amount lines (SK text) until receipts land | picker dropdown → "Searching…" row + inline SP; fee-name select → inline SP; Collect → SPbtn | Amounts deliberately defer (`hasBreakdown && !histData` guard) — pair with SK text so they don't show 0. |
| FeeDuesView | table rows (10) | — | Pagination "0–0 of 0" → `busy` prop. |
| FeeStructureView | overview table rows (8) + 2 count chips | Generate dues → SPbtn; modals → SPbtn (existing); dept select inside modal → inline SP; "Already set at ৳…" → SK text | Chips read 0 pre-load → SK. |
| FeeStructureSetupView | catalog table rows (6) incl. group header rows | per-row Save → row SPbtn (existing); All Save → SPbtn; Add → SPbtn (currently disabled-only); common-rows load → SK rows (2) | Class/dept selects → inline SP. |
| PaymentsView | table rows (10) | export buttons → SPbtn (existing text swap, upgrade to spinner); delete → dialog busy | **Keystroke bug:** every search/feeType keystroke replaces the table with "Loading…" → debounce 300ms + keep table + overlay SP. |
| PaymentBulkView | — | Import → SPbtn | Pure paste page. |
| PayrollView | salary-sheets table rows (6); staff-attendance roster rows (8); leaves table rows (5) | Save staff marks (top+bottom) → SPbtn; Approve/Reject **no busy** → per-row SPbtn | All three tables load on mount regardless of tab — skeletons per card. |
| SalaryDetailView | full page SK: head + Breakdown (6 kv rows) + Adjust form + Attendance card (5 kv rows) | Save changes → SPbtn; Mark paid → SPbtn; delete dialog busy | Best 1:1 skeleton candidate in the app (shape fully fixed). |
| AccountsView | 4 stat cards; both head-wise tables (3 rows each); heads-manager lists (3 items each); ledger table rows (8) | Save Opening / Save entry / Add Head → SPbtn; ledger refetch → dim+SP (placeholderData exists); modal head select → inline SP | Stats currently ৳0 → SK cards. Head Delete uses native `window.confirm()` → replace with AppConfirmDialog (busy state). |
| MonthlySheetView | draft table rows (8) + route-change reload → SK; created-sheets table rows (6) | per-row Mark paid → row SPbtn (existing); Save/Mark-all → SPbtn (existing); unpay dialog busy (existing) | `loadDraft` is a custom ref — same SK treatment. |
| ReportsView | stat cards (2–4 by module); both chart cards (fixed plot area); acc-grid 4 cards; mini-tables 3 cols × 4 rows | first accounts load → SK; refetch → keep existing "· Updating…" + opacity (good pattern, optionally add tiny SP next to the note) | Charts show "No data." while loading → gate with SK block. |
| ReceiptView | receipt sheet SK (header + 6 kv rows + 3 line rows) | — | "Still due after this receipt" block is a chained silent load → SK rows (2) or keep reserved space. |

### 4.5 Admin — SMS, events, settings

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| SmsView | Overview: balance chip + 3 stat cards + usage bar + snapshot chips; Templates list rows (3); History table rows (10) + 4 status chips | all Send buttons (×4) → SPbtn; roster boxes ("No one found." flash) → SK rows (fixed 260px box); template selects → inline SP; exam-mode result pills → inline SP; history search → debounce + overlay SP | Every tab's hooks fire on mount (`v-show` tabs) — skeletons must be per-tab-region, not page-wide. |
| EventsView | notice list rows (3, variable height → `list-rows` with 2-line height) | Save/Create → SPbtn; publish dialog "Working…/Sending…" → SPbtn (existing); Archive/Restore **no busy** → per-row SPbtn | After per-row actions keep list + dim instead of reload flash. |
| SettingsView | full page SK: Profile form fields, Holidays 7 day-rows + 2 span-rows, Password 3 inputs, Salary Types list rows (2) | all Save buttons → SPbtn; Add Salary Type → inline SPbtn; per-row Remove → per-row SPbtn (no busy today) | Whole grid gated today — full-page SK instead of "Loading…". |

### 4.6 Teacher panel

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| TeacherDashboardView | welcome line + 3 stat cards + Today's Schedule list rows (3) | — | `me` gate → SK (not text). Routines/leaves are silent → covered by stats SK; schedule currently flashes "No classes today." → gate. |
| TeacherScheduleView | 7 day-block headers + 1–2 rows each | — | Currently all days flash "No classes." → SK rows per day. |
| TeacherSalaryView | 3 stat cards + history table rows (6) | — | Silent salaries load → SK. |
| TeacherProfileView | kv card (6 fixed rows) | — | Pure 1:1 skeleton case. |
| TeacherLeavesView | leaves table rows (6) | Apply modal → SPbtn "Sending…" (existing); Add per-row nothing needed | me gate → SK. |
| TeacherExamsView | list table rows (8); detail mode: meta chips + subject tabs + 2-card grid SK; marks table rows (8) | Save config / Save Marks → SPbtn (existing, keep); Open → detail SK | Detail text-swap replaces whole layout today (`L49`) — biggest jump in this panel. |
| TeacherEventsView | notice list rows (3) | — | Same shape as parent events. |

### 4.7 Parent panel

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| ParentDashboardView | 4 stat cards + children list rows (2–3) | — | **Zero indicators today** → highest-value SK in this panel. Composite published-results chain → keep SK until settled. |
| ParentChildrenView | table rows (5) | — | Text-swap today → SK. |
| ParentChildDetailView | page head + Profile kv (5 rows) + Results table rows (4) + Payment History rows (4) | — | Payments card is silent → SK (fix "No payments yet." flash). Results card has own flag → SK only in that card. |
| ParentFeesView | kv 3 rows + payments table rows (4) | child select → inline SP while students load | Whole body absent until child selected → show kv/table SK once a child is defaulted. |
| ParentResultsView | filter row (static) + exam-card blocks (1–2 cards × 4 rows) | child select → inline SP | Nested AppCard structure → skeleton nested cards. |
| ParentRoutineView | 7 day blocks + 1–2 rows each | child select → inline SP | Currently one "Loading…" line replaces all 7 blocks → big jump. |
| ParentEventsView | notice list rows (3) | — | — |

### 4.8 Super-admin panel

| Page | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| SuperDashboardView | 5 stat cards | — | Cards show `0` today → SK. |
| SmsControlView | templates list rows (3, variable height) | Save → SPbtn (existing); delete dialog busy (existing) | Form + variable reference are static → no SK. |
| ModulesView | 7 module cards (catalog is static → exact-count SK!) | update → keep optimistic toggle + small SP on the clicked card (global disable today) | Cleanest skeleton case in the app. |
| SystemView | form skeleton (10 fields + 2 select rows) | Save → SPbtn (existing) | Whole card absent while loading today → SK. |

### 4.9 Auth, status, shell

| Area | Skeleton | Spinner | Notes / gaps |
|---|---|---|---|
| LoginView | — | Sign-in button → SPbtn (keep label swap too) | Already good. |
| StatusView | — | — | Static. |
| AdminLayout / LiveLayout | — | card-scanner status pill → tiny SP while tap POST is in flight (currently silent) | Nothing else async in layouts (module gating happens in the router guard before render). |
| TeacherLayout / ParentLayout / SuperAdminLayout | — | — | Static nav. |
| LiveLayout | — | school-name brand → optional SK text or keep "School" fallback | Single silent fetch; low priority. |
| App.vue / toasts | — | — | No async region. |
| AppButton | — | add `loading` prop (used everywhere above) | Required infra. |
| AppPagination | — | add `busy` prop; hide "0–0 of 0" on first load | Required infra. |

---

## 5. Cross-cutting fixes (independent of skeleton/spinner choice)

1. **Debounce search inputs** that re-key a query without `placeholderData`:
   `PaymentsView` (search + feeType), `SmsView` history (search), then show overlay SP
   instead of removing the table.
2. **Fix empty-state flashes** caused by ungated secondary queries:
   AttendanceView "No students in this selection.", AttendanceView "No attendance records yet.",
   AcademicsView "No classes yet…", ClassDetailView "No X yet…" lines, FeeStructureSetupView/AdmitView
   "No fees set…", SmsView "No one found.", ParentChildDetail "No payments yet.",
   ReportsView chart "No data.", DashboardView list cards.
   Rule: if a fetch for that region is in flight → SK, not empty state.
3. **Per-row action busy gaps** — DONE: per-row spinners added in TeacherSubjectsView (unassign),
   UsersView (activate/deactivate), PayrollView (leave approve/reject), SettingsView (salary-type
   remove), EventsView (archive/restore), ClassDetailView (subject remove + department toggle),
   ExamsView (unpublish), StaffLiveAttendanceView (punch). AccountsView head delete now uses the
   in-app confirm dialog (native `window.confirm` removed) with a busy state.
4. **Async selects** — deferred (optional polish): a uniform inline spinner slot for the
   class/section/department/subject/teacher/salary-type selects (~15 views). All of these fetch on
   mount and are cached afterwards (`staleTime` 30s), so the visible cost is limited to a cold first
   paint; wire them when those selects are next touched.
5. **Keep these existing patterns as the standard**: `AppConfirmDialog`/`PublishExamDialog` busy,
   `DashboardView` strip dim, `ReportsView` "· Updating…" + opacity, `placeholderData` stale rows.
6. **Accessibility**: `aria-busy` on loading regions, `aria-hidden` skeletons, `role="status"` +
   label on spinners, reduced-motion static states, `delay` prop (skeletons: 150ms) so fast loads
   never flash.

---

## 6. Implementation status

| Phase | Work | Status |
|---|---|---|
| **P0 — infra** | `AppSpinner`, `AppSkeleton`, `AppButton.loading`, `AppPagination.busy`, `useDebouncedRef`, `.is-fetching` / `.sk-stack` | ✅ shipped |
| **P1 — page gates** | Admin/Teacher/Parent/Super dashboards, StudentDetail, StudentEdit, SalaryDetail, SettingsView, SystemView, TeacherProfileView, ParentChildDetailView, ReceiptView, ReportCardView, ExamDetail/ResultCard, ModulesView | ✅ shipped |
| **P2 — list/table first loads** | Students, Teachers, Users, Payments, Exams, Events, FeeDues, FeeStructure(Setup), SmsView, SmsControl, Payroll (3 tables), Results, MeritList, TeacherExams, TeacherLeaves, ParentChildren/Fees/Results/Routine/Events, TeacherEvents, StaffLiveAttendance, AttendanceDay, Ledger | ✅ shipped |
| **P3 — silent-load gaps** | ParentDashboard, TeacherDashboard/Schedule/Salary, AccountsView stats/heads, DashboardView list cards, FeeCollect history, AttendanceView roster/summary, AcademicsView, AttendanceDay tab counts, MonthlySheetView, ReportsView charts/stats | ✅ shipped |
| **P4 — interactions** | debounce + dim (Payments, SmsView history), per-row busy gaps (§5.3), scanner pill spinner (Admin/Live shells), AppPagination `busy` wiring | ✅ shipped (async-select spinners deferred — §5.4) |
| **P5 — polish** | dashboard live-poll refresh spinner, reduced-motion handling in the new primitives, `npm run build` verified | ✅ shipped (avatar photo spinner in live views deferred — the idle/fallback avatar already covers that state) |
