using CRM.BuildingBlocks.Exceptions;
using CRM.Modules.Invoicing.Data;
using CRM.Modules.Invoicing.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Invoicing.Services;

public class CariLedgerService(InvoicingDbContext dbContext) : ICariLedgerService
{
    public async Task ProcessInvoiceIssuedAsync(Invoice invoice, CancellationToken ct = default)
    {
        var cari = await dbContext.CariAccounts
            .FirstOrDefaultAsync(c => c.Id == invoice.CariAccountId, ct)
            ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {invoice.CariAccountId})");

        var isSales = invoice.Type == "Sales" || invoice.Type == "PurchaseReturn";
        var amount = invoice.GrandTotal;

        var debit = isSales ? amount : 0.00m;
        var credit = isSales ? 0.00m : amount;

        cari.TotalDebit += debit;
        cari.TotalCredit += credit;
        cari.Balance = cari.TotalDebit - cari.TotalCredit;
        cari.UpdatedAt = DateTime.UtcNow;

        var cariTx = new CariTransaction
        {
            Id = Guid.NewGuid(),
            TenantId = invoice.TenantId,
            CariAccountId = cari.Id,
            Type = invoice.Type == "Sales" ? "SalesInvoice" : "PurchaseInvoice",
            DocumentNumber = invoice.InvoiceNumber,
            Description = $"{invoice.Profile} - {invoice.InvoiceNumber} nolu fatura kaydı",
            TransactionDate = invoice.IssueDate,
            DueDate = invoice.DueDate,
            Debit = debit,
            Credit = credit,
            BalanceAfter = cari.Balance,
            Currency = invoice.Currency,
            SourceType = "Invoice",
            SourceId = invoice.Id,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.CariTransactions.Add(cariTx);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task ProcessInvoiceCancelledAsync(Invoice invoice, CancellationToken ct = default)
    {
        var cari = await dbContext.CariAccounts
            .FirstOrDefaultAsync(c => c.Id == invoice.CariAccountId, ct)
            ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {invoice.CariAccountId})");

        var isSales = invoice.Type == "Sales" || invoice.Type == "PurchaseReturn";
        var amount = invoice.GrandTotal;

        // Reversal (Ters kayıt)
        var debit = isSales ? 0.00m : amount;
        var credit = isSales ? amount : 0.00m;

        if (isSales)
        {
            cari.TotalDebit -= amount;
        }
        else
        {
            cari.TotalCredit -= amount;
        }
        cari.Balance = cari.TotalDebit - cari.TotalCredit;
        cari.UpdatedAt = DateTime.UtcNow;

        var cariTx = new CariTransaction
        {
            Id = Guid.NewGuid(),
            TenantId = invoice.TenantId,
            CariAccountId = cari.Id,
            Type = "Cancellation",
            DocumentNumber = invoice.InvoiceNumber,
            Description = $"{invoice.InvoiceNumber} nolu faturanın iptal kaydı",
            TransactionDate = DateTime.UtcNow,
            Debit = debit,
            Credit = credit,
            BalanceAfter = cari.Balance,
            Currency = invoice.Currency,
            SourceType = "Invoice",
            SourceId = invoice.Id,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.CariTransactions.Add(cariTx);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task ProcessFinancialTransactionAsync(FinancialTransaction tx, CancellationToken ct = default)
    {
        // 1. Update Financial Account Balance
        var account = await dbContext.FinancialAccounts
            .FirstOrDefaultAsync(a => a.Id == tx.FinancialAccountId, ct)
            ?? throw new NotFoundException($"Kasa veya Banka hesabı bulunamadı (ID: {tx.FinancialAccountId})");

        var isIncrease = tx.Type == "Collection" || tx.Type == "TransferIn";
        if (isIncrease)
        {
            account.Balance += tx.Amount;
        }
        else
        {
            account.Balance -= tx.Amount;
        }
        account.UpdatedAt = DateTime.UtcNow;

        // 2. Update Cari Account if linked
        if (tx.CariAccountId.HasValue)
        {
            var cari = await dbContext.CariAccounts
                .FirstOrDefaultAsync(c => c.Id == tx.CariAccountId.Value, ct)
                ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {tx.CariAccountId.Value})");

            // Tahsilat (Collection): Cari müşteriden tahsil edildi -> Alacak (Credit) yazılır, borcu düşer.
            // Ödeme (Payment): Tedarikçiye ödendi -> Borç (Debit) yazılır, alacağı düşer.
            var debit = tx.Type == "Payment" ? tx.Amount : 0.00m;
            var credit = tx.Type == "Collection" ? tx.Amount : 0.00m;

            cari.TotalDebit += debit;
            cari.TotalCredit += credit;
            cari.Balance = cari.TotalDebit - cari.TotalCredit;
            cari.UpdatedAt = DateTime.UtcNow;

            var cariTx = new CariTransaction
            {
                Id = Guid.NewGuid(),
                TenantId = tx.TenantId,
                CariAccountId = cari.Id,
                Type = tx.Type,
                DocumentNumber = tx.DocumentNumber,
                Description = tx.Description,
                TransactionDate = tx.TransactionDate,
                Debit = debit,
                Credit = credit,
                BalanceAfter = cari.Balance,
                Currency = tx.Currency,
                SourceType = "FinancialTransaction",
                SourceId = tx.Id,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.CariTransactions.Add(cariTx);
        }

        // 3. Update Invoice Paid/Remaining Amount if linked
        if (tx.InvoiceId.HasValue)
        {
            var invoice = await dbContext.Invoices
                .FirstOrDefaultAsync(i => i.Id == tx.InvoiceId.Value, ct);

            if (invoice != null)
            {
                invoice.PaidAmount += tx.Amount;
                invoice.RemainingAmount = Math.Max(0.00m, invoice.GrandTotal - invoice.PaidAmount);
                if (invoice.RemainingAmount <= 0.00m)
                {
                    invoice.Status = "Paid";
                }
                else if (invoice.PaidAmount > 0.00m)
                {
                    invoice.Status = "PartiallyPaid";
                }
                invoice.UpdatedAt = DateTime.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
