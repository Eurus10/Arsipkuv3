# Implementation Plan - Move Search Bar to Navbar and Clean Dashboard Banner

## User Request Summary
1. Move the search bar ("Cari seluruh dokumen...") from the dashboard banner to the top navigation bar (`Navbar.tsx`), positioned right next to the QRIS button.
2. Remove duplicate controls from the banner (search bar, date pill, Muzaki/QRIS profile pill, notification bell, and logout button) since they are already available in the top navbar.
3. Keep the dashboard banner clean, displaying only the branding header, title, description, and "Ganti Banner" button.

## Proposed Changes

### 1. State Management (`src/App.tsx`)
- Lift the `globalSearch` and `setGlobalSearch` state up from `DashboardView` to `App.tsx` so it can be passed to both `Navbar` and `DashboardView`.

### 2. Top Navigation Bar (`src/components/Navbar.tsx`)
- Add `globalSearch` and `onGlobalSearchChange` props to `NavbarProps`.
- Insert the search input bar right beside the QRIS button in the right-hand action controls area.
- Include a clear (X) button when search text is present.

### 3. Dashboard Banner (`src/components/DashboardView.tsx`)
- Remove the search bar, date pill, Muzaki/QRIS profile pill, notification bell, and logout button from the banner controls area.
- Keep the banner structure clean and focused solely on the portal title, description, badge, and admin "Ganti Banner" button.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify linter with `lint_applet`.
- Visually verify that the search bar is located in the top navbar next to QRIS, and the dashboard banner is clean.
