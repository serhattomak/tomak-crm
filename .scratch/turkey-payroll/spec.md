# Spec: Türkiye Standartlarında Bordro Yönetimi (Turkey Payroll System)

Status: ready-for-agent

## Problem Statement

Modern Türk iş mevzuatı ve vergi/sosyal güvenlik kanunlarına (5510 Sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu, 193 Sayılı Gelir Vergisi Kanunu, 488 Sayılı Damga Vergisi Kanunu ve 7349 Sayılı Asgari Ücret Vergi İstisnası Kanunu) tam uyumlu, hem Brüt'ten Net'e hem Net'ten Brüt'e hatasız hesaplama yapabilen, kümülatif vergi matrahlarını dinamik takip eden, ek kazanç/kesinti ve puantajları yönetebilen, resmi bordro pusulası (PDF) üreten ve İK onay-kesinleştirme süreçlerini uçtan uca yöneten bir bordro modülü eksiktir.

## Solution

Sisteme çok kiracılı (multi-tenant) mimaride çalışan, Türkiye standartlarında parametrik ve çift yönlü çalışan bağımsız bir `CRM.Modules.Payroll` backend modülü ile Next.js tabanlı kapsamlı bir bordro yönetim paneli ve çalışan self-servis arayüzü kazandırılacaktır.

Bu çözüm;
1. **Dinamik Mevzuat Parametreleri (Yıl/Dönem bazlı):** Asgari ücret, SGK tavan/taban, vergi dilimleri (%15, %20, %27, %35, %40), istisnalar (yemek, yol, asgari ücret istisnası), BES oranları.
2. **Gelişmiş Hesaplama Motoru (Gross-to-Net & Net-to-Gross):** 
   - SGK İşçi (%14) & İşsizlik İşçi (%1)
   - Kümülatif Gelir Vergisi Matrahı ve 7349 sayılı Asgari Ücret Gelir Vergisi İstisnası
   - Damga Vergisi (Binde 7,59) ve Asgari Ücret Damga Vergisi İstisnası
   - SGK İşveren Payı (%20,5 veya 5510 %5 Hazine Teşviki ile %15,5) & İşveren İşsizlik Payı (%2)
   - İşverene Toplam Maliyet hesabı
   - Otomatik BES (%3), İcra kesintisi, avans, özel sağlık/hayat sigortası vergi indirimi
3. **Bordro Dönemleri ve Puantaj İş Akışı:** Dönem açılışı -> Puantaj / Gün girişi -> Toplu Taslak Hesaplama -> İK İnceleme & Onay -> Kesinleştirme (Kilit) -> Muhasebe & Banka İcmali.
4. **Resmi Format Bordro Zarfı (PDF):** İş Kanununa uygun, QR/Barkod uyumlu, resmi bordro pusulası oluşturma ve indirme.
5. **Çalışan Self-Servis Portalı:** Çalışanın geçmiş bordrolarını görüntüleyebilmesi ve PDF olarak indirebilmesi.

## User Stories

1. As an HR Manager, I want to create a monthly payroll run for a specific year and month, so that I can process salaries for all active employees in my organization.
2. As an HR Manager, I want the system to calculate payroll both from Gross-to-Net and Net-to-Gross, so that employees with either contract type get exact accurate salaries.
3. As a Payroll Specialist, I want cumulative income tax bases (kümülatif gelir vergisi matrahı) to automatically roll over month-to-month across the calendar year, so that income tax brackets (%15, %20, %27, %35, %40) apply strictly per Turkish tax laws.
4. As a Payroll Specialist, I want monthly minimum wage tax exemptions (7349 Sayılı Asgari Ücret Gelir ve Damga Vergisi İstisnası) applied automatically, so that statutory exemptions are calculated without manual effort.
5. As an HR Specialist, I want to input monthly timesheet data (normal days, weekend work, public holidays, paid leave, unpaid leave, sick leave), so that gross pay is prorated according to 30 statutory days.
6. As a Payroll Specialist, I want to add additional earnings (overtime pay, performance bonuses, monthly travel allowance, meal allowance) with proper tax/SGK exempt threshold handling.
7. As a Payroll Specialist, I want to manage statutory and voluntary deductions (Auto-enrollment BES %3, court bailiff/icra deductions, salary advances, private health insurance tax deductions).
8. As a Finance Manager, I want the system to calculate 5510 %5 Treasury incentive on employer SGK contributions, so that accurate total employer cost (İşveren Maliyeti) is reflected in accounting reports.
9. As an HR Manager, I want to review payroll calculations in a draft state and make adjustments before locking, so that mistakes can be corrected before disbursement.
10. As an HR Manager, I want to approve and lock a payroll run, so that finalized records cannot be tampered with or modified accidentally.
11. As an HR Specialist, I want to generate and download official Turkish payslips (Bordro Zarfı / Pusulası) as printable PDFs for any employee.
12. As a Finance Officer, I want to export monthly payroll summary reports (İcmal Tablosu) in Excel/CSV formats compatible with bank payment files and SGK declaration schemas.
13. As an Employee, I want to log into my portal and view all my historical payslips, so that I can verify my salary, taxes, and social security deductions.
14. As an Employee, I want to download my individual monthly payslip as a PDF, so that I can present it for visa, banking, or personal records.
15. As a System/Tenant Admin, I want to configure annual statutory parameters (minimum wage, SGK caps, tax brackets, exemption limits), so that the system remains compliant when annual legislation changes.

## Implementation Decisions

