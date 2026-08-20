using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Payroll.Entities;

[Table("payroll_parameters", Schema = "public")]
public class PayrollParameter : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public int Year { get; set; }
    public string Title { get; set; } = "Türkiye Yasal Parametreleri";
    
    // Asgari Ücret ve SGK Sınırları
    public decimal MinWageGross { get; set; } = 26005.50m;
    public decimal MinWageNet { get; set; } = 22104.68m;
    public decimal SgkFloor { get; set; } = 26005.50m;
    public decimal SgkCeiling { get; set; } = 195041.25m;
    
    // Oranlar
    public decimal SgkEmployeeRate { get; set; } = 0.1400m;
    public decimal UnemploymentEmployeeRate { get; set; } = 0.0100m;
    public decimal SgkEmployerRate { get; set; } = 0.2050m;
    public decimal SgkEmployerDiscount5510Rate { get; set; } = 0.0500m;
    public decimal UnemploymentEmployerRate { get; set; } = 0.0200m;
    public decimal StampTaxRate { get; set; } = 0.00759m;
    public decimal BesDefaultRate { get; set; } = 0.0300m;
    
    // Gelir Vergisi Dilimleri
    public decimal TaxBracket1Limit { get; set; } = 158000.00m;
    public decimal TaxBracket1Rate { get; set; } = 0.1500m;
    
    public decimal TaxBracket2Limit { get; set; } = 380000.00m;
    public decimal TaxBracket2Rate { get; set; } = 0.2000m;
    
    public decimal TaxBracket3Limit { get; set; } = 1400000.00m;
    public decimal TaxBracket3Rate { get; set; } = 0.2700m;
    
    public decimal TaxBracket4Limit { get; set; } = 4300000.00m;
    public decimal TaxBracket4Rate { get; set; } = 0.3500m;
    
    public decimal TaxBracket5Rate { get; set; } = 0.4000m;
    
    // Asgari Ücret İstisnaları (7349 Sayılı Kanun)
    public decimal MinWageTaxExemption { get; set; } = 3315.70m;
    public decimal MinWageStampExemption { get; set; } = 197.38m;
    
    // Günlük Yan Hak İstisnaları
    public decimal MealExemptionDaily { get; set; } = 240.00m;
    public decimal TravelExemptionDaily { get; set; } = 126.00m;
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("payroll_runs", Schema = "public")]
public class PayrollRun : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft, Calculated, Approved, Locked
    
    public int TotalEmployees { get; set; }
    public decimal TotalGross { get; set; }
    public decimal TotalNet { get; set; }
    public decimal TotalSgkEmployee { get; set; }
    public decimal TotalSgkEmployer { get; set; }
    public decimal TotalIncomeTax { get; set; }
    public decimal TotalStampTax { get; set; }
    public decimal TotalEmployerCost { get; set; }
    
    public DateTime? CalculatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }
    public DateTime? LockedAt { get; set; }
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<EmployeePayroll> EmployeePayrolls { get; set; } = [];
}

[Table("employee_payrolls", Schema = "public")]
public class EmployeePayroll : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid PayrollRunId { get; set; }
    public Guid EmployeeId { get; set; }
    
    // Snapshot Bilgileri
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeNumber { get; set; }
    public string? TcIdentityNumber { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? JobTitle { get; set; }
    public string? Iban { get; set; }
    public string ContractSalaryType { get; set; } = "Gross"; // Gross, Net
    public decimal BaseSalary { get; set; }
    
    // Puantaj / Gün Dağılımı (30 Gün Standart Esası)
    public decimal WorkedDays { get; set; } = 22.0m;
    public decimal WeekendDays { get; set; } = 8.0m;
    public decimal HolidayDays { get; set; } = 0.0m;
    public decimal PaidLeaveDays { get; set; } = 0.0m;
    public decimal UnpaidLeaveDays { get; set; } = 0.0m;
    public decimal SickLeaveDays { get; set; } = 0.0m;
    public decimal TotalPaidDays { get; set; } = 30.0m;
    public decimal OvertimeHours { get; set; } = 0.0m;
    
    // Brüt Kazançlar
    public decimal NormalGross { get; set; }
    public decimal OvertimeGross { get; set; }
    public decimal BonusGross { get; set; }
    public decimal MealAllowanceGross { get; set; }
    public decimal TravelAllowanceGross { get; set; }
    public decimal OtherGross { get; set; }
    public decimal TotalGross { get; set; }
    
    // SGK ve İşsizlik Kesintileri
    public decimal SgkBase { get; set; }
    public decimal SgkEmployeeDeduction { get; set; } // %14
    public decimal UnemploymentEmployeeDeduction { get; set; } // %1
    
    // Gelir Vergisi ve Kümülatif Matrah
    public decimal PriorCumulativeIncomeTaxBase { get; set; }
    public decimal CurrentIncomeTaxBase { get; set; }
    public decimal CurrentCumulativeIncomeTaxBase { get; set; }
    public decimal CalculatedIncomeTax { get; set; }
    public decimal MinWageIncomeTaxExemption { get; set; } // 7349 İstisnası
    public decimal PayableIncomeTax { get; set; }
    
    // Damga Vergisi
    public decimal CalculatedStampTax { get; set; }
    public decimal MinWageStampTaxExemption { get; set; } // 7349 İstisnası
    public decimal PayableStampTax { get; set; }
    
    // Özel Kesintiler
    public decimal BesDeduction { get; set; } // %3
    public decimal IcraDeduction { get; set; }
    public decimal AdvanceDeduction { get; set; }
    public decimal PrivateHealthInsuranceDeduction { get; set; }
    public decimal TotalDeductions { get; set; }
    
    // Net Maaş
    public decimal NetSalary { get; set; }
    public decimal PayableNetSalary { get; set; }
    
    // İşveren Maliyeti Kalemleri
    public decimal SgkEmployerDeduction { get; set; } // %20.5
    public decimal SgkEmployerDiscount5510 { get; set; } // %5 İndirimi
    public decimal UnemploymentEmployerDeduction { get; set; } // %2
    public decimal TotalEmployerCost { get; set; }
    
    public string Status { get; set; } = "Calculated";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public PayrollRun? PayrollRun { get; set; }
    public ICollection<PayrollEarning> Earnings { get; set; } = [];
    public ICollection<PayrollDeduction> Deductions { get; set; } = [];
}

[Table("payroll_earnings", Schema = "public")]
public class PayrollEarning : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid EmployeePayrollId { get; set; }
    public string Type { get; set; } = "Bonus"; // Bonus, Overtime, Meal, Travel, Premium, Other
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsSgkExempt { get; set; }
    public bool IsTaxExempt { get; set; }
    public bool IsStampExempt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public EmployeePayroll? EmployeePayroll { get; set; }
}

[Table("payroll_deductions", Schema = "public")]
public class PayrollDeduction : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid EmployeePayrollId { get; set; }
    public string Type { get; set; } = "BES"; // BES, Icra, Advance, Insurance, Union, Other
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsTaxDeductible { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public EmployeePayroll? EmployeePayroll { get; set; }
}
