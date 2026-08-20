using CRM.Modules.Payroll.Entities;

namespace CRM.Modules.Payroll.Services;

public record PayrollCalculationInput(
    decimal BaseSalary,
    string ContractSalaryType = "Gross", // "Gross" or "Net"
    decimal WorkedDays = 22m,
    decimal WeekendDays = 8m,
    decimal HolidayDays = 0m,
    decimal PaidLeaveDays = 0m,
    decimal UnpaidLeaveDays = 0m,
    decimal SickLeaveDays = 0m,
    decimal OvertimeHours = 0m,
    decimal BonusGross = 0m,
    decimal MealAllowance = 0m,
    decimal TravelAllowance = 0m,
    decimal OtherGross = 0m,
    decimal PriorCumulativeIncomeTaxBase = 0m,
    bool Apply5510Incentive = true,
    bool HasBes = false,
    decimal BesRate = 0.03m,
    decimal IcraDeduction = 0m,
    decimal AdvanceDeduction = 0m,
    decimal PrivateHealthInsurance = 0m);

public record PayrollCalculationResult(
    decimal BaseSalary,
    string ContractSalaryType,
    decimal TotalPaidDays,
    decimal WorkedDays,
    decimal WeekendDays,
    decimal HolidayDays,
    decimal PaidLeaveDays,
    decimal UnpaidLeaveDays,
    decimal SickLeaveDays,
    decimal OvertimeHours,
    decimal NormalGross,
    decimal OvertimeGross,
    decimal BonusGross,
    decimal MealAllowanceGross,
    decimal TravelAllowanceGross,
    decimal OtherGross,
    decimal TotalGross,
    decimal SgkBase,
    decimal SgkEmployeeDeduction,
    decimal UnemploymentEmployeeDeduction,
    decimal PriorCumulativeIncomeTaxBase,
    decimal CurrentIncomeTaxBase,
    decimal CurrentCumulativeIncomeTaxBase,
    decimal CalculatedIncomeTax,
    decimal MinWageIncomeTaxExemption,
    decimal PayableIncomeTax,
    decimal CalculatedStampTax,
    decimal MinWageStampTaxExemption,
    decimal PayableStampTax,
    decimal BesDeduction,
    decimal IcraDeduction,
    decimal AdvanceDeduction,
    decimal PrivateHealthInsuranceDeduction,
    decimal TotalDeductions,
    decimal NetSalary,
    decimal PayableNetSalary,
    decimal SgkEmployerDeduction,
    decimal SgkEmployerDiscount5510,
    decimal UnemploymentEmployerDeduction,
    decimal TotalEmployerCost);

public interface IPayrollCalculationEngine
{
    PayrollCalculationResult Calculate(PayrollCalculationInput input, PayrollParameter param);
    PayrollCalculationResult Simulate(PayrollCalculationInput input, PayrollParameter param);
}

public class TurkeyPayrollEngine : IPayrollCalculationEngine
{
    public PayrollCalculationResult Calculate(PayrollCalculationInput input, PayrollParameter param)
    {
        if (input.ContractSalaryType.Equals("Net", StringComparison.OrdinalIgnoreCase))
        {
            return CalculateFromNet(input, param);
        }

        return CalculateFromGross(input, param);
    }

    public PayrollCalculationResult Simulate(PayrollCalculationInput input, PayrollParameter param)
    {
        return Calculate(input, param);
    }

