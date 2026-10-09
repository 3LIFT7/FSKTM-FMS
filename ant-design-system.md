# Design System: Ant Design (FSKTM Facility Booking & Maintenance System)

> Instructions for an AI coding agent. Follow this file for ALL frontend UI work.

## 1. Context

Web app for FSKTM UTHM: lab/classroom booking, device tracking, damage reporting, maintenance logs, and role-based admin.

- Frontend: React (Vite) + Ant Design v5 + Tailwind CSS (layout utilities only)
- Backend: Node.js/Express, PostgreSQL, JWT (separate; do not change)
- Roles: `Student`, `Lecturer`, `Technician`, `Manager`

## 2. Rules

1. Use Ant Design components for all UI elements (buttons, forms, tables, modals, tags, etc.). Do not build custom versions of things Ant already has.
2. All colors, radius, and fonts come from the theme in `src/theme.js`. No hard-coded hex colors in components.
3. Tailwind is for spacing and layout only (`flex`, `grid`, `gap-4`, `p-4`, `mb-6`). Never use Tailwind to restyle Ant components.
4. Import only what you need: `import { Button, Table } from 'antd'`.
5. Use `dayjs` for all dates and times. Display format: `DD/MM/YYYY` and `HH:mm`.
6. Status is always shown with `<StatusTag />` so colors stay identical on every screen.
7. Every status badge has a text label, never color alone.
8. All forms use Ant `Form` with `rules` for validation and show loading state on submit.
9. Use `message` for quick feedback, `notification` for alerts, `Popconfirm` before destructive actions.
10. Responsive: layouts must work at 375px width (use `Grid`, `Col xs/md/lg`, and collapsible `Sider`).

## 3. Setup

```bash
npm install antd @ant-design/icons dayjs
```

### `src/theme.js`

```js
export const theme = {
  token: {
    colorPrimary: '#1E3A8A',
    colorSuccess: '#16A34A', // Available, Resolved
    colorWarning: '#F59E0B', // Maintenance, In Progress
    colorError: '#DC2626',   // Broken, Open
    colorInfo: '#2563EB',    // Booked
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  components: {
    Layout: { siderBg: '#172554', headerBg: '#FFFFFF' },
    Menu: { darkItemBg: '#172554', darkItemSelectedBg: '#1E3A8A' },
    Table: { headerBg: '#F3F4F6' },
  },
};
```

### `src/main.jsx`

```jsx
import { ConfigProvider } from 'antd';
import en_GB from 'antd/locale/en_GB';
import { theme } from './theme';

<ConfigProvider theme={theme} locale={en_GB}>
  <App />
</ConfigProvider>
```

## 4. Status Colors

| Status | Ant color | Used for |
|---|---|---|
| Available | success | Rooms, devices |
| Booked | processing | Rooms |
| Maintenance | warning | Rooms, devices |
| Broken | error | Devices |
| Checked Out | processing | Devices |
| Open | error | Issue reports |
| In Progress | warning | Issue reports |
| Resolved | success | Issue reports |
| Closed | default | Issue reports |

### `src/components/StatusTag.jsx`

```jsx
import { Tag } from 'antd';

const COLORS = {
  Available: 'success', Booked: 'processing', Maintenance: 'warning',
  Broken: 'error', 'Checked Out': 'processing',
  Open: 'error', 'In Progress': 'warning', Resolved: 'success', Closed: 'default',
};

export default function StatusTag({ status }) {
  return <Tag color={COLORS[status] || 'default'}>{status}</Tag>;
}
```

## 5. Layout

Two layouts, chosen by role after login:

- **Student / Lecturer:** simple layout with top `Header` navigation and centered `Content` (max-width 1200px).
- **Technician / Manager:** dashboard layout with dark collapsible `Sider` on the left, `Header` with notification bell (`Badge`) and user `Dropdown`, `Content` on the right.

Separate login pages for Student and Lecturer. After login, route by role.

