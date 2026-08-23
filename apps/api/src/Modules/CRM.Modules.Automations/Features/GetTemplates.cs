using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.Modules.Automations.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Automations.Features;

public record GetTemplatesQuery() : IQuery<List<WorkflowTemplateDto>>;

public class WorkflowTemplateDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Icon { get; set; } = "Zap";
    public string Color { get; set; } = "blue";
    public string TriggerType { get; set; } = string.Empty;
    public WorkflowTriggerConfig TriggerConfig { get; set; } = new();
    public List<WorkflowConditionGroup> Conditions { get; set; } = new();
    public List<WorkflowActionStep> Actions { get; set; } = new();
}

public class GetTemplatesHandler : IQueryHandler<GetTemplatesQuery, List<WorkflowTemplateDto>>
{
    public Task<Result<List<WorkflowTemplateDto>>> Handle(GetTemplatesQuery request, CancellationToken cancellationToken)
    {
        var templates = new List<WorkflowTemplateDto>
        {
            // 1. VIP Müşteri Hoşgeldin
            new()
            {
                Id = "template-vip-welcome",
                Name = "VIP Müşteri Hoşgeldin & Özel Temsilci Atama",
                Description = "Yeni kayıt olan VIP segment müşterilere anında hoşgeldin iletisi gönderir ve özel takip görevi açar.",
                Category = "Customer",
                Icon = "Crown",
                Color = "amber",
                TriggerType = "Customer.Created",
                TriggerConfig = new WorkflowTriggerConfig { EntityFilter = "Customer" },
                Conditions = new List<WorkflowConditionGroup>
                {
                    new()
                    {
                        LogicalOperator = "OR",
                        Rules = new List<WorkflowConditionRule>
                        {
                            new() { Field = "tier", Operator = "equals", Value = "VIP", FieldType = "string" },
                            new() { Field = "tier", Operator = "equals", Value = "Enterprise", FieldType = "string" }
                        }
                    }
                },
                Actions = new List<WorkflowActionStep>
                {
                    new()
                    {
                        Id = "act-1",
                        Type = "notification",
                        Title = "VIP Hoşgeldin E-Postası Gönder",
                        Order = 1,
                        Config = new()
                        {
                            ["channel"] = "Email",
                            ["title"] = "Aramıza Hoş Geldiniz - Özel VIP Ayrıcalıklarınız",
                            ["message"] = "Sayın {customerName}, özel müşteri programımıza hoş geldiniz. Temsilciniz en kısa sürede sizinle iletişime geçecektir."
                        }
                    },
                    new()
                    {
                        Id = "act-2",
                        Type = "createRecord",
                        Title = "Kıdemli Temsilciye Takip Görevi Aç",
                        Order = 2,
                        Config = new()
                        {
                            ["entityType"] = "Task",
                            ["title"] = "VIP Müşteri Tanışma Toplantısı - {customerName}"
                        }
                    }
                }
            },

            // 2. Yüksek Tutarlı Sipariş Bildirimi
            new()
            {
                Id = "template-high-value-order",
                Name = "Yüksek Tutarlı Sipariş Yönetici Bildirimi",
                Description = "10.000 TL ve üzeri sipariş oluştuğunda satış yöneticisine anlık bildirim fırlatır.",
                Category = "Sales",
                Icon = "Flame",
                Color = "emerald",
                TriggerType = "Order.Created",
                TriggerConfig = new WorkflowTriggerConfig { EntityFilter = "Order" },
                Conditions = new List<WorkflowConditionGroup>
                {
                    new()
                    {
                        LogicalOperator = "AND",
                        Rules = new List<WorkflowConditionRule>
                        {
                            new() { Field = "totalAmount", Operator = "greaterThanOrEqual", Value = "10000", FieldType = "number" }
                        }
                    }
                },
                Actions = new List<WorkflowActionStep>
                {
                    new()
                    {
                        Id = "act-1",
                        Type = "notification",
                        Title = "Yöneticiye Yüksek Ciro Bildirimi",
                        Order = 1,
                        Config = new()
                        {
                            ["channel"] = "InApp",
                            ["title"] = "🔥 Yüksek Tutarlı Sipariş Alındı!",
                            ["message"] = "#{orderNumber} numaralı sipariş ({totalAmount} {currency}) {customerName} tarafından verildi."
                        }
                    }
                }
            },

            // 3. SLA Aşan Bilette Acil Eskalasyon
            new()
            {
                Id = "template-sla-breach-escalation",
                Name = "SLA Aşan Destek Biletinde Acil Eskalasyon",
                Description = "Çözüm süresi aşılmış acil biletlerde departman yöneticisini uyarır ve önceliği yükseltir.",
                Category = "Support",
                Icon = "AlertTriangle",
                Color = "red",
                TriggerType = "Ticket.SlaBreached",
                TriggerConfig = new WorkflowTriggerConfig { EntityFilter = "Ticket" },
                Conditions = new List<WorkflowConditionGroup>
                {
                    new()
                    {
                        LogicalOperator = "AND",
                        Rules = new List<WorkflowConditionRule>
                        {
                            new() { Field = "status", Operator = "notEquals", Value = "Resolved", FieldType = "string" }
                        }
                    }
                },
                Actions = new List<WorkflowActionStep>
                {
                    new()
                    {
                        Id = "act-1",
                        Type = "notification",
                        Title = "Destek Liderine Acil Uyarı",
                        Order = 1,
                        Config = new()
                        {
                            ["channel"] = "InApp",
                            ["title"] = "🚨 SLA AŞIMI: Acil Müdahale Gerekiyor",
                            ["message"] = "#{ticketNumber} nolu biletin SLA süresi aşıldı! Müşteri: {customerName}"
                        }
                    },
                    new()
                    {
                        Id = "act-2",
                        Type = "updateRecord",
                        Title = "Önceliği Acil / Kritik Seviyeye Yükselt",
                        Order = 2,
                        Config = new()
                        {
                            ["field"] = "priority",
                            ["value"] = "Urgent"
                        }
                    }
                }
            },

            // 4. Hareketsiz Müşteri İçin Takip
            new()
            {
                Id = "template-passive-customer-followup",
                Name = "Pasifleşen Müşteri İçin Otomatik Takip",
                Description = "Durumu pasif olarak güncellenen müşteriler için müşteri temsilcisine hatırlatma görevi oluşturur.",
                Category = "Customer",
                Icon = "UserCheck",
                Color = "purple",
                TriggerType = "Customer.Updated",
                TriggerConfig = new WorkflowTriggerConfig { EntityFilter = "Customer" },
                Conditions = new List<WorkflowConditionGroup>
                {
                    new()
                    {
                        LogicalOperator = "AND",
                        Rules = new List<WorkflowConditionRule>
                        {
                            new() { Field = "status", Operator = "equals", Value = "Passive", FieldType = "string" }
                        }
                    }
                },
                Actions = new List<WorkflowActionStep>
                {
                    new()
                    {
                        Id = "act-1",
                        Type = "createRecord",
                        Title = "Müşteri Memnuniyet Kontrolü Görevi Aç",
                        Order = 1,
                        Config = new()
                        {
                            ["entityType"] = "Task",
                            ["title"] = "Hareketsiz Müşteri Geri Kazanım Araması - {customerName}"
                        }
                    }
                }
            },

            // 5. Tamamlanan Siparişte Anket Gönderimi
            new()
            {
                Id = "template-order-survey",
                Name = "Tamamlanan Sipariş Sonrası Değerlendirme Talebi",
                Description = "Sipariş 'Tamamlandı' olduğunda müşteriye teşekkür ve memnuniyet anketi gönderir.",
                Category = "Operations",
                Icon = "Star",
                Color = "blue",
                TriggerType = "Order.StatusChanged",
                TriggerConfig = new WorkflowTriggerConfig { TargetStatus = "Completed" },
                Conditions = new List<WorkflowConditionGroup>
                {
                    new()
                    {
                        LogicalOperator = "AND",
                        Rules = new List<WorkflowConditionRule>
                        {
                            new() { Field = "status", Operator = "equals", Value = "Completed", FieldType = "string" }
                        }
                    }
                },
                Actions = new List<WorkflowActionStep>
                {
                    new()
                    {
                        Id = "act-1",
                        Type = "notification",
                        Title = "Müşteriye Sipariş Değerlendirme Linki Gönder",
                        Order = 1,
                        Config = new()
                        {
                            ["channel"] = "Email",
                            ["title"] = "Siparişiniz Teslim Edildi! Bizi Değerlendirin",
                            ["message"] = "Sayın {customerName}, #{orderNumber} nolu siparişiniz tamamlandı. Deneyiminizi 1 dakikada değerlendirmek için lütfen tıklayın."
                        }
                    }
                }
            }
        };

        return Task.FromResult(Result.Success(templates));
    }
}

public class GetTemplatesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/automations/templates", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTemplatesQuery(), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<List<WorkflowTemplateDto>>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<List<WorkflowTemplateDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWorkflowTemplates")
        .WithTags("Automations")
        .RequirePermission("Automations.View");
    }
}
