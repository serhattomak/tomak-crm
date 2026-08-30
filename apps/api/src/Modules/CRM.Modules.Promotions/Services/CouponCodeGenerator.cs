using System.Security.Cryptography;
using System.Text;

namespace CRM.Modules.Promotions.Services;

public interface ICouponCodeGenerator
{
    string GenerateCode(string? prefix = null, int length = 8);
    List<string> GenerateBatch(int count, string? prefix = null, int length = 8);
}

public class CouponCodeGenerator : ICouponCodeGenerator
{
    private const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit ambiguous characters 0, 1, I, O

    public string GenerateCode(string? prefix = null, int length = 8)
    {
        var result = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(prefix))
        {
            result.Append(prefix.Trim().ToUpperInvariant());
            result.Append('-');
        }

        var randomBytes = new byte[length];
        RandomNumberGenerator.Fill(randomBytes);

        for (int i = 0; i < length; i++)
        {
            result.Append(Chars[randomBytes[i] % Chars.Length]);
        }

        return result.ToString();
    }

    public List<string> GenerateBatch(int count, string? prefix = null, int length = 8)
    {
        var codes = new HashSet<string>(count);
        while (codes.Count < count)
        {
            codes.Add(GenerateCode(prefix, length));
        }

        return codes.ToList();
    }
}
