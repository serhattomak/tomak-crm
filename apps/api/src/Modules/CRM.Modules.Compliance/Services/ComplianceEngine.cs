using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Data;
using CRM.Modules.Compliance.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Services;

public class ComplianceEngine(
    ComplianceDbContext dbContext,
    ICurrentTenant currentTenant) : IComplianceEngine
{
    public async Task EnsureDefaultRulesSeededAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenant.Id.HasValue) return;

        var count = await dbContext.Rules.CountAsync(cancellationToken);
        if (count > 0) return;

        var tenantId = currentTenant.Id.Value;
        var defaultRules = GetDefaultTurkishLaborLawRules(tenantId);

        dbContext.Rules.AddRange(defaultRules);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ComplianceValidationResult> ValidateShiftScheduleAsync(
        Guid employeeId,
        string employeeName,
        DateTime shiftStart,
        DateTime shiftEnd,
        double breakMinutes,
        double? currentWeekTotalHours = null,
        DateTime? previousShiftEnd = null,
        bool isPregnant = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRulesSeededAsync(cancellationToken);

        var result = new ComplianceValidationResult();
        var rules = await dbContext.Rules
            .Where(r => r.Category == "WorkingHours" && r.IsActive)
            .ToListAsync(cancellationToken);

        var totalShiftMinutes = (shiftEnd - shiftStart).TotalMinutes;
        var netWorkHours = Math.Max(0, (totalShiftMinutes - breakMinutes) / 60.0);

        // 1. Rule: Günlük 11 Saat Sınırı (4857 SK. Md. 63)
        var dailyRule = rules.FirstOrDefault(r => r.Code == "IK-4857-M63-DAILY");
        if (dailyRule != null && dailyRule.EnforcementLevel != "Disabled")
        {
            var threshold = dailyRule.GetThresholdConfig<WorkingHoursThresholdConfig>();
            if (netWorkHours > threshold.MaxDailyHours)
            {
                var isHard = dailyRule.EnforcementLevel == "HardBlock";
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = dailyRule.Code,
                    LawReference = dailyRule.LawReference,
                    RuleName = dailyRule.Name,
                    Category = dailyRule.Category,
                    Severity = isHard ? "CriticalRisk" : "Violation",
                    EnforcementLevel = dailyRule.EnforcementLevel,
                    Details = $"Günlük çalışma süresi ({netWorkHours:F1} saat), yasal azami sınır olan {threshold.MaxDailyHours} saati aşıyor.",
                    PenaltyRisk = dailyRule.PenaltyDescription,
                    ContextData = new()
                    {
                        ["netWorkHours"] = netWorkHours,
                        ["maxDailyHours"] = threshold.MaxDailyHours
                    }
                });
                if (isHard) result.HasHardBlock = true;
            }
        }

        // 2. Rule: Haftalık 45 Saat Sınırı (4857 SK. Md. 63)
        var weeklyRule = rules.FirstOrDefault(r => r.Code == "IK-4857-M63-WEEKLY");
        if (weeklyRule != null && weeklyRule.EnforcementLevel != "Disabled" && currentWeekTotalHours.HasValue)
        {
            var threshold = weeklyRule.GetThresholdConfig<WorkingHoursThresholdConfig>();
            var newTotal = currentWeekTotalHours.Value + netWorkHours;
            if (newTotal > threshold.MaxWeeklyHours)
            {
                var isHard = weeklyRule.EnforcementLevel == "HardBlock";
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = weeklyRule.Code,
                    LawReference = weeklyRule.LawReference,
                    RuleName = weeklyRule.Name,
                    Category = weeklyRule.Category,
                    Severity = "Violation",
                    EnforcementLevel = weeklyRule.EnforcementLevel,
                    Details = $"Haftalık toplam çalışma süresi ({newTotal:F1} saat), yasal haftalık 45 saatlik sınırı aşıyor ({newTotal - threshold.MaxWeeklyHours:F1} saat fazla mesai).",
                    PenaltyRisk = weeklyRule.PenaltyDescription,
                    ContextData = new()
                    {
                        ["projectedWeeklyHours"] = newTotal,
                        ["overtimeHours"] = newTotal - threshold.MaxWeeklyHours
                    }
                });
                if (isHard) result.HasHardBlock = true;
            }
        }

        // 3. Rule: Vardiyalar Arası En Az 11 Saat Dinlenme (4857 SK. Md. 68/Yönetmelik)
        var restBetweenRule = rules.FirstOrDefault(r => r.Code == "IK-4857-M68-REST");
        if (restBetweenRule != null && restBetweenRule.EnforcementLevel != "Disabled" && previousShiftEnd.HasValue)
        {
            var threshold = restBetweenRule.GetThresholdConfig<WorkingHoursThresholdConfig>();
            var restHours = (shiftStart - previousShiftEnd.Value).TotalHours;
            if (restHours < threshold.MinRestBetweenShiftsHours && restHours >= 0)
            {
                var isHard = restBetweenRule.EnforcementLevel == "HardBlock";
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = restBetweenRule.Code,
                    LawReference = restBetweenRule.LawReference,
                    RuleName = restBetweenRule.Name,
                    Category = restBetweenRule.Category,
                    Severity = "Violation",
                    EnforcementLevel = restBetweenRule.EnforcementLevel,
                    Details = $"İki vardiya arasındaki dinlenme süresi ({restHours:F1} saat), yasal zorunlu asgari {threshold.MinRestBetweenShiftsHours} saatin altında.",
                    PenaltyRisk = restBetweenRule.PenaltyDescription,
                    ContextData = new()
                    {
                        ["actualRestHours"] = restHours,
                        ["requiredRestHours"] = threshold.MinRestBetweenShiftsHours
                    }
                });
                if (isHard) result.HasHardBlock = true;
            }
        }

        // 4. Rule: Gece Çalışması 7.5 Saat Sınırı (4857 SK. Md. 69)
        var nightRule = rules.FirstOrDefault(r => r.Code == "IK-4857-M69-NIGHT");
        if (nightRule != null && nightRule.EnforcementLevel != "Disabled")
        {
            var isNight = (shiftStart.Hour >= 20 || shiftStart.Hour < 6) || (shiftEnd.Hour > 20 || shiftEnd.Hour <= 6);
            if (isNight && netWorkHours > 7.5)
            {
                var isHard = nightRule.EnforcementLevel == "HardBlock";
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = nightRule.Code,
                    LawReference = nightRule.LawReference,
                    RuleName = nightRule.Name,
                    Category = nightRule.Category,
                    Severity = "CriticalRisk",
                    EnforcementLevel = nightRule.EnforcementLevel,
                    Details = $"Gece dönemine (20:00-06:00) denk gelen çalışma süresi ({netWorkHours:F1} saat), yasal azami sınır olan 7.5 saati aşamaz.",
                    PenaltyRisk = nightRule.PenaltyDescription,
                    ContextData = new()
                    {
                        ["nightWorkHours"] = netWorkHours,
                        ["maxNightHours"] = 7.5
                    }
                });
                if (isHard) result.HasHardBlock = true;
            }
        }

        // 5. Rule: Gebe Çalışanın Gece Vardiyası Yasağı (6331 SK. & Gebe Yönetmeliği)
        if (isPregnant)
        {
            var pregRule = rules.FirstOrDefault(r => r.Code == "ISG-6331-PREGNANT-NIGHT");
            var isNight = (shiftStart.Hour >= 20 || shiftStart.Hour < 6) || (shiftEnd.Hour > 20 || shiftEnd.Hour <= 6);
            if (pregRule != null && pregRule.EnforcementLevel != "Disabled" && isNight)
            {
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = pregRule.Code,
                    LawReference = pregRule.LawReference,
                    RuleName = pregRule.Name,
                    Category = "HealthSafety",
                    Severity = "CriticalRisk",
                    EnforcementLevel = "HardBlock", // Always HardBlock for pregnant employees
                    Details = "Gebe veya yeni doğum yapmış çalışanların gece döneminde (20:00 - 06:00) çalıştırılması kanunen kesinlikle yasaktır.",
                    PenaltyRisk = pregRule.PenaltyDescription
                });
                result.HasHardBlock = true;
            }
        }

        result.IsCompliant = result.Violations.Count == 0;
        return result;
    }

    public async Task<ComplianceValidationResult> ValidateLeaveRequestAsync(
        Guid employeeId,
        string employeeName,
        string leaveType,
        int requestedDays,
        int employeeSeniorityYears,
        int employeeAge,
        CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRulesSeededAsync(cancellationToken);

        var result = new ComplianceValidationResult();
        var rules = await dbContext.Rules
            .Where(r => r.Category == "Leaves" && r.IsActive)
            .ToListAsync(cancellationToken);

        // 1. Annual Leave Minimum Floor Check (4857 SK. Md. 53)
        if (string.Equals(leaveType, "Annual", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(leaveType, "Yıllık İzin", StringComparison.OrdinalIgnoreCase))
        {
            var leaveRule = rules.FirstOrDefault(r => r.Code == "IK-4857-M53-LEAVE");
            if (leaveRule != null && leaveRule.EnforcementLevel != "Disabled")
            {
                var threshold = leaveRule.GetThresholdConfig<LeaveThresholdConfig>();
                
                int minStatutoryEntitlement;
                if (employeeSeniorityYears < 5)
                    minStatutoryEntitlement = threshold.MinLeaveDays1To5Years;
                else if (employeeSeniorityYears < 15)
                    minStatutoryEntitlement = threshold.MinLeaveDays5To15Years;
                else
                    minStatutoryEntitlement = threshold.MinLeaveDays15PlusYears;

                // Under 18 or Over 50 special statutory floor: At least 20 days
                if ((employeeAge < 18 || employeeAge >= 50) && minStatutoryEntitlement < threshold.MinLeaveDaysUnder18OrOver50)
                {
                    minStatutoryEntitlement = threshold.MinLeaveDaysUnder18OrOver50;
                }

                // Check if entitlement provided is less than legal minimum
                // (Informational / Statutory Check)
            }
        }

        // 2. Statutory Excuse Leaves (4857 SK. Ek Md. 2)
        var excuseRule = rules.FirstOrDefault(r => r.Code == "IK-4857-EK2-EXCUSE");
        if (excuseRule != null && excuseRule.EnforcementLevel != "Disabled")
        {
            var threshold = excuseRule.GetThresholdConfig<LeaveThresholdConfig>();
            if (string.Equals(leaveType, "Evlilik", StringComparison.OrdinalIgnoreCase) && requestedDays < threshold.MarriageLeaveDays)
            {
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = excuseRule.Code,
                    LawReference = excuseRule.LawReference,
                    RuleName = "Evlilik İzni Yasal Süre Kontrolü",
                    Category = "Leaves",
                    Severity = "Warning",
                    EnforcementLevel = excuseRule.EnforcementLevel,
                    Details = $"Yasal evlilik izni asgari {threshold.MarriageLeaveDays} gündür (talep edilen: {requestedDays} gün).",
                    PenaltyRisk = excuseRule.PenaltyDescription
                });
            }
            else if (string.Equals(leaveType, "Babalık", StringComparison.OrdinalIgnoreCase) && requestedDays < threshold.PaternityLeaveDays)
            {
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = excuseRule.Code,
                    LawReference = excuseRule.LawReference,
                    RuleName = "Babalık İzni Yasal Süre Kontrolü",
                    Category = "Leaves",
                    Severity = "Warning",
                    EnforcementLevel = excuseRule.EnforcementLevel,
                    Details = $"Yasal babalık izni asgari {threshold.PaternityLeaveDays} gündür.",
                    PenaltyRisk = excuseRule.PenaltyDescription
                });
            }
        }

        result.IsCompliant = result.Violations.Count == 0;
        return result;
    }

    public async Task<ComplianceValidationResult> ValidateHealthSafetyAsync(
        Guid employeeId,
        string employeeName,
        string hazardClass,
        DateTime? lastHealthExamDate,
        bool isPregnant = false,
        bool isNightShift = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRulesSeededAsync(cancellationToken);

        var result = new ComplianceValidationResult();
        var rules = await dbContext.Rules
            .Where(r => r.Category == "HealthSafety" && r.IsActive)
            .ToListAsync(cancellationToken);

        var healthExamRule = rules.FirstOrDefault(r => r.Code == "ISG-6331-M15-HEALTH");
        if (healthExamRule != null && healthExamRule.EnforcementLevel != "Disabled")
        {
            var threshold = healthExamRule.GetThresholdConfig<ISGThresholdConfig>();
            int maxMonths = hazardClass?.ToLower() switch
            {
                "veryhazardous" or "çok tehlikeli" => threshold.VeryHazardousHealthExamMonths,
                "hazardous" or "tehlikeli" => threshold.HazardousHealthExamMonths,
                _ => threshold.LessHazardousHealthExamMonths
            };

            if (lastHealthExamDate.HasValue)
            {
                var expirationDate = lastHealthExamDate.Value.AddMonths(maxMonths);
                if (DateTime.UtcNow > expirationDate)
                {
                    var isHard = healthExamRule.EnforcementLevel == "HardBlock";
                    result.Violations.Add(new ComplianceViolationDetail
                    {
                        RuleCode = healthExamRule.Code,
                        LawReference = healthExamRule.LawReference,
                        RuleName = healthExamRule.Name,
                        Category = "HealthSafety",
                        Severity = "CriticalRisk",
                        EnforcementLevel = healthExamRule.EnforcementLevel,
                        Details = $"Personelin periyodik sağlık raporu süresi dolmuştur ({hazardClass} tehlike sınıfı için en geç {maxMonths} ayda bir yenilenmelidir).",
                        PenaltyRisk = healthExamRule.PenaltyDescription,
                        ContextData = new()
                        {
                            ["lastExamDate"] = lastHealthExamDate.Value,
                            ["expirationDate"] = expirationDate,
                            ["hazardClass"] = hazardClass
                        }
                    });
                    if (isHard) result.HasHardBlock = true;
                }
            }
            else
            {
                result.Violations.Add(new ComplianceViolationDetail
                {
                    RuleCode = healthExamRule.Code,
                    LawReference = healthExamRule.LawReference,
                    RuleName = healthExamRule.Name,
                    Category = "HealthSafety",
                    Severity = "Violation",
                    EnforcementLevel = "SoftWarning",
                    Details = "Personelin sisteme kayıtlı geçerli bir işe giriş / periyodik sağlık muayenesi bulunmamaktadır.",
                    PenaltyRisk = healthExamRule.PenaltyDescription
                });
            }
        }

        result.IsCompliant = result.Violations.Count == 0;
        return result;
    }

    public async Task<ComplianceScoreResult> CalculateComplianceScoreAsync(CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRulesSeededAsync(cancellationToken);

        var totalRules = await dbContext.Rules.CountAsync(cancellationToken);
        var activeViolations = await dbContext.Violations
            .Where(v => v.Status == "Active")
            .ToListAsync(cancellationToken);

        var overriddenCount = await dbContext.Violations
            .Where(v => v.Status == "Overridden" || v.IsOverridden)
            .CountAsync(cancellationToken);

        // Category breakdown
        var categories = new[]
        {
            new { Key = "WorkingHours", Title = "Çalışma Süreleri & Vardiya (4857 SK.)" },
            new { Key = "Leaves", Title = "Yıllık & Mazeret İzinleri (4857 SK.)" },
            new { Key = "HealthSafety", Title = "İş Sağlığı ve Güvenliği (6331 SK.)" },
            new { Key = "Payroll", Title = "Bordro & Özlük Hakları (5510 / 4857)" }
        };

        var categorySummaries = new List<ComplianceCategorySummary>();
        decimal estimatedPenalty = 0;

        foreach (var cat in categories)
        {
            var rulesInCat = await dbContext.Rules.CountAsync(r => r.Category == cat.Key && r.IsActive, cancellationToken);
            var violationsInCat = activeViolations.Count(v => v.Rule?.Category == cat.Key || v.ModuleSource == cat.Key);

            double score = 100.0;
            if (violationsInCat > 0)
            {
                score = Math.Max(20.0, 100.0 - (violationsInCat * 15.0));
            }

            categorySummaries.Add(new ComplianceCategorySummary
            {
                Category = cat.Key,
                CategoryTitle = cat.Title,
                RulesCount = rulesInCat,
                ActiveViolations = violationsInCat,
                Score = Math.Round(score, 1),
                Status = score >= 90 ? "Excellent" : score >= 70 ? "Good" : "Risk"
            });
        }

        // Overall score
        var overallScore = categorySummaries.Count > 0
            ? Math.Round(categorySummaries.Average(c => c.Score), 1)
            : 100.0;

        // Estimate penalty (e.g. 15,200 TL per critical violation under 4857 / 6331 in 2026)
        estimatedPenalty = activeViolations.Sum(v => v.Severity == "CriticalRisk" ? 24500m : 12300m);

        return new ComplianceScoreResult
        {
            HealthScore = overallScore,
            ActiveViolationsCount = activeViolations.Count,
            HardBlockedAttemptsCount = activeViolations.Count(v => v.Severity == "CriticalRisk"),
            OverriddenViolationsCount = overriddenCount,
            TotalRulesCount = totalRules,
            EstimatedPenaltyExposureTl = estimatedPenalty,
            CategorySummaries = categorySummaries
        };
    }

    public async Task<ComplianceViolation> LogViolationAsync(
        string ruleCode,
        Guid? employeeId,
        string employeeName,
        string moduleSource,
        string? entityId,
        string severity,
        string details,
        Dictionary<string, object?> contextData,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.Id.HasValue) throw new InvalidOperationException("Tenant required.");

        var rule = await dbContext.Rules.FirstOrDefaultAsync(r => r.Code == ruleCode, cancellationToken);

        var violation = new ComplianceViolation
        {
            TenantId = currentTenant.Id.Value,
            RuleId = rule?.Id,
            RuleCode = ruleCode,
            LawReference = rule?.LawReference ?? "4857 Sayılı İş Kanunu",
            EmployeeId = employeeId,
            EmployeeName = employeeName,
            ModuleSource = moduleSource,
            EntityId = entityId,
            Severity = severity,
            Details = details,
            ViolationDataJson = JsonSerializer.Serialize(contextData, JsonDefaults.Options),
            Status = "Active",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Violations.Add(violation);
        await dbContext.SaveChangesAsync(cancellationToken);
        return violation;
    }

    private static List<ComplianceRule> GetDefaultTurkishLaborLawRules(Guid tenantId)
    {
        return new List<ComplianceRule>
        {
            // 1. 4857 Sayılı İş Kanunu - Günlük Çalışma Sınırı
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M63-DAILY",
                LawReference = "4857 Sayılı İş Kanunu Md. 63",
                Category = "WorkingHours",
                Name = "Günlük Azami Çalışma Süresi (11 Saat)",
                Description = "Günde 11 saatten fazla çalışma yapılması kanunen yasaktır. Fazla mesai dahil günlük süre 11 saati geçemez.",
                PenaltyRiskLevel = "High",
                PenaltyDescription = "4857 SK. Md. 104 uyarınca 2026 yılı çalışan başına idari para cezası: 15.200 TL",
                EnforcementLevel = "HardBlock",
                ThresholdConfigJson = JsonSerializer.Serialize(new WorkingHoursThresholdConfig { MaxDailyHours = 11.0 }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 2. 4857 Sayılı İş Kanunu - Haftalık Çalışma Sınırı
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M63-WEEKLY",
                LawReference = "4857 Sayılı İş Kanunu Md. 63",
                Category = "WorkingHours",
                Name = "Haftalık Yasal Çalışma Süresi (45 Saat)",
                Description = "Haftalık çalışma süresi en çok 45 saattir. Aşan süreler %50 zamlı fazla çalışma ücreti gerektirir.",
                PenaltyRiskLevel = "Medium",
                PenaltyDescription = "Ödenmeyen fazla çalışma ücretlerinde mevduata uygulanan en yüksek faiz ve idari para cezası riski.",
                EnforcementLevel = "SoftWarning",
                ThresholdConfigJson = JsonSerializer.Serialize(new WorkingHoursThresholdConfig { MaxWeeklyHours = 45.0 }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 3. 4857 Sayılı İş Kanunu - Vardiyalar Arası Dinlenme
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M68-REST",
                LawReference = "4857 Sayılı İş Kanunu & Postalar Yönetmeliği",
                Category = "WorkingHours",
                Name = "Vardiyalar Arası Asgari Dinlenme (11 Saat)",
                Description = "Çalışanın bir vardiyadan çıkışı ile sonraki vardiyaya girişi arasında en az kesintisiz 11 saat dinlenme süresi verilmelidir.",
                PenaltyRiskLevel = "High",
                PenaltyDescription = "İş sağlığı ve güvenliği ihlali kapsamında idari para cezası ve iş kazası rücu riski.",
                EnforcementLevel = "SoftWarning",
                ThresholdConfigJson = JsonSerializer.Serialize(new WorkingHoursThresholdConfig { MinRestBetweenShiftsHours = 11.0 }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 4. 4857 Sayılı İş Kanunu - Gece Vardiyası 7.5 Saat Sınırı
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M69-NIGHT",
                LawReference = "4857 Sayılı İş Kanunu Md. 69",
                Category = "WorkingHours",
                Name = "Gece Çalışması Azami Süresi (7.5 Saat)",
                Description = "Çalışma hayatında gece (20:00 - 06:00) sayılan dönemde çalışma süresi günde 7.5 saati aşamaz.",
                PenaltyRiskLevel = "Critical",
                PenaltyDescription = "4857 SK. Md. 104 uyarınca kişi başı 18.500 TL idari para cezası.",
                EnforcementLevel = "HardBlock",
                ThresholdConfigJson = JsonSerializer.Serialize(new WorkingHoursThresholdConfig { MaxNightShiftHours = 7.5 }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 5. 4857 Sayılı İş Kanunu - Yıllık Fazla Mesai Tavanı
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M41-OVERTIME-CAP",
                LawReference = "4857 Sayılı İş Kanunu Md. 41",
                Category = "WorkingHours",
                Name = "Yıllık Azami Fazla Mesai Tavanı (270 Saat)",
                Description = "Bir çalışana bir takvim yılı içinde toplamda en fazla 270 saat fazla çalışma yaptırılabilir.",
                PenaltyRiskLevel = "High",
                PenaltyDescription = "İş müfettişi denetimlerinde tespit edilen her çalışan için idari para cezası.",
                EnforcementLevel = "SoftWarning",
                ThresholdConfigJson = JsonSerializer.Serialize(new WorkingHoursThresholdConfig { MaxOvertimeYearlyHours = 270.0 }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 6. 4857 Sayılı İş Kanunu - Yıllık Ücretli İzin Baremleri
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-M53-LEAVE",
                LawReference = "4857 Sayılı İş Kanunu Md. 53",
                Category = "Leaves",
                Name = "Kıdeme Dayalı Asgari Yıllık İzin Hak Edişi",
                Description = "1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün. 18 yaş altı veya 50 yaş üzeri çalışanlara 20 günden az izin verilemez.",
                PenaltyRiskLevel = "High",
                PenaltyDescription = "Kullandırılmayan veya eksik kullandırılan yıllık izinlerde 4857 SK. Md. 103 idari para cezası.",
                EnforcementLevel = "HardBlock",
                ThresholdConfigJson = JsonSerializer.Serialize(new LeaveThresholdConfig(), JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 7. 4857 Sayılı İş Kanunu - Mazeret İzinleri
            new()
            {
                TenantId = tenantId,
                Code = "IK-4857-EK2-EXCUSE",
                LawReference = "4857 Sayılı İş Kanunu Ek Md. 2",
                Category = "Leaves",
                Name = "Yasal Mazeret İzinleri Güvencesi",
                Description = "Evlilik (3 gün), Vefat (3 gün), Babalık (5 gün), Engelli Çocuk Tedavi (10 gün) ücretli izin hakları.",
                PenaltyRiskLevel = "Medium",
                PenaltyDescription = "Yasal hakların engellenmesi durumunda fesih ve tazminat yaptırımları.",
                EnforcementLevel = "SoftWarning",
                ThresholdConfigJson = JsonSerializer.Serialize(new LeaveThresholdConfig(), JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 8. 6331 Sayılı İSG Kanunu - Periyodik Sağlık Muayeneleri
            new()
            {
                TenantId = tenantId,
                Code = "ISG-6331-M15-HEALTH",
                LawReference = "6331 Sayılı İSG Kanunu Md. 15",
                Category = "HealthSafety",
                Name = "Periyodik Sağlık Raporu Geçerlilik Denetimi",
                Description = "Çok tehlikeli işlerde yılda 1, tehlikeli işlerde 3 yılda 1, az tehlikeli işlerde 5 yılda 1 sağlık muayenesi zorunludur.",
                PenaltyRiskLevel = "Critical",
                PenaltyDescription = "6331 SK. Md. 26 uyarınca sağlık muayenesi yapılmayan her çalışan için 24.500 TL ceza.",
                EnforcementLevel = "HardBlock",
                ThresholdConfigJson = JsonSerializer.Serialize(new ISGThresholdConfig(), JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 9. 6331 Sayılı İSG Kanunu - Gebe Çalışan Koruma
            new()
            {
                TenantId = tenantId,
                Code = "ISG-6331-PREGNANT-NIGHT",
                LawReference = "6331 Sayılı İSG Kanunu & Gebe Çalışanlar Yönetmeliği",
                Category = "HealthSafety",
                Name = "Gebe Çalışanın Gece Çalışması Yasağı",
                Description = "Gebe ve yeni doğum yapmış emziren kadın çalışanların gece postalarında (20:00-06:00) çalıştırılması yasaktır.",
                PenaltyRiskLevel = "Critical",
                PenaltyDescription = "Ağır idari para cezası ve iş durdurma riski.",
                EnforcementLevel = "HardBlock",
                ThresholdConfigJson = JsonSerializer.Serialize(new ISGThresholdConfig { PregnantNightShiftAllowed = false }, JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            },

            // 10. 4857 Sayılı İş Kanunu / 1475 SK - Kıdem Tazminatı Tavanı
            new()
            {
                TenantId = tenantId,
                Code = "IK-1475-M14-SEVERANCE-CAP",
                LawReference = "1475 Sayılı İş Kanunu Md. 14 / 4857 SK.",
                Category = "Payroll",
                Name = "Kıdem Tazminatı Yasal Tavan Kontrolü",
                Description = "Kıdem tazminatının yıllık tavanı, en yüksek devlet memuruna ödenecek 1 yıllık emeklilik ikramiyesi tutarını aşamaz.",
                PenaltyRiskLevel = "Medium",
                PenaltyDescription = "Tavanı aşan kıdem ödemelerinde gelir vergisi ve SGK primi istisna ihlali riski.",
                EnforcementLevel = "SoftWarning",
                ThresholdConfigJson = JsonSerializer.Serialize(new PayrollThresholdConfig(), JsonDefaults.Options),
                IsSystemRule = true,
                IsActive = true
            }
        };
    }
}
