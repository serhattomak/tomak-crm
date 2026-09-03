using CRM.Modules.Invoicing.Entities;

namespace CRM.Modules.Invoicing.Services;

public interface ICariLedgerService
{
    Task ProcessInvoiceIssuedAsync(Invoice invoice, CancellationToken ct = default);
    Task ProcessInvoiceCancelledAsync(Invoice invoice, CancellationToken ct = default);
    Task ProcessFinancialTransactionAsync(FinancialTransaction tx, CancellationToken ct = default);
}
