using System.Globalization;
using CRM.Modules.Orders.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CRM.Modules.Orders.Features.Quotes.Services;

public interface IQuotePdfGenerator
{
    byte[] GenerateQuotePdf(
        Quote quote,
        string? companyName = null,
        string? companyAddress = null,
        string? companyPhone = null,
        string? companyEmail = null);
}

public class QuotePdfGenerator : IQuotePdfGenerator
{
    static QuotePdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateQuotePdf(
        Quote quote,
        string? companyName = null,
        string? companyAddress = null,
        string? companyPhone = null,
        string? companyEmail = null)
    {
        var document = new QuotePdfDocument(quote, companyName, companyAddress, companyPhone, companyEmail);
        return document.GeneratePdf();
    }
}

internal class QuotePdfDocument : IDocument
{
    private readonly Quote _quote;
    private readonly string _companyName;
    private readonly string _companyAddress;
    private readonly string _companyPhone;
    private readonly string _companyEmail;
    private readonly CultureInfo _culture = new("tr-TR");

    public QuotePdfDocument(
        Quote quote,
        string? companyName,
        string? companyAddress,
        string? companyPhone,
        string? companyEmail)
    {
        _quote = quote;
        _companyName = !string.IsNullOrWhiteSpace(companyName) ? companyName : "CRM SATIŞ & TİCARET A.Ş.";
        _companyAddress = !string.IsNullOrWhiteSpace(companyAddress) ? companyAddress : "Merkez Mah. Teknoloji Cad. No:1, İstanbul";
        _companyPhone = !string.IsNullOrWhiteSpace(companyPhone) ? companyPhone : "+90 (212) 555 00 00";
        _companyEmail = !string.IsNullOrWhiteSpace(companyEmail) ? companyEmail : "destek@crm.local";
    }

