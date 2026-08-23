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
    DateTime UpdatedAt
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
    List<CreateQuoteItemRequest> Items
);

public record CreateRevisionRequest(
    string? RevisionNotes
);

public record ApproveQuoteRequest(
    bool IsApproved,
    string? ApprovalNotes
);

public record RejectQuoteRequest(
    string Reason
);

public record AcceptQuoteRequest(
    bool AutoConvertToOrder = true
);

public record PublicAcceptQuoteRequest(
    string? CustomerNotes,
    string? AcceptedByName
);