### Role-based menu

```js
export const menus = {
  Student:    ['dashboard', 'availability', 'my-bookings', 'report-issue'],
  Lecturer:   ['dashboard', 'availability', 'book-room', 'my-bookings', 'report-issue'],
  Technician: ['dashboard', 'bookings', 'devices', 'reports', 'maintenance'],
  Manager:    ['dashboard', 'bookings', 'devices', 'reports', 'maintenance', 'users', 'import', 'analytics'],
};
```

Filter `Menu` items with `menus[user.role]`. Also guard routes, not just menu items.

## 6. Component Map by Module

| Module | Ant Design components |
|---|---|
| Login | `Form`, `Input.Password`, `Button`, `Card`, `Alert` |
| App layout | `Layout`, `Sider`, `Header`, `Menu`, `Avatar`, `Dropdown`, `Badge` |
| Lab/Classroom booking | `Calendar`, `DatePicker.RangePicker`, `TimePicker`, `Modal`, `Form`, `Select`, `Tag` |
| Floor map side panel | `Drawer`, `Descriptions`, `StatusTag` |
| Device booking & tracking | `Table` (search/filter), `StatusTag`, `Popconfirm`, `QRCode`, `Input.Search` |
| Damage reporting | `Form`, `Upload` (photo), `Steps`, `Timeline`, `Select` |
| Maintenance logs | `Table`, `Timeline`, `DatePicker`, `InputNumber` (cost) |
| User & role admin | `Table`, `Select`, `Switch`, `Modal` |
| CSV schedule import | `Upload.Dragger`, `Table` (preview), `Alert`, `Progress`, `Button` |
| Reports & analytics | `Statistic`, `Card`, `Tabs`, Ant Design Charts or Recharts |
| Notifications | `notification`, `message`, `Badge` |

## 7. Page Patterns

**List page** (devices, bookings, reports, logs): page title + primary action button on top, filter row (`Input.Search`, `Select`, `RangePicker`), then `Table` with pagination, `StatusTag` column, and row actions.

**Form page / modal:** single column `Form layout="vertical"`, required marks, inline validation, `Button type="primary"` for submit and a default button for cancel.

**Detail view:** `Descriptions` for fields, `Timeline` for history, action buttons by role.

**Dashboard:** row of `Statistic` cards, then a chart and a recent-activity `Table`.

**Empty / loading / error:** use `Empty`, `Skeleton` / `Spin`, and `Result` or `Alert`. Never leave a blank screen.

## 8. Business UI Rules

- Rooms under active maintenance are hidden from the booking calendar (do not show them as selectable).
- Prevent double-booking: show conflicts with an `Alert` inside the booking `Modal`.
- Overdue devices: red `Tag` with "Overdue" and days late.
- Students only see their own bookings and reports.
- Device booking by students may show "Request" instead of "Book", depending on policy.
- Show buttons only for actions the current role is allowed to do.

## 9. Folder Structure

```
src/
  theme.js
  components/    StatusTag.jsx, PageHeader.jsx, ...
  layouts/       StaffLayout.jsx, UserLayout.jsx
  pages/         login/, dashboard/, bookings/, devices/, reports/, maintenance/, admin/
  routes/        ProtectedRoute.jsx (role guard)
  api/           axios instance, one file per module
  utils/         date.js (dayjs helpers)
```

## 10. Build Order

1. Theme, `ConfigProvider`, `StatusTag`
2. Login pages and role routing
3. Layouts (staff and user) with role-based menu
4. Booking calendar and booking modal
5. Device list, checkout/return
6. Issue report form and ticket list
7. Maintenance logs
8. Admin: users, CSV import, reports

## 11. Definition of Done

- Uses only theme tokens, no hard-coded colors
- Works on mobile (375px) and desktop
- Has loading, empty, and error states
- Forms validate and show clear error messages
- Respects role permissions in menu, routes, and buttons