    public DocumentMetadata GetMetadata() => new()
    {
        Title = $"Teklif-{_quote.QuoteNumber}",
        Author = _companyName,
        Subject = _quote.Title
    };

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(32);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9).FontColor(Colors.Grey.Darken3));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                // Left: Company Brand
                row.RelativeItem(6).Column(companyCol =>
                {
                    companyCol.Item().Text(_companyName)
                        .FontSize(16)
                        .SemiBold()
                        .FontColor(Colors.Blue.Darken3);

                    companyCol.Item().Text(_companyAddress)
                        .FontSize(8)
                        .FontColor(Colors.Grey.Medium);

                    companyCol.Item().Text($"Tel: {_companyPhone}  |  E-posta: {_companyEmail}")
                        .FontSize(8)
                        .FontColor(Colors.Grey.Medium);
                });

                // Right: Document Title & Metadata
                row.RelativeItem(6).Column(metaCol =>
                {
                    metaCol.Item().AlignRight().Text("FİYAT TEKLİFİ")
                        .FontSize(18)
                        .Bold()
                        .FontColor(Colors.Blue.Darken4);

                    metaCol.Item().AlignRight().Row(metaRow =>
                    {
                        metaRow.AutoItem().Text("Teklif No: ").Bold();
                        metaRow.AutoItem().Text(_quote.QuoteNumber).FontColor(Colors.Blue.Darken2).Bold();
                        if (_quote.RevisionNumber > 0)
                        {
                            metaRow.AutoItem().Text($" (Rev. {_quote.RevisionNumber})").FontColor(Colors.Grey.Darken1);
                        }
                    });

                    metaCol.Item().AlignRight().Row(metaRow =>
                    {
                        metaRow.AutoItem().Text("Tarih: ");
                        metaRow.AutoItem().Text(_quote.CreatedAt.ToString("dd.MM.yyyy", _culture));
                    });

                    if (_quote.ValidUntil.HasValue)
                    {
                        metaCol.Item().AlignRight().Row(metaRow =>
                        {
                            metaRow.AutoItem().Text("Geçerlilik: ").FontColor(Colors.Red.Darken2);
                            metaRow.AutoItem().Text(_quote.ValidUntil.Value.ToString("dd.MM.yyyy", _culture)).FontColor(Colors.Red.Darken2).Bold();
                        });
                    }
                });
            });

            col.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingTop(16).Column(col =>
        {
            // Customer & Deal Information Box
            col.Item().Row(row =>
            {
                row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(custCol =>
                {
                    custCol.Item().Text("MÜŞTERİ BİLGİLERİ").FontSize(8).Bold().FontColor(Colors.Blue.Darken2);
                    custCol.Item().Text(_quote.CustomerName).FontSize(11).Bold();
                    if (!string.IsNullOrWhiteSpace(_quote.Title))
                    {
                        custCol.Item().Text($"Konu: {_quote.Title}").FontSize(9);
                    }
                });

                row.ConstantItem(12);

                row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(infoCol =>
                {
                    infoCol.Item().Text("TEKLİF DETAYLARI").FontSize(8).Bold().FontColor(Colors.Blue.Darken2);
                    infoCol.Item().Text($"Hazırlayan: {(!string.IsNullOrWhiteSpace(_quote.AssignedUserName) ? _quote.AssignedUserName : "Satış Departmanı")}");
                    infoCol.Item().Text($"Para Birimi: {_quote.Currency}");
                    if (!string.IsNullOrWhiteSpace(_quote.PaymentMethod))
                    {
                        infoCol.Item().Text($"Ödeme Yöntemi: {_quote.PaymentMethod}");
                    }
                });
            });

            // Table of items
            col.Item().PaddingTop(16).Element(ComposeItemsTable);

            // Totals section
            col.Item().PaddingTop(12).Row(row =>
            {
                row.RelativeItem(7); // Spacing on left

                row.RelativeItem(5).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(totals =>
                {
                    totals.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Ara Toplam:");
                        r.RelativeItem().AlignRight().Text($"{_quote.Subtotal.ToString("N2", _culture)} {_quote.Currency}");
                    });

                    if (_quote.DiscountAmount > 0)
                    {
                        totals.Item().Row(r =>
                        {
                            r.RelativeItem().Text($"İskonto ({(_quote.DiscountType == "Percentage" ? $"%{_quote.DiscountRate:0.#}" : "Tutar")}):");
                            r.RelativeItem().AlignRight().Text($"-{_quote.DiscountAmount.ToString("N2", _culture)} {_quote.Currency}").FontColor(Colors.Red.Darken1);
                        });
                    }

                    totals.Item().Row(r =>
                    {
                        r.RelativeItem().Text("KDV:");
                        r.RelativeItem().AlignRight().Text($"{_quote.TaxAmount.ToString("N2", _culture)} {_quote.Currency}");
                    });

                    totals.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);

                    totals.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("GENEL TOPLAM:").Bold().FontSize(10);
                        r.RelativeItem().AlignRight().Text($"{_quote.TotalAmount.ToString("N2", _culture)} {_quote.Currency}").Bold().FontSize(11).FontColor(Colors.Blue.Darken3);
                    });
                });
            });

            // Conditions & Notes
            col.Item().PaddingTop(16).Element(ComposeTermsAndConditions);
        });
    }

    private void ComposeItemsTable(IContainer container)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(24); // #
                columns.RelativeColumn(5);  // Product Name
                columns.ConstantColumn(40); // Quantity
                columns.RelativeColumn(2);  // Unit Price
                columns.ConstantColumn(45); // Discount
                columns.ConstantColumn(35); // Tax
                columns.RelativeColumn(2);  // Total
            });

            // Header
            table.Header(header =>
            {
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("#").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Ürün / Hizmet").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Mik.").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Birim Fiyat").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("İsk.").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("KDV").Bold();
                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Tutar").Bold();
            });

            // Rows
            var index = 1;
            foreach (var item in _quote.Items)
            {
                var bg = index % 2 == 0 ? Colors.Grey.Lighten5 : Colors.White;

                table.Cell().Background(bg).Padding(5).Text(index.ToString());

                table.Cell().Background(bg).Padding(5).Column(pCol =>
                {
                    pCol.Item().Text(item.ProductName).Bold();
                    if (!string.IsNullOrWhiteSpace(item.SKU))
                    {
                        pCol.Item().Text($"Kod: {item.SKU}").FontSize(7).FontColor(Colors.Grey.Medium);
                    }
                    if (!string.IsNullOrWhiteSpace(item.Description))
                    {
                        pCol.Item().Text(item.Description).FontSize(7).Italic().FontColor(Colors.Grey.Darken1);
                    }
                });

                table.Cell().Background(bg).Padding(5).AlignRight().Text($"{item.Quantity.ToString("0.##", _culture)} {item.Unit}");
                table.Cell().Background(bg).Padding(5).AlignRight().Text(item.UnitPrice.ToString("N2", _culture));
                table.Cell().Background(bg).Padding(5).AlignRight().Text(item.DiscountRate > 0 ? $"%{item.DiscountRate:0.#}" : "-");
                table.Cell().Background(bg).Padding(5).AlignRight().Text($"%{item.TaxRate:0.#}");
                table.Cell().Background(bg).Padding(5).AlignRight().Text(item.TotalPrice.ToString("N2", _culture)).Bold();

                index++;
            }
        });
    }

    private void ComposeTermsAndConditions(IContainer container)
    {
        container.Column(col =>
        {
            var hasAnyCondition = !string.IsNullOrWhiteSpace(_quote.PaymentTerms)
                || !string.IsNullOrWhiteSpace(_quote.DeliveryTerms)
                || !string.IsNullOrWhiteSpace(_quote.BankDetails)
                || !string.IsNullOrWhiteSpace(_quote.TermsAndConditions)
                || !string.IsNullOrWhiteSpace(_quote.Notes);

            if (!hasAnyCondition)
            {
                return;
            }

            col.Item().Text("ŞARTLAR VE KOŞULLAR").FontSize(8).Bold().FontColor(Colors.Blue.Darken2);
            col.Item().PaddingTop(4).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(cCol =>
            {
                if (!string.IsNullOrWhiteSpace(_quote.PaymentTerms))
                {
                    cCol.Item().Text(t =>
                    {
                        t.Span("Ödeme Koşulları: ").Bold();
                        t.Span(_quote.PaymentTerms);
                    });
                }

                if (!string.IsNullOrWhiteSpace(_quote.DeliveryTerms))
                {
                    cCol.Item().Text(t =>
                    {
                        t.Span("Teslimat Şartları: ").Bold();
                        t.Span(_quote.DeliveryTerms);
                    });
                }

                if (!string.IsNullOrWhiteSpace(_quote.BankDetails))
                {
                    cCol.Item().Text(t =>
                    {
                        t.Span("Banka Bilgileri: ").Bold();
                        t.Span(_quote.BankDetails);
                    });
                }

                if (!string.IsNullOrWhiteSpace(_quote.TermsAndConditions))
                {
                    cCol.Item().Text(t =>
                    {
                        t.Span("Genel Hükümler: ").Bold();
                        t.Span(_quote.TermsAndConditions);
                    });
                }

                if (!string.IsNullOrWhiteSpace(_quote.Notes))
                {
                    cCol.Item().Text(t =>
                    {
                        t.Span("Ek Notlar: ").Bold();
                        t.Span(_quote.Notes);
                    });
                }
            });

            // Signature block
            col.Item().PaddingTop(16).Row(sigRow =>
            {
                sigRow.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
                {
                    c.Item().Text("MÜŞTERİ ONAY / İMZA / KAŞE").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(35).Text("Tarih / İmza: .......................................").FontSize(8).FontColor(Colors.Grey.Medium);
                });

                sigRow.ConstantItem(16);

                sigRow.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
                {
                    c.Item().Text("TEKLİFİ VEREN FİRMA ONAYI").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(35).Text("Kaşe / Yetkili İmza: .............................").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text("Bu belge elektronik ortamda hazırlanmış olup geçerlilik süresi içinde onaylanabilir.")
                    .FontSize(7).FontColor(Colors.Grey.Medium);

                row.RelativeItem().AlignRight().Text(text =>
                {
                    text.Span("Sayfa ").FontSize(8).FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
                    text.Span(" / ").FontSize(8).FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }
}
