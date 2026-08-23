using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using CRM.Modules.Automations.Services;
using CRM.Modules.Customers.Data;
using CRM.Modules.Orders.Data;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Features;

public record TestWorkflowCommand(
    Guid Id,
    string? EntityType,
    string? EntityId,
    Dictionary<string, object?>? MockContext
) : ICommand<AutomationExecutionResult>;

public class TestWorkflowHandler(
    AutomationsDbContext dbContext,
    CustomersDbContext? customersDbContext,
    OrdersDbContext? ordersDbContext,
    IAutomationEngine automationEngine,
    ICurrentTenant currentTenant) : ICommandHandler<TestWorkflowCommand, AutomationExecutionResult>
{
    public async Task<Result<AutomationExecutionResult>> Handle(TestWorkflowCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<AutomationExecutionResult>(Error.Unauthorized);
        }

        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);
        if (workflow == null)
        {
            return Result.Failure<AutomationExecutionResult>(Error.NotFound);
        }

        var contextData = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        // If mock data provided, use it
        if (request.MockContext != null)
        {
            foreach (var kv in request.MockContext)
            {
                contextData[kv.Key] = kv.Value;
            }
        }

        // If real entity ID provided, fetch its real properties
        if (!string.IsNullOrWhiteSpace(request.EntityId) && Guid.TryParse(request.EntityId, out var entityGuid))
        {
            if (string.Equals(request.EntityType, "Customer", StringComparison.OrdinalIgnoreCase) && customersDbContext != null)
            {
                var customer = await customersDbContext.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == entityGuid, cancellationToken);
                if (customer != null)
                {
                    contextData["customerId"] = customer.Id.ToString();
                    contextData["customerName"] = customer.Name;
                    contextData["email"] = customer.Email ?? "";
                    contextData["phone"] = customer.Phone ?? "";
                    contextData["tier"] = customer.Tier.ToString();
                    contextData["status"] = customer.Status.ToString();
                    contextData["type"] = customer.Type.ToString();
                    contextData["totalRevenue"] = customer.TotalRevenue;
                    contextData["city"] = customer.City ?? "";
                    contextData["industry"] = customer.Industry ?? "";
                }
            }
            else if (string.Equals(request.EntityType, "Order", StringComparison.OrdinalIgnoreCase) && ordersDbContext != null)
            {
                var order = await ordersDbContext.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == entityGuid, cancellationToken);
                if (order != null)
                {
                    contextData["orderId"] = order.Id.ToString();
                    contextData["orderNumber"] = order.OrderNumber;
                    contextData["customerName"] = order.CustomerName;
                    contextData["totalAmount"] = order.TotalAmount;
                    contextData["status"] = order.Status.ToString();
                    contextData["paymentStatus"] = order.PaymentStatus.ToString();
                    contextData["currency"] = order.Currency;
                }
            }
        }

        // Fill standard defaults if empty
        if (!contextData.ContainsKey("customerName")) contextData["customerName"] = "Örnek Müşteri (Ahmet Yılmaz)";
        if (!contextData.ContainsKey("totalAmount")) contextData["totalAmount"] = 12500.0;
        if (!contextData.ContainsKey("tier")) contextData["tier"] = "VIP";
        if (!contextData.ContainsKey("status")) contextData["status"] = "Completed";
        if (!contextData.ContainsKey("priority")) contextData["priority"] = "Urgent";
        if (!contextData.ContainsKey("category")) contextData["category"] = "Teknik Destek";

        var result = await automationEngine.ExecuteWorkflowAsync(
            workflow,
            triggerSource: "Simulation / Dry-Run",
            entityType: request.EntityType ?? "Simulation",
            entityId: request.EntityId ?? "sim-001",
            contextData: contextData,
            isSimulation: true,
            cancellationToken: cancellationToken);

        return Result.Success(result);
    }
}

public class TestWorkflowEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/automations/{id:guid}/test", async (Guid id, TestWorkflowCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                command = command with { Id = id };
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<AutomationExecutionResult>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<AutomationExecutionResult>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("TestWorkflow")
        .WithTags("Automations")
        .RequirePermission("Automations.Execute");
    }
}