### 1. Architectural Placement & Modularity
- A new standalone backend module `CRM.Modules.Payroll` will be created in `crm-monorepo/apps/api/src/Modules/CRM.Modules.Payroll` following the monorepo's CQRS, EF Core, and FastEndpoints/IEndpoint architecture.
- Full tenant isolation using `ITenantScopedEntity` across all payroll entities.
- Clean separation between core calculation engine (`IPayrollCalculationEngine`), timesheet aggregation, and workflow state machine (Draft -> Calculated -> Approved -> Locked).

### 2. Domain & Data Schema
- **`PayrollParameter`**: Stores yearly/period-specific parameters (Minimum Wage, SGK Floor/Ceiling, Tax Brackets, Meal/Travel Exemption Caps, 5510 Incentive Rate, BES Rate).
- **`PayrollPeriod` / `PayrollRun`**: Represents a payroll cycle for a tenant (Year, Month, Status: Draft/Calculated/Approved/Locked, TotalGross, TotalNet, TotalEmployerCost, CalculatedAt, ApprovedBy).
- **`EmployeePayroll`**: The central calculation record per employee for a run:
  - Working & Leave days breakdown (Normal, Weekend, Holiday, Unpaid, Sick)
  - Base Salary (Contract Type: Gross or Net)
  - Calculated Gross Earnings & Total Gross
  - SGK Employee Base & SGK Employee Deduction (%14)
  - Unemployment Employee Base & Deduction (%1)
  - Cumulative Income Tax Base Prior & Current
  - Calculated Income Tax & 7349 Minimum Wage Income Tax Exemption
  - Payable Income Tax
  - Calculated Stamp Tax & Minimum Wage Stamp Tax Exemption
  - Payable Stamp Tax
  - Additional Earnings Breakdown (Bonuses, Overtime, Meal, Travel)
  - Deductions Breakdown (BES %3, İcra, Advance, Insurance)
  - Net Payable Salary (Ödenecek Net Ücret)
  - SGK Employer Deduction & Unemployment Employer Deduction (with 5510 %5 incentive)
  - Total Employer Cost (Toplam İşveren Maliyeti)
- **`PayrollEarning`**: Itemized additional earnings attached to an `EmployeePayroll`.
- **`PayrollDeduction`**: Itemized deductions attached to an `EmployeePayroll`.

### 3. Calculation Engine (Turkey Standards)
- Deterministic stateless engine `TurkeyPayrollEngine` implementing `IPayrollCalculationEngine`.
- Handles Gross -> Net exact formula and Net -> Gross iterative Newton-Raphson / binary search convergence for mixed bracket jumps with exemptions.
- Automatically handles 7349 tax exemption formula where exemption equals the tax that would have been paid on the minimum wage at the employee's current cumulative bracket.

### 4. API Endpoints
- `GET /api/v1/payroll/parameters?year={year}` & `PUT /api/v1/payroll/parameters`
- `GET /api/v1/payroll/runs` & `POST /api/v1/payroll/runs` (Create monthly run)
- `POST /api/v1/payroll/runs/{id}/calculate` (Execute batch calculation)
- `POST /api/v1/payroll/runs/{id}/approve` & `POST /api/v1/payroll/runs/{id}/lock`
- `GET /api/v1/payroll/runs/{id}` (Details with employee items)
- `GET /api/v1/payroll/runs/{id}/export/icmal` (Excel/CSV export)
- `GET /api/v1/payroll/payslips/{id}` & `GET /api/v1/payroll/payslips/{id}/pdf`
- `GET /api/v1/payroll/my-payslips` (Employee self-service)
- `POST /api/v1/payroll/simulate` (Live gross/net calculator for HR/Employees)

### 5. Frontend UI & Experience
- Dashboard at `apps/web/app/(dashboard)/[tenantSlug]/payroll/`:
  - **Runs Dashboard**: Monthly payroll list, progress indicators, status badges, totals summary cards.
  - **Payroll Run Detail & Puantaj Table**: Comprehensive interactive data grid with inline adjustments for days, overtime, bonuses, deductions, and one-click recalculate.
  - **Simulator Screen**: Live gross <-> net interactive salary calculator with toggleable parameters (benefits, BES, disability/exemptions).
  - **Payslip Viewer & PDF generator**: Official Turkish standard payslip layout with clean printable CSS/PDF format.
  - **Self-Service Payslip Page**: Simple, secure employee view with history and instant PDF download.
  - **Parameters Admin**: Annual settings table pre-populated with 2025/2026 legal constants.

## Testing Decisions

- **Unit Testing Calculation Engine**:
  - Test Gross-to-Net standard minimum wage calculations against official Revenue Administration (GİB) published tables.
  - Test high-income brackets transitioning through 15% -> 20% -> 27% -> 35% -> 40%.
  - Test Net-to-Gross inversion accuracy (within 0.01 TRY delta).
  - Test 5510 %5 incentive and employer cost calculations.
  - Test partial month / unpaid leave prorated 30-day base.
- **Integration Testing API Endpoints**:
  - Test multi-tenant isolation on payroll runs and payslips.
  - Test workflow state machine (cannot edit locked run, cannot approve without calculation).
- **Frontend Verification**:
  - Verify UI responsiveness, table filtering, instant calculation feedback, and print/PDF rendering.

## Out of Scope

- Direct bank API EFT/FAST auto-wire automation (Exporting standard bank TXT/Excel is in scope).
- SGK E-Bildirge direct automated robotic SOAP login (Standard SGK XML/Excel export format is in scope).
- Severance & Notice Pay (Kıdem ve İhbar Tazminatı) legal dispute calculation engine (can be added as an extension).

## Further Notes

- All monetary calculations will use 64-bit `decimal` in C# and proper 2-decimal rounded formatting for final amounts to prevent floating-point drift.
- Seed data will include official 2025 and 2026 statutory rates and tax brackets for immediate out-of-the-box readiness.
