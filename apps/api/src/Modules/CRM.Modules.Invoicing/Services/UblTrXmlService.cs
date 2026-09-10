using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using CRM.Modules.Invoicing.Entities;

namespace CRM.Modules.Invoicing.Services;

public interface IUblTrXmlService
{
    string GenerateUblTr21Xml(Invoice invoice, string supplierTitle, string supplierTaxNumber, string supplierTaxOffice, string supplierAddress);
}

public class UblTrXmlService : IUblTrXmlService
{
    private static readonly XNamespace Cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    private static readonly XNamespace Cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    private static readonly XNamespace Inv = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";

    public string GenerateUblTr21Xml(
        Invoice invoice,
        string supplierTitle,
        string supplierTaxNumber,
        string supplierTaxOffice,
        string supplierAddress)
    {
        var ettn = invoice.Ettn?.ToString() ?? Guid.NewGuid().ToString();
        var issueDateStr = invoice.IssueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var issueTimeStr = invoice.IssueDate.ToString("HH:mm:ss", CultureInfo.InvariantCulture);

        var root = new XElement(Inv + "Invoice",
            new XAttribute(XNamespace.Xmlns + "inv", Inv.NamespaceName),
            new XAttribute(XNamespace.Xmlns + "cac", Cac.NamespaceName),
            new XAttribute(XNamespace.Xmlns + "cbc", Cbc.NamespaceName),
            new XElement(Cbc + "UBLVersionID", "2.1"),
            new XElement(Cbc + "CustomizationID", "TR1.2"),
            new XElement(Cbc + "ProfileID", string.IsNullOrWhiteSpace(invoice.Profile) ? "EARSIVFATURA" : invoice.Profile),
            new XElement(Cbc + "ID", invoice.InvoiceNumber),
            new XElement(Cbc + "CopyIndicator", "false"),
            new XElement(Cbc + "UUID", ettn),
            new XElement(Cbc + "IssueDate", issueDateStr),
            new XElement(Cbc + "IssueTime", issueTimeStr),
            new XElement(Cbc + "InvoiceTypeCode", "SATIS"),
            new XElement(Cbc + "DocumentCurrencyCode", string.IsNullOrWhiteSpace(invoice.Currency) ? "TRY" : invoice.Currency),
            new XElement(Cbc + "LineCountNumeric", invoice.Items.Count)
        );

        // Supplier (Satıcı Firma)
        var supplierParty = new XElement(Cac + "AccountingSupplierParty",
            new XElement(Cac + "Party",
                new XElement(Cac + "PartyIdentification",
                    new XElement(Cbc + "ID", new XAttribute("schemeID", supplierTaxNumber.Length == 11 ? "TCKN" : "VKN"), supplierTaxNumber)
                ),
                new XElement(Cac + "PartyName",
                    new XElement(Cbc + "Name", supplierTitle)
                ),
                new XElement(Cac + "PostalAddress",
                    new XElement(Cbc + "StreetName", supplierAddress),
                    new XElement(Cbc + "CityName", "Türkiye")
                ),
                new XElement(Cac + "PartyTaxScheme",
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "Name", supplierTaxOffice)
                    )
                )
            )
        );
        root.Add(supplierParty);

        // Customer (Alıcı / Cari)
        var custTaxNo = invoice.CariAccount?.TaxNumber ?? "11111111111";
        var custTitle = invoice.CariAccount?.Title ?? "Nihai Tüketici";
        var custAddress = invoice.CariAccount?.Address ?? "Türkiye";

        var customerParty = new XElement(Cac + "AccountingCustomerParty",
            new XElement(Cac + "Party",
                new XElement(Cac + "PartyIdentification",
                    new XElement(Cbc + "ID", new XAttribute("schemeID", custTaxNo.Length == 11 ? "TCKN" : "VKN"), custTaxNo)
                ),
                new XElement(Cac + "PartyName",
                    new XElement(Cbc + "Name", custTitle)
                ),
                new XElement(Cac + "PostalAddress",
                    new XElement(Cbc + "StreetName", custAddress),
                    new XElement(Cbc + "CityName", invoice.CariAccount?.City ?? "Türkiye")
                )
            )
        );
        root.Add(customerParty);

        // Tax Total
        var taxTotal = new XElement(Cac + "TaxTotal",
            new XElement(Cbc + "TaxAmount", new XAttribute("currencyID", invoice.Currency), invoice.TaxTotal.ToString("F2", CultureInfo.InvariantCulture)),
            new XElement(Cac + "TaxSubtotal",
                new XElement(Cbc + "TaxableAmount", new XAttribute("currencyID", invoice.Currency), invoice.Subtotal.ToString("F2", CultureInfo.InvariantCulture)),
                new XElement(Cbc + "TaxAmount", new XAttribute("currencyID", invoice.Currency), invoice.TaxTotal.ToString("F2", CultureInfo.InvariantCulture)),
                new XElement(Cac + "TaxCategory",
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "Name", "KDV"),
                        new XElement(Cbc + "TaxTypeCode", "0015")
                    )
                )
            )
        );
        root.Add(taxTotal);

        // Monetary Totals
        var monetaryTotal = new XElement(Cac + "LegalMonetaryTotal",
            new XElement(Cbc + "LineExtensionAmount", new XAttribute("currencyID", invoice.Currency), invoice.Subtotal.ToString("F2", CultureInfo.InvariantCulture)),
            new XElement(Cbc + "TaxExclusiveAmount", new XAttribute("currencyID", invoice.Currency), invoice.Subtotal.ToString("F2", CultureInfo.InvariantCulture)),
            new XElement(Cbc + "TaxInclusiveAmount", new XAttribute("currencyID", invoice.Currency), invoice.GrandTotal.ToString("F2", CultureInfo.InvariantCulture)),
            new XElement(Cbc + "AllowanceTotalAmount", new XAttribute("currencyID", invoice.Currency), invoice.DiscountTotal.ToString("F2", CultureInfo.InvariantCulture)),
            new XElement(Cbc + "PayableAmount", new XAttribute("currencyID", invoice.Currency), invoice.GrandTotal.ToString("F2", CultureInfo.InvariantCulture))
        );
        root.Add(monetaryTotal);

        // Lines (Kalemler)
        int lineNo = 1;
        foreach (var item in invoice.Items)
        {
            var line = new XElement(Cac + "InvoiceLine",
                new XElement(Cbc + "ID", lineNo),
                new XElement(Cbc + "InvoicedQuantity", new XAttribute("unitCode", "C62"), item.Quantity.ToString("F2", CultureInfo.InvariantCulture)),
                new XElement(Cbc + "LineExtensionAmount", new XAttribute("currencyID", invoice.Currency), item.TotalPrice.ToString("F2", CultureInfo.InvariantCulture)),
                new XElement(Cac + "Item",
                    new XElement(Cbc + "Name", item.ProductName)
                ),
                new XElement(Cac + "Price",
                    new XElement(Cbc + "PriceAmount", new XAttribute("currencyID", invoice.Currency), item.UnitPrice.ToString("F2", CultureInfo.InvariantCulture))
                )
            );
            root.Add(line);
            lineNo++;
        }

        var doc = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
        return doc.ToString();
    }
}
