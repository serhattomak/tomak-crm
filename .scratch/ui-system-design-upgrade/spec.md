# Spec: UI System Design Standardizasyonu (Tooltips, Selects, Comboboxes, DatePickers, NumberInputs & Toaster/Confirm)

Status: ready-for-agent

## Problem Statement

Uygulama genelinde (Bordro, İzinler, Organizasyon, Müşteriler, Siparişler, Ürünler, Kullanıcılar ve Ayarlar sayfalarında) yer yer native HTML `<select>`, `<input type="number">`, `<input type="date">` elemanları ile tarayıcı varsayılanı `window.alert()` ve `window.confirm()` diyalogları kullanılmaktadır. Bu durum hem görsel bütünlüğü bozmakta (tutarsız tasarım), hem mobil ve erişilebilirlik (a11y) standartlarını karşılamamakta, hem de modern CRM deneyimine (glassmorphism, animasyonlar, klavye gezintisi, Türkçe yerelleştirme, zengin bildirimler) uymamaktadır.

## Solution

Tüm uygulamayı kapsayan, `@workspace/ui/components` altında Radix UI primitives ve Tailwind CSS (OKLCH tokenları) ile güçlendirilmiş, state-of-the-art tasarım sistemine sahip ortak bileşen paketi oluşturulacak ve tüm sayfalardaki ham elemanlar bu bileşenlerle modernize edilecektir.

Sistem bileşenleri şunları içerir:
1. **`Tooltip`**: Radix Tooltip tabanlı, gecikme süreli (delayDuration: 150ms), mikro-gölgeli, kısayol tuşu (⌘K) rozet destekli ipuçları.
2. **`Select`**: Radix Select tabanlı, şık açılır menülü, grup başlıklı, ikon ve durum rozeti destekli seçim bileşeni.
3. **`Combobox`**: Arama ve filtreleme özellikli, klavye gezintisi (Yukarı/Aşağı/Enter) destekli, boş durum (Empty State) mesajlı aranabilir seçici.
4. **`DatePicker` & `DateRangePicker`**: Türkçe ay/gün yerelleştirmeli, hızlı filtre presetleri ("Bugün", "Dün", "Bu Hafta", "Bu Ay", "Geçen Ay", "Son 30 Gün") içeren popover takvim seçicisi.
5. **`NumberInput` / `CurrencyInput`**: Artırma/azaltma step butonlu, para birimi (₺/TRY) veya birim (saat, gün, adet) ön/son eki destekli, ondalık hassasiyetli sayısal giriş alanı.
6. **`Toast` (Sonner)**: Global Toaster entegrasyonu, `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()` metodları ile zengin ikonlu ve animasyonlu bildirimler.
7. **`ConfirmDialog`**: `window.confirm()` yerine kullanılan, tehlikeli (Destructive/Silme) veya onaylama eylemleri için modal onay penceresi.

## User Stories

1. As a User, I want hover tooltips on icon buttons and compact UI elements, so that I can instantly understand their functions with helpful shortcut hints.
2. As an HR/Payroll Manager, I want rich select dropdowns with employee avatars, status colors, and clean typography, so that dropdown menus look cohesive with the overall design.
3. As a Sales/Order Specialist, I want searchable comboboxes for customers and products, so that I can quickly find records in large lists without scrolling through hundreds of items.
4. As an HR Specialist, I want single and date-range pickers with Turkish day/month names and quick presets ("Bu Ay", "Geçen Ay"), so that I can select payroll and leave periods with one click.
5. As a Payroll Officer, I want number inputs with currency (₺) formatting, step increments (+/-), and min/max limits, so that entering salaries, worked days, and overtime hours is seamless and error-free.
6. As a User, I want all system alerts and errors to appear as elegant toast notifications in the top-right corner, so that I get immediate visual feedback without annoying browser modal interruptions.
7. As a User, I want destructive actions (deleting runs, cancelling leaves, removing employees) to prompt a sleek confirmation dialog with clear consequence warnings, so that accidental data loss is prevented.

## Implementation Decisions

### 1. Component Library Architecture (`@workspace/ui`)
- **Package**: `packages/ui`
- **Dependencies**: Radix UI primitives (`@radix-ui/react-tooltip`, `@radix-ui/react-select`, `@radix-ui/react-popover`, `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`), `sonner` for toast notifications, `clsx` and `tailwind-merge`.
- **Styling**: Strict adherence to `packages/ui/src/styles/globals.css` with OKLCH variables, rounded corners (`rounded-xl`/`rounded-2xl`), border transitions, subtle micro-animations.

### 2. Concrete Components to Create in `packages/ui/src/components/`:
- `tooltip.tsx`: Exporting `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`.
- `select.tsx`: Exporting `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`.
- `combobox.tsx`: Exporting `Combobox` (with search input, options list, value display, placeholder, onSelect).
- `date-picker.tsx`: Exporting `DatePicker` and `DateRangePicker` (with calendar grid, month/year navigation, quick preset chips).
- `number-input.tsx`: Exporting `NumberInput` (with stepper buttons, prefix/suffix e.g. `₺`, `saat`, `gün`, min/max validation).
- `confirm-dialog.tsx`: Exporting `ConfirmDialog` (with title, description, confirmText, cancelText, variant: default/destructive, loading state).
- `sonner.tsx`: Exporting `Toaster` and re-exporting `toast` from Sonner with themed styling.

### 3. Application-Wide Integration (`apps/web`)
- **Global Layout**: Mount `<Toaster richColors position="top-right" />` in `apps/web/app/(dashboard)/layout.tsx`.
- **Page Transformations**:
  - **`payroll/page.tsx`**: Replace native selects with `Select` & `Combobox`, number fields with `NumberInput`, confirmation prompts (`window.confirm`) with `ConfirmDialog` and error/success alerts with `toast.success` / `toast.error`.
  - **`leaves/page.tsx`**: Replace native inputs and selects with `DatePicker`, `Select`, `ConfirmDialog`, `toast`.
  - **`organization/page.tsx`**, **`customers/page.tsx`**, **`orders/page.tsx`**, **`products/page.tsx`**, **`users/page.tsx`**, **`roles/page.tsx`**: Standardize all controls.

## Testing Decisions

- **Visual & Interaction Testing**:
  - Verify keyboard navigation on Select, Combobox, DatePicker, and Tooltip (Escape, Enter, Arrow keys, Tab order).
  - Verify Turkish date formatting and correct calendar alignment for leap years and month transitions.
  - Verify NumberInput stepper increment/decrement and precision clamping.
  - Verify ConfirmDialog open/close lifecycle and async loading state during server action calls.
  - Verify Toast notification triggers on success, warning, error, and info scenarios.
- **Type Checking**:
  - Run `turbo typecheck` and `npm exec -- ultracite check` across all packages to guarantee zero TypeScript or accessibility lint errors.

## Out of Scope

- Modifying the underlying backend C# API schemas (all frontend migrations preserve existing API contracts).

## Further Notes

- All components will support both light and dark mode seamlessly via CSS variables.
- Popovers and dropdowns will automatically handle collision avoidance (flipped alignment when near screen boundaries).
