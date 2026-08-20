using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Data;

public class PayrollDbContext(
    DbContextOptions<PayrollDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<PayrollParameter> PayrollParameters => Set<PayrollParameter>();
    public DbSet<PayrollRun> PayrollRuns => Set<PayrollRun>();
    public DbSet<EmployeePayroll> EmployeePayrolls => Set<EmployeePayroll>();
    public DbSet<PayrollEarning> PayrollEarnings => Set<PayrollEarning>();
    public DbSet<PayrollDeduction> PayrollDeductions => Set<PayrollDeduction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. PayrollParameter
        modelBuilder.Entity<PayrollParameter>(entity =>
        {
            entity.ToTable("payroll_parameters");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Year).HasColumnName("year").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(100).IsRequired();
            entity.Property(e => e.MinWageGross).HasColumnName("min_wage_gross").HasPrecision(12, 2);
            entity.Property(e => e.MinWageNet).HasColumnName("min_wage_net").HasPrecision(12, 2);
            entity.Property(e => e.SgkFloor).HasColumnName("sgk_floor").HasPrecision(12, 2);
            entity.Property(e => e.SgkCeiling).HasColumnName("sgk_ceiling").HasPrecision(12, 2);
            entity.Property(e => e.SgkEmployeeRate).HasColumnName("sgk_employee_rate").HasPrecision(5, 4);
            entity.Property(e => e.UnemploymentEmployeeRate).HasColumnName("unemployment_employee_rate").HasPrecision(5, 4);
            entity.Property(e => e.SgkEmployerRate).HasColumnName("sgk_employer_rate").HasPrecision(5, 4);
            entity.Property(e => e.SgkEmployerDiscount5510Rate).HasColumnName("sgk_employer_discount_5510_rate").HasPrecision(5, 4);
            entity.Property(e => e.UnemploymentEmployerRate).HasColumnName("unemployment_employer_rate").HasPrecision(5, 4);
            entity.Property(e => e.StampTaxRate).HasColumnName("stamp_tax_rate").HasPrecision(6, 5);
            entity.Property(e => e.BesDefaultRate).HasColumnName("bes_default_rate").HasPrecision(5, 4);
            entity.Property(e => e.TaxBracket1Limit).HasColumnName("tax_bracket_1_limit").HasPrecision(12, 2);
            entity.Property(e => e.TaxBracket1Rate).HasColumnName("tax_bracket_1_rate").HasPrecision(5, 4);
            entity.Property(e => e.TaxBracket2Limit).HasColumnName("tax_bracket_2_limit").HasPrecision(12, 2);
            entity.Property(e => e.TaxBracket2Rate).HasColumnName("tax_bracket_2_rate").HasPrecision(5, 4);
            entity.Property(e => e.TaxBracket3Limit).HasColumnName("tax_bracket_3_limit").HasPrecision(12, 2);
            entity.Property(e => e.TaxBracket3Rate).HasColumnName("tax_bracket_3_rate").HasPrecision(5, 4);
            entity.Property(e => e.TaxBracket4Limit).HasColumnName("tax_bracket_4_limit").HasPrecision(12, 2);
            entity.Property(e => e.TaxBracket4Rate).HasColumnName("tax_bracket_4_rate").HasPrecision(5, 4);
            entity.Property(e => e.TaxBracket5Rate).HasColumnName("tax_bracket_5_rate").HasPrecision(5, 4);
            entity.Property(e => e.MinWageTaxExemption).HasColumnName("min_wage_tax_exemption").HasPrecision(12, 2);
            entity.Property(e => e.MinWageStampExemption).HasColumnName("min_wage_stamp_exemption").HasPrecision(12, 2);
            entity.Property(e => e.MealExemptionDaily).HasColumnName("meal_exemption_daily").HasPrecision(10, 2);
            entity.Property(e => e.TravelExemptionDaily).HasColumnName("travel_exemption_daily").HasPrecision(10, 2);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. PayrollRun
        modelBuilder.Entity<PayrollRun>(entity =>
        {
            entity.ToTable("payroll_runs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Year).HasColumnName("year").IsRequired();
            entity.Property(e => e.Month).HasColumnName("month").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TotalEmployees).HasColumnName("total_employees");
            entity.Property(e => e.TotalGross).HasColumnName("total_gross").HasPrecision(14, 2);
            entity.Property(e => e.TotalNet).HasColumnName("total_net").HasPrecision(14, 2);
            entity.Property(e => e.TotalSgkEmployee).HasColumnName("total_sgk_employee").HasPrecision(14, 2);
            entity.Property(e => e.TotalSgkEmployer).HasColumnName("total_sgk_employer").HasPrecision(14, 2);
            entity.Property(e => e.TotalIncomeTax).HasColumnName("total_income_tax").HasPrecision(14, 2);
            entity.Property(e => e.TotalStampTax).HasColumnName("total_stamp_tax").HasPrecision(14, 2);
            entity.Property(e => e.TotalEmployerCost).HasColumnName("total_employer_cost").HasPrecision(14, 2);
            entity.Property(e => e.CalculatedAt).HasColumnName("calculated_at");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(e => e.ApprovedByUserName).HasColumnName("approved_by_user_name").HasMaxLength(255);
            entity.Property(e => e.LockedAt).HasColumnName("locked_at");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.EmployeePayrolls)
                  .WithOne(e => e.PayrollRun)
                  .HasForeignKey(e => e.PayrollRunId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. EmployeePayroll
        modelBuilder.Entity<EmployeePayroll>(entity =>
        {
            entity.ToTable("employee_payrolls");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.PayrollRunId).HasColumnName("payroll_run_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.EmployeeNumber).HasColumnName("employee_number").HasMaxLength(100);
            entity.Property(e => e.TcIdentityNumber).HasColumnName("tc_identity_number").HasMaxLength(11);
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(255);
            entity.Property(e => e.JobTitle).HasColumnName("job_title").HasMaxLength(255);
            entity.Property(e => e.Iban).HasColumnName("iban").HasMaxLength(50);
            entity.Property(e => e.ContractSalaryType).HasColumnName("contract_salary_type").HasMaxLength(20).IsRequired();
            entity.Property(e => e.BaseSalary).HasColumnName("base_salary").HasPrecision(12, 2);

            entity.Property(e => e.WorkedDays).HasColumnName("worked_days").HasPrecision(4, 1);
            entity.Property(e => e.WeekendDays).HasColumnName("weekend_days").HasPrecision(4, 1);
            entity.Property(e => e.HolidayDays).HasColumnName("holiday_days").HasPrecision(4, 1);
            entity.Property(e => e.PaidLeaveDays).HasColumnName("paid_leave_days").HasPrecision(4, 1);
            entity.Property(e => e.UnpaidLeaveDays).HasColumnName("unpaid_leave_days").HasPrecision(4, 1);
            entity.Property(e => e.SickLeaveDays).HasColumnName("sick_leave_days").HasPrecision(4, 1);
            entity.Property(e => e.TotalPaidDays).HasColumnName("total_paid_days").HasPrecision(4, 1);
            entity.Property(e => e.OvertimeHours).HasColumnName("overtime_hours").HasPrecision(5, 2);

            entity.Property(e => e.NormalGross).HasColumnName("normal_gross").HasPrecision(12, 2);
            entity.Property(e => e.OvertimeGross).HasColumnName("overtime_gross").HasPrecision(12, 2);
            entity.Property(e => e.BonusGross).HasColumnName("bonus_gross").HasPrecision(12, 2);
            entity.Property(e => e.MealAllowanceGross).HasColumnName("meal_allowance_gross").HasPrecision(12, 2);
            entity.Property(e => e.TravelAllowanceGross).HasColumnName("travel_allowance_gross").HasPrecision(12, 2);
            entity.Property(e => e.OtherGross).HasColumnName("other_gross").HasPrecision(12, 2);
            entity.Property(e => e.TotalGross).HasColumnName("total_gross").HasPrecision(12, 2);

            entity.Property(e => e.SgkBase).HasColumnName("sgk_base").HasPrecision(12, 2);
            entity.Property(e => e.SgkEmployeeDeduction).HasColumnName("sgk_employee_deduction").HasPrecision(12, 2);
            entity.Property(e => e.UnemploymentEmployeeDeduction).HasColumnName("unemployment_employee_deduction").HasPrecision(12, 2);

            entity.Property(e => e.PriorCumulativeIncomeTaxBase).HasColumnName("prior_cumulative_income_tax_base").HasPrecision(14, 2);
            entity.Property(e => e.CurrentIncomeTaxBase).HasColumnName("current_income_tax_base").HasPrecision(12, 2);
            entity.Property(e => e.CurrentCumulativeIncomeTaxBase).HasColumnName("current_cumulative_income_tax_base").HasPrecision(14, 2);
            entity.Property(e => e.CalculatedIncomeTax).HasColumnName("calculated_income_tax").HasPrecision(12, 2);
            entity.Property(e => e.MinWageIncomeTaxExemption).HasColumnName("min_wage_income_tax_exemption").HasPrecision(12, 2);
            entity.Property(e => e.PayableIncomeTax).HasColumnName("payable_income_tax").HasPrecision(12, 2);

            entity.Property(e => e.CalculatedStampTax).HasColumnName("calculated_stamp_tax").HasPrecision(12, 2);
            entity.Property(e => e.MinWageStampTaxExemption).HasColumnName("min_wage_stamp_tax_exemption").HasPrecision(12, 2);
            entity.Property(e => e.PayableStampTax).HasColumnName("payable_stamp_tax").HasPrecision(12, 2);

            entity.Property(e => e.BesDeduction).HasColumnName("bes_deduction").HasPrecision(12, 2);
            entity.Property(e => e.IcraDeduction).HasColumnName("icra_deduction").HasPrecision(12, 2);
            entity.Property(e => e.AdvanceDeduction).HasColumnName("advance_deduction").HasPrecision(12, 2);
            entity.Property(e => e.PrivateHealthInsuranceDeduction).HasColumnName("private_health_insurance_deduction").HasPrecision(12, 2);
            entity.Property(e => e.TotalDeductions).HasColumnName("total_deductions").HasPrecision(12, 2);

            entity.Property(e => e.NetSalary).HasColumnName("net_salary").HasPrecision(12, 2);
            entity.Property(e => e.PayableNetSalary).HasColumnName("payable_net_salary").HasPrecision(12, 2);

            entity.Property(e => e.SgkEmployerDeduction).HasColumnName("sgk_employer_deduction").HasPrecision(12, 2);
            entity.Property(e => e.SgkEmployerDiscount5510).HasColumnName("sgk_employer_discount_5510").HasPrecision(12, 2);
            entity.Property(e => e.UnemploymentEmployerDeduction).HasColumnName("unemployment_employer_deduction").HasPrecision(12, 2);
            entity.Property(e => e.TotalEmployerCost).HasColumnName("total_employer_cost").HasPrecision(12, 2);

            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Earnings)
                  .WithOne(e => e.EmployeePayroll)
                  .HasForeignKey(e => e.EmployeePayrollId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Deductions)
                  .WithOne(e => e.EmployeePayroll)
                  .HasForeignKey(e => e.EmployeePayrollId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. PayrollEarning
        modelBuilder.Entity<PayrollEarning>(entity =>
        {
            entity.ToTable("payroll_earnings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeePayrollId).HasColumnName("employee_payroll_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(e => e.IsSgkExempt).HasColumnName("is_sgk_exempt");
            entity.Property(e => e.IsTaxExempt).HasColumnName("is_tax_exempt");
            entity.Property(e => e.IsStampExempt).HasColumnName("is_stamp_exempt");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. PayrollDeduction
        modelBuilder.Entity<PayrollDeduction>(entity =>
        {
            entity.ToTable("payroll_deductions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeePayrollId).HasColumnName("employee_payroll_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(e => e.IsTaxDeductible).HasColumnName("is_tax_deductible");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            foreach (var entry in ChangeTracker.Entries<ITenantScopedEntity>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = currentTenant.Id.Value;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