    private PayrollCalculationResult CalculateFromGross(PayrollCalculationInput input, PayrollParameter param)
    {
        // 1. Gün ve Puantaj Dağılımı (30 Gün Esası)
        var unpaidDays = Math.Clamp(input.UnpaidLeaveDays, 0m, 30m);
        var paidDays = Math.Clamp(30m - unpaidDays, 0m, 30m);
        var dayRatio = paidDays / 30m;

        // 2. Normal ve Ek Brüt Kazançlar
        var normalGross = Math.Round(input.BaseSalary * dayRatio, 2);
        
        // Fazla mesai saati ücreti = (Aylık Brüt / 225) * 1.5 * Saat
        var hourlyRate = input.BaseSalary > 0 ? (input.BaseSalary / 225m) : 0m;
        var overtimeGross = Math.Round(hourlyRate * 1.5m * input.OvertimeHours, 2);
        
        var bonusGross = Math.Round(input.BonusGross, 2);
        var mealGross = Math.Round(input.MealAllowance, 2);
        var travelGross = Math.Round(input.TravelAllowance, 2);
        var otherGross = Math.Round(input.OtherGross, 2);

        var totalGross = normalGross + overtimeGross + bonusGross + mealGross + travelGross + otherGross;

        // 3. SGK Matrahı ve Kesintileri
        var proratedSgkFloor = Math.Round(param.SgkFloor * dayRatio, 2);
        var proratedSgkCeiling = Math.Round(param.SgkCeiling * dayRatio, 2);

        // Yemek ve Yol istisnaları (SGK için)
        var workedDays = Math.Min(input.WorkedDays, paidDays);
        var mealSgkExemption = Math.Round(param.MealExemptionDaily * workedDays, 2);
        var taxableMealForSgk = Math.Max(0m, mealGross - mealSgkExemption);

        var rawSgkBase = normalGross + overtimeGross + bonusGross + taxableMealForSgk + otherGross;
        var sgkBase = Math.Clamp(rawSgkBase, proratedSgkFloor, proratedSgkCeiling);

        var sgkEmployee = Math.Round(sgkBase * param.SgkEmployeeRate, 2);
        var unemploymentEmployee = Math.Round(sgkBase * param.UnemploymentEmployeeRate, 2);
        var totalSgkEmployee = sgkEmployee + unemploymentEmployee;

        // 4. Gelir Vergisi Matrahı ve Kümülatif Hesaplama
        var mealTaxExemption = Math.Round(param.MealExemptionDaily * workedDays, 2);
        var taxableMealForTax = Math.Max(0m, mealGross - mealTaxExemption);

        var travelTaxExemption = Math.Round(param.TravelExemptionDaily * workedDays, 2);
        var taxableTravelForTax = Math.Max(0m, travelGross - travelTaxExemption);

        var taxBaseEarnings = normalGross + overtimeGross + bonusGross + taxableMealForTax + taxableTravelForTax + otherGross;
        var currentTaxBase = Math.Max(0m, taxBaseEarnings - totalSgkEmployee - input.PrivateHealthInsurance);

        var priorCumulative = input.PriorCumulativeIncomeTaxBase;
        var newCumulative = priorCumulative + currentTaxBase;

        var calculatedIncomeTax = CalculateProgressiveTax(priorCumulative, currentTaxBase, param);

        // 5. 7349 Asgari Ücret Gelir Vergisi İstisnası
        // İstisna tutarı asgari ücretin vergi tutarını aşamaz
        var minWageTaxExemption = Math.Min(calculatedIncomeTax, param.MinWageTaxExemption * dayRatio);
        minWageTaxExemption = Math.Round(minWageTaxExemption, 2);

        var payableIncomeTax = Math.Max(0m, calculatedIncomeTax - minWageTaxExemption);

        // 6. Damga Vergisi & İstisnası (Binde 7,59)
        var calculatedStampTax = Math.Round(totalGross * param.StampTaxRate, 2);
        var minWageStampExemption = Math.Min(calculatedStampTax, Math.Round(param.MinWageStampExemption * dayRatio, 2));
        var payableStampTax = Math.Max(0m, calculatedStampTax - minWageStampExemption);

        // 7. Özel Kesintiler (BES, İcra, Avans)
        var besDeduction = input.HasBes ? Math.Round(sgkBase * input.BesRate, 2) : 0m;
        var icraDeduction = Math.Round(input.IcraDeduction, 2);
        var advanceDeduction = Math.Round(input.AdvanceDeduction, 2);
        var privateHealthDeduction = Math.Round(input.PrivateHealthInsurance, 2);

        var statutoryDeductions = totalSgkEmployee + payableIncomeTax + payableStampTax;
        var netSalary = Math.Round(totalGross - statutoryDeductions, 2);

        var specialDeductions = besDeduction + icraDeduction + advanceDeduction + privateHealthDeduction;
        var payableNetSalary = Math.Round(netSalary - specialDeductions, 2);
        var totalDeductions = statutoryDeductions + specialDeductions;

        // 8. İşveren Maliyeti ve 5510 Teşviki
        var sgkEmployer = Math.Round(sgkBase * param.SgkEmployerRate, 2);
        var sgkEmployerDiscount5510 = input.Apply5510Incentive 
            ? Math.Round(sgkBase * param.SgkEmployerDiscount5510Rate, 2) 
            : 0m;
        var unemploymentEmployer = Math.Round(sgkBase * param.UnemploymentEmployerRate, 2);

        var totalEmployerCost = Math.Round(totalGross + (sgkEmployer - sgkEmployerDiscount5510) + unemploymentEmployer, 2);

        return new PayrollCalculationResult(
            BaseSalary: input.BaseSalary,
            ContractSalaryType: input.ContractSalaryType,
            TotalPaidDays: paidDays,
            WorkedDays: input.WorkedDays,
            WeekendDays: input.WeekendDays,
            HolidayDays: input.HolidayDays,
            PaidLeaveDays: input.PaidLeaveDays,
            UnpaidLeaveDays: input.UnpaidLeaveDays,
            SickLeaveDays: input.SickLeaveDays,
            OvertimeHours: input.OvertimeHours,
            NormalGross: normalGross,
            OvertimeGross: overtimeGross,
            BonusGross: bonusGross,
            MealAllowanceGross: mealGross,
            TravelAllowanceGross: travelGross,
            OtherGross: otherGross,
            TotalGross: totalGross,
            SgkBase: sgkBase,
            SgkEmployeeDeduction: sgkEmployee,
            UnemploymentEmployeeDeduction: unemploymentEmployee,
            PriorCumulativeIncomeTaxBase: priorCumulative,
            CurrentIncomeTaxBase: currentTaxBase,
            CurrentCumulativeIncomeTaxBase: newCumulative,
            CalculatedIncomeTax: calculatedIncomeTax,
            MinWageIncomeTaxExemption: minWageTaxExemption,
            PayableIncomeTax: payableIncomeTax,
            CalculatedStampTax: calculatedStampTax,
            MinWageStampTaxExemption: minWageStampExemption,
            PayableStampTax: payableStampTax,
            BesDeduction: besDeduction,
            IcraDeduction: icraDeduction,
            AdvanceDeduction: advanceDeduction,
            PrivateHealthInsuranceDeduction: privateHealthDeduction,
            TotalDeductions: totalDeductions,
            NetSalary: netSalary,
            PayableNetSalary: payableNetSalary,
            SgkEmployerDeduction: sgkEmployer,
            SgkEmployerDiscount5510: sgkEmployerDiscount5510,
            UnemploymentEmployerDeduction: unemploymentEmployer,
            TotalEmployerCost: totalEmployerCost);
    }

