# Design Guidelines: Hotel/Facility Management System

## Design Approach

**Selected Framework**: Material Design 3
**Rationale**: Optimal for information-dense, productivity-focused applications with real-time updates. Provides robust patterns for complex data tables, status indicators, and multi-level navigation required for role-based workflows.

**Core Principles**:
- Clarity over decoration - prioritize readability and scanability
- Consistent visual hierarchy across all role dashboards
- Immediate visual feedback for real-time status changes
- Mobile-first approach for field workers and technicians

## Typography System

**Font Family**: Roboto (primary), Roboto Mono (for IDs, timestamps)

**Hierarchy**:
- Page Headers: text-3xl font-medium (Dashboard titles, main sections)
- Section Headers: text-xl font-semibold (Widget titles, panel headers)
- Card Titles: text-lg font-medium (Task cards, list items)
- Body Text: text-base font-normal (Descriptions, messages)
- Labels: text-sm font-medium uppercase tracking-wide (Form labels, status badges)
- Metadata: text-sm (Timestamps, user names, secondary info)
- Captions: text-xs (Helper text, tooltips)

## Layout & Spacing System

**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 (cards), p-6 (panels), p-8 (page containers)
- Stack spacing: space-y-4 (compact lists), space-y-6 (sections), space-y-8 (major divisions)
- Grid gaps: gap-4 (tight grids), gap-6 (card grids)
- Margins: mb-4, mb-6, mb-8 for vertical rhythm

**Container Strategy**:
- Dashboard: Full-width with max-w-screen-2xl mx-auto px-4
- Forms/Modals: max-w-2xl for single-column, max-w-4xl for two-column
- Task details: max-w-4xl mx-auto
- Data tables: w-full with horizontal scroll on mobile

**Grid Systems**:
- Dashboard widgets: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Task cards: grid-cols-1 lg:grid-cols-2 gap-4
- Stat counters: grid-cols-2 md:grid-cols-4 gap-4
- User list: Single column with dividers

## Component Library

### Navigation
**Top Bar** (fixed, h-16):
- Logo/Brand (left)
- Role indicator badge
- Language switcher (SR/EN toggle)
- Notification bell with badge counter
- User avatar with dropdown menu

**Sidebar** (w-64, collapsible to w-16):
- Primary navigation links with icons
- Active state: subtle background indicator
- Section dividers for role-specific areas
- Collapse/expand toggle at bottom

### Dashboard Components

**Stat Cards** (Role-specific KPIs):
- Icon (top-left, 48px)
- Large number (text-3xl font-bold)
- Label below (text-sm)
- Trend indicator if applicable
- Padding: p-6

**Task List Widget**:
- Scrollable container (max-h-96)
- Each item: py-3 px-4
- Left: Priority indicator (4px vertical bar)
- Title + truncated description
- Right: Status badge + timestamp
- Hover state for entire row

**Activity Timeline**:
- Vertical line with dots
- Icon for each action type
- Timestamp (text-xs)
- Action description
- User name in bold
- Photos displayed inline if present

**Quick Actions Panel**:
- Grid of action buttons (2x2 or 3x2)
- Icon above text
- Distinct from primary buttons
- Padding: p-4 per button

### Task Management

**Task Card** (List View):
- Header: Title + Priority badge + ID
- Body: Description (2-line truncate), Location, Room number
- Footer: Assignee avatar + name, Status badge, Deadline with overdue warning
- Actions: Three-dot menu (top-right)
- Border-left: 4px indicator based on priority

**Task Detail Panel** (Slide-over or Modal):
- Header: Title, ID, Status dropdown, Actions menu
- Tabbed sections:
  - Overview: All metadata in two-column grid
  - Timeline: Vertical timeline of all actions
  - Messages: Chat-like interface with input at bottom
  - Photos: Grid gallery with lightbox
  - Costs: Table with add button
- Fixed footer with primary actions

**Status Workflow Indicator**:
- Horizontal stepper showing task lifecycle
- Completed steps: solid indicators
- Current step: pulsing indicator
- Future steps: outlined indicators
- Lines connecting steps

### Forms

**Task Creation Form**:
- Single column layout
- Label above each field (text-sm font-medium)
- Required asterisks
- Input fields: h-10, px-3
- Textareas: min-h-24
- Select dropdowns: Custom styled
- Photo upload: Drag-drop zone with previews
- Actions: Right-aligned, Cancel + Submit

**Filter Panel** (Collapsible):
- Multiple select groups
- Clear all button
- Apply filters (sticky at bottom on mobile)
- Chip display of active filters above content

### Notifications

**Notification Center** (Dropdown):
- Header with mark all read + settings
- List (max-h-96 overflow-scroll)
- Unread: slightly elevated appearance
- Each: Icon (left) + Title + Message + Timestamp
- Click opens related task
- Empty state with illustration

**Toast Notifications** (Real-time):
- Top-right positioning
- Auto-dismiss after 5s (except errors)
- Icon + Message + Action button (optional)
- Stacking: max 3, older ones compress

### Data Tables

**Task Table**:
- Sticky header
- Sortable columns
- Checkbox selection
- Row actions (three-dot menu)
- Pagination at bottom
- Mobile: Transform to stacked cards
- Columns: ID, Title, Status, Priority, Assignee, Deadline, Actions

**Responsive Behavior**:
- Desktop: Full table
- Tablet: Hide less critical columns
- Mobile: Card layout with key info visible, expand for details

### User Management (Admin)

**User List**:
- Search bar at top
- Filter by role/department/status
- Table with: Avatar, Name, Email, Role, Department, Status toggle
- Inline edit or modal edit
- Add user button (top-right)

### Mobile Optimization

**Bottom Navigation** (Mobile only, h-16):
- 4-5 primary actions with icons + labels
- Active state indicator
- Replace sidebar on mobile

**Mobile Task Cards**:
- Full-width
- Larger touch targets (min-h-12)
- Swipe actions: Left (complete), Right (reassign)
- Expanded view on tap

## Real-time Indicators

**Live Status Updates**:
- Smooth transition animations (300ms)
- Badge color shifts for status changes
- Notification badge pulse on new items
- Subtle row highlight on data update

**Presence Indicators**:
- Small dot on user avatars (online/offline/busy)
- Last seen timestamp on hover

## Accessibility

- Focus states: 2px outline with offset
- Keyboard navigation throughout
- ARIA labels on icon-only buttons
- Skip to main content link
- Form validation messages below fields
- Contrast ratios meeting WCAG AA
- Screen reader announcements for real-time updates

## Images

**No Hero Image**: This is an operational dashboard, not a marketing site. Focus on data density and functionality.

**Photo Galleries** (Task Documentation):
- Grid: grid-cols-2 md:grid-cols-3 gap-2
- Thumbnail: aspect-square, object-cover
- Lightbox on click with navigation
- Upload placeholder: dashed border with icon + text

**User Avatars**:
- Circular, multiple sizes (32px, 40px, 48px)
- Fallback: initials on solid background
- Online indicator (8px dot, bottom-right)

**Empty States**:
- Centered icon (96px) + heading + description + action
- Illustrations for: No tasks, No notifications, No messages

## Animation Guidelines

Use sparingly for functional feedback only:
- Status badge transitions: 200ms ease
- Card hover lift: 150ms ease
- Dropdown/modal entrance: 200ms ease-out
- Page transitions: None (instant navigation)
- Loading states: Skeleton screens, not spinners