using System.Text;

namespace JffEhr.Api.Data;

/// <summary>
/// A small RFC 4180 CSV reader for the registration intake import. Handles quoted
/// fields, embedded commas, doubled quotes ("") and newlines inside quotes, which
/// matters because a Google Forms address answer can contain commas and line breaks.
/// Deliberately dependency-free; the import is the only CSV path in the codebase.
/// </summary>
public static class CsvReader
{
    /// <summary>Parses CSV text into rows of string fields. Empty input yields no rows.</summary>
    public static List<string[]> Parse(string text)
    {
        var rows = new List<string[]>();
        if (string.IsNullOrEmpty(text))
        {
            return rows;
        }

        // Strip a leading UTF-8 byte order mark (U+FEFF). StreamReader usually
        // removes it, but if one survives it would corrupt the first header cell
        // and silently shift every imported column by one, so guard here too.
        if (text[0] == 0xFEFF)
        {
            text = text[1..];
        }

        // Normalise line endings so a lone CR or CRLF are treated the same.
        text = text.Replace("\r\n", "\n").Replace('\r', '\n');

        var field = new StringBuilder();
        var row = new List<string>();
        var inQuotes = false;
        var i = 0;

        while (i < text.Length)
        {
            var c = text[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < text.Length && text[i + 1] == '"')
                    {
                        field.Append('"');
                        i += 2;
                        continue;
                    }
                    inQuotes = false;
                    i++;
                    continue;
                }
                field.Append(c);
                i++;
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    i++;
                    break;
                case ',':
                    row.Add(field.ToString());
                    field.Clear();
                    i++;
                    break;
                case '\n':
                    row.Add(field.ToString());
                    field.Clear();
                    rows.Add(row.ToArray());
                    row = new List<string>();
                    i++;
                    break;
                default:
                    field.Append(c);
                    i++;
                    break;
            }
        }

        // Flush the final field/row if the file did not end with a newline.
        if (field.Length > 0 || row.Count > 0)
        {
            row.Add(field.ToString());
            rows.Add(row.ToArray());
        }

        return rows;
    }
}