    private PayrollCalculationResult CalculateFromNet(PayrollCalculationInput input, PayrollParameter param)
    {
        var targetNet = input.BaseSalary;
        
        // Binary search to find gross that produces targetNet
        decimal low = targetNet;
        decimal high = targetNet * 2.5m;
        decimal grossGuess = targetNet * 1.4m;
        
        PayrollCalculationResult bestResult = null!;
        decimal bestDiff = decimal.MaxValue;

        for (int i = 0; i < 50; i++)
        {
            var testInput = input with { BaseSalary = grossGuess, ContractSalaryType = "Gross" };
            var result = CalculateFromGross(testInput, param);
            
            var currentNet = result.NetSalary;
            var diff = currentNet - targetNet;

            if (Math.Abs(diff) < Math.Abs(bestDiff))
            {
                bestDiff = diff;
                bestResult = result;
            }

            if (Math.Abs(diff) <= 0.005m)
            {
                break;
            }

            if (diff < 0)
            {
                low = grossGuess;
            }
            else
            {
                high = grossGuess;
            }

            grossGuess = Math.Round((low + high) / 2m, 2);
        }

        return bestResult with 
        { 
            BaseSalary = targetNet, 
            ContractSalaryType = "Net" 
        };
    }

    private static decimal CalculateProgressiveTax(decimal priorCumulative, decimal currentBase, PayrollParameter param)
    {
        if (currentBase <= 0) return 0m;

        decimal totalTax = 0m;
        decimal start = priorCumulative;
        decimal end = priorCumulative + currentBase;

        // Dilim 1: 0 - Bracket 1
        totalTax += CalculateBracketTax(start, end, 0m, param.TaxBracket1Limit, param.TaxBracket1Rate);

        // Dilim 2: Bracket 1 - Bracket 2
        totalTax += CalculateBracketTax(start, end, param.TaxBracket1Limit, param.TaxBracket2Limit, param.TaxBracket2Rate);

        // Dilim 3: Bracket 2 - Bracket 3
        totalTax += CalculateBracketTax(start, end, param.TaxBracket2Limit, param.TaxBracket3Limit, param.TaxBracket3Rate);

        // Dilim 4: Bracket 3 - Bracket 4
        totalTax += CalculateBracketTax(start, end, param.TaxBracket3Limit, param.TaxBracket4Limit, param.TaxBracket4Rate);

        // Dilim 5: > Bracket 4
        totalTax += CalculateBracketTax(start, end, param.TaxBracket4Limit, decimal.MaxValue, param.TaxBracket5Rate);

        return Math.Round(totalTax, 2);
    }

    private static decimal CalculateBracketTax(decimal start, decimal end, decimal bracketLower, decimal bracketUpper, decimal rate)
    {
        if (end <= bracketLower || start >= bracketUpper) return 0m;

        var effectiveStart = Math.Max(start, bracketLower);
        var effectiveEnd = Math.Min(end, bracketUpper);

        var taxableInBracket = effectiveEnd - effectiveStart;
        return taxableInBracket > 0 ? (taxableInBracket * rate) : 0m;
    }
}
