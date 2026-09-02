namespace CRM.Modules.Orders.Features.Quotes.DTOs;

public record QuoteSummaryDto(
    Guid Id,
    Guid TenantId,
    string QuoteNumber,
    int RevisionNumber,
    Guid? ParentQuoteId,
    string Title,
    Guid? CustomerId,
    string CustomerName,
    Guid? DealId,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string Status,
    string Currency,
    decimal ExchangeRate,
    decimal Subtotal,
    string DiscountType,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime? ValidUntil,
    DateTime? SentAt,
    DateTime? AcceptedAt,
    DateTime? RejectedAt,
    Guid? ConvertedOrderId,
    string PublicViewToken,
    string? PaymentMethod,
    int? PaymentDueDays,
    DateTime? PaymentDueDate,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record QuoteItemDto(
    Guid Id,
    Guid? ProductId,
    Guid? VariantId,
    string ProductName,
    string? SKU,
    string? Description,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    decimal UnitCost,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxRate,
    decimal TaxAmount,
    decimal TotalPrice,
    bool IsOptional,
    bool IsSelected,
    int OrderIndex
);

public record QuoteActivityDto(
    Guid Id,
    Guid? UserId,
    string? UserName,
    string ActivityType,
    string Title,
    string? Description,
    string? OldValue,
    string? NewValue,
    DateTime CreatedAt
);

public record QuoteRevisionSummaryDto(
    Guid Id,
    string QuoteNumber,
    int RevisionNumber,
    string Status,
    decimal TotalAmount,
    string Currency,
    DateTime CreatedAt
);

public record QuoteDetailDto(
    Guid Id,
    Guid TenantId,
    string QuoteNumber,
    int RevisionNumber,
    Guid? ParentQuoteId,
    string? ParentQuoteNumber,
    string Title,
    Guid? CustomerId,
    string CustomerName,
    Guid? DealId,
    string? DealTitle,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string Status,
    string Currency,
    decimal ExchangeRate,
    decimal Subtotal,
    string DiscountType,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime? ValidUntil,
    DateTime? SentAt,
    DateTime? AcceptedAt,
    DateTime? RejectedAt,
    string? RejectionReason,
    string? ApprovalNotes,
    Guid? ApprovedByUserId,
    DateTime? ApprovedAt,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    string? Notes,
    string? PaymentMethod,
    int? PaymentDueDays,
    DateTime? PaymentDueDate,
    string PublicViewToken,
    Guid? ConvertedOrderId,
    string? ConvertedOrderNumber,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<QuoteItemDto> Items,
    List<QuoteActivityDto> Activities,
    List<QuoteRevisionSummaryDto> Revisions
);

public record QuoteStatsDto(
    int TotalQuotes,
    decimal ActiveProposalsVolume,
    int PendingApprovalCount,
    int SentCount,
    int AcceptedCount,
    int RejectedCount,
    int ExpiredCount,
    decimal ConversionRate
);

public record QuoteTemplateDto(
    Guid Id,
    string Name,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    bool IsDefault,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Subject = null,
    string? HtmlBody = null,
    IReadOnlyList<string>? Variables = null,
    string? PreviewHtml = null
);

public record CreateQuoteItemRequest(
    Guid? ProductId,
    Guid? VariantId,
    string ProductName,
    string? SKU,
    string? Description,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    decimal UnitCost,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxRate,
    bool IsOptional,
    bool IsSelected,
    int OrderIndex
);

public record CreateQuoteRequest(
    string Title,
    Guid? CustomerId,
    string CustomerName,
    Guid? DealId,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string Currency,
    decimal ExchangeRate,
    string DiscountType,
    decimal DiscountRate,
    decimal DiscountAmount,
    DateTime? ValidUntil,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    string? Notes,
    string? PaymentMethod,
    int? PaymentDueDays,
    DateTime? PaymentDueDate,
    List<CreateQuoteItemRequest> Items
);

public record UpdateQuoteRequest(
    string Title,
    Guid? CustomerId,
    string CustomerName,
    Guid? DealId,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string Currency,
    decimal ExchangeRate,
    string DiscountType,
    decimal DiscountRate,
    decimal DiscountAmount,
    DateTime? ValidUntil,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    string? Notes,
    string? PaymentMethod,
    int? PaymentDueDays,
    DateTime? PaymentDueDate,
    List<CreateQuoteItemRequest> Items
);

public record RevisionItemOverrideRequest(
    Guid? Id,
    Guid? ProductId,
    Guid? VariantId,
    string? ProductName,
    string? SKU,
    string? Description,
    decimal? Quantity,
    string? Unit,
    decimal? UnitPrice,
    decimal? UnitCost,
    decimal? DiscountRate,
    decimal? TaxRate,
    bool? IsOptional,
    bool? IsSelected,
    int? OrderIndex
);

public record CreateRevisionRequest(
    string? RevisionNotes,
    string? Title = null,
    string? Currency = null,
    decimal? ExchangeRate = null,
    string? DiscountType = null,
    decimal? DiscountRate = null,
    decimal? DiscountAmount = null,
    DateTime? ValidUntil = null,
    string? TermsAndConditions = null,
    string? PaymentTerms = null,
    string? DeliveryTerms = null,
    string? BankDetails = null,
    string? Notes = null,
    string? PaymentMethod = null,
    int? PaymentDueDays = null,
    DateTime? PaymentDueDate = null,
    List<RevisionItemOverrideRequest>? Items = null
);

public record ConvertOrderItemOverrideRequest(
    Guid? QuoteItemId,
    Guid? ProductId,
    string? ProductName,
    decimal? Quantity,
    decimal? UnitPrice,
    bool? IsSelected,
    string? Description
);

public record ConvertToOrderRequest(
    decimal? ShippingFee = null,
    string? Notes = null,
    DateTime? DueDate = null,
    string? PaymentMethod = null,
    List<ConvertOrderItemOverrideRequest>? Items = null
);

public record ApproveQuoteRequest(
    bool IsApproved,
    string? ApprovalNotes
);

public record RejectQuoteRequest(
    string Reason
);

public record AcceptQuoteRequest(
    bool AutoConvertToOrder = true,
    ConvertToOrderRequest? Overrides = null
);

public record PublicAcceptQuoteRequest(
    string? CustomerNotes,
    string? AcceptedByName
);

/// <summary>
/// Mapping helpers for QuoteTemplate entity ↔ DTO.
/// Keeps subject/htmlBody/variables handling centralized and backward compatible (null allowed).
/// </summary>
public static class QuoteTemplateMappings
{
    /// <summary>
    /// Maps QuoteTemplate entity to DTO, including Subject/HtmlBody/Variables via GetVariables().
    /// PreviewHtml is optional and only populated for preview responses.
    /// </summary>
    public static QuoteTemplateDto ToDto(this CRM.Modules.Orders.Entities.QuoteTemplate entity, string? previewHtml = null)
    {
        IReadOnlyList<string> variables = entity.GetVariables();
        return new QuoteTemplateDto(
            entity.Id,
            entity.Name,
            entity.TermsAndConditions,
            entity.PaymentTerms,
            entity.DeliveryTerms,
            entity.BankDetails,
            entity.IsDefault,
            entity.CreatedAt,
            entity.UpdatedAt,
            entity.Subject,
            entity.HtmlBody,
            variables,
            previewHtml
        );
    }

    /// <summary>
    /// Applies DTO values onto an existing entity (reverse mapping). Handles trimming and Variables serialization.
    /// </summary>
    public static void ApplyToEntity(this QuoteTemplateDto dto, CRM.Modules.Orders.Entities.QuoteTemplate entity)
    {
        entity.Name = dto.Name.Trim();
        entity.TermsAndConditions = dto.TermsAndConditions?.Trim();
        entity.PaymentTerms = dto.PaymentTerms?.Trim();
        entity.DeliveryTerms = dto.DeliveryTerms?.Trim();
        entity.BankDetails = dto.BankDetails?.Trim();
        entity.IsDefault = dto.IsDefault;
        entity.Subject = dto.Subject?.Trim();
        entity.HtmlBody = dto.HtmlBody;
        if (dto.Variables is not null)
        {
            entity.SetVariables(new List<string>(dto.Variables));
        }

        entity.UpdatedAt = DateTime.UtcNow;
    }
}
