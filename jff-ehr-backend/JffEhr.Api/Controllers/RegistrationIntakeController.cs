using System.Globalization;
using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

/// <summary>
/// Admin-only pre-camp registration intake. Imports the public intake form's CSV
/// export (spec/forms/08_public_registration_intake.md) into a staging table, lets
/// the administrator review each row, and promotes confirmed rows into real Camper,
/// primary Caregiver and EmergencyContact records. Nothing here writes clinical data:
/// medical (Part 2) and the signature (Part 3) stay out of this path by design.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public sealed class RegistrationIntakeController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    // Column layout of the CSV, as documented in the form spec. When the export
    // carries a leading "Timestamp" column (Google Forms always does), every field
    // shifts right by one; the offset is detected from the header row.
    private const int FirstName = 0;
    private const int Surname = 1;
    private const int Dob = 2;
    private const int Sex = 3;
    private const int Race = 4;
    private const int TShirtSize = 5;
    private const int Address = 6;
    private const int CellNumber = 7;
    private const int Language = 8;
    private const int CaregiverName = 9;
    private const int CaregiverCellNo = 10;
    private const int CaregiverWorkNo = 11;
    private const int EmergencyName = 12;
    private const int EmergencyCellNo = 13;
    private const int EmergencyWorkNo = 14;
    private const int EmergencyRelationship = 15;
    private const int ExpectedFieldCount = 16;

    private static readonly string[] DobFormats =
    {
        "yyyy-MM-dd", "yyyy/MM/dd", "d/M/yyyy", "M/d/yyyy", "dd/MM/yyyy", "d-M-yyyy",
    };

    [HttpPost("import")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ImportResultDto>> Import(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("No file was uploaded.");
        }

        string text;
        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            text = await reader.ReadToEndAsync();
        }

        var rows = CsvReader.Parse(text);
        if (rows.Count < 2)
        {
            return BadRequest("The file has no data rows.");
        }

        // Cap the batch so a very large or malformed file cannot exhaust memory or
        // flood the shared database from a single request. This is well above a
        // realistic camp intake.
        const int maxDataRows = 5000;
        if (rows.Count - 1 > maxDataRows)
        {
            return BadRequest(
                $"That file has {rows.Count - 1} rows. Import at most {maxDataRows} at a time.");
        }

        // Detect and drop a leading Timestamp column if present.
        var header = rows[0];
        var offset = header.Length > 0 && header[0].Trim().Equals("Timestamp", StringComparison.OrdinalIgnoreCase)
            ? 1
            : 0;

        // Load existing campers once for duplicate detection (first name + surname + DOB).
        var existing = await db.Campers
            .Select(c => new { c.CamperId, c.FirstName, c.Surname, c.Dob })
            .ToListAsync();

        var userId = currentUser.UserId;
        if (userId is null)
        {
            return Unauthorized();
        }

        var batchId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var staged = new List<PendingRegistration>();

        for (var r = 1; r < rows.Count; r++)
        {
            var raw = rows[r];

            // Skip a fully blank line.
            if (raw.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            string Cell(int field)
            {
                var idx = offset + field;
                return idx < raw.Length ? raw[idx].Trim() : "";
            }

            var pending = new PendingRegistration
            {
                PendingRegistrationId = Guid.NewGuid(),
                ImportBatchId = batchId,
                SourceRow = r,
                FirstName = Truncate(Cell(FirstName), 80),
                Surname = Truncate(Cell(Surname), 80),
                Sex = NullIfBlank(Cell(Sex), 8),
                Race = NullIfBlank(Cell(Race), 30),
                Address = NullIfBlank(Cell(Address), null),
                CellNumber = NullIfBlank(Cell(CellNumber), 20),
                Language = NullIfBlank(Cell(Language), 40),
                TShirtSize = NullIfBlank(Cell(TShirtSize), 20),
                CaregiverName = NullIfBlank(Cell(CaregiverName), 160),
                CaregiverCellNo = NullIfBlank(Cell(CaregiverCellNo), 20),
                CaregiverWorkNo = NullIfBlank(Cell(CaregiverWorkNo), 20),
                EmergencyName = NullIfBlank(Cell(EmergencyName), 160),
                EmergencyCellNo = NullIfBlank(Cell(EmergencyCellNo), 20),
                EmergencyWorkNo = NullIfBlank(Cell(EmergencyWorkNo), 20),
                EmergencyRelationship = NullIfBlank(Cell(EmergencyRelationship), 40),
                Status = "pending",
                ImportedBy = userId.Value,
                ImportedAt = now,
            };

            var dobText = Cell(Dob);
            if (TryParseDob(dobText, out var dob))
            {
                pending.Dob = dob;
            }
            else if (!string.IsNullOrWhiteSpace(dobText))
            {
                pending.RawDob = Truncate(dobText, 40);
                pending.ImportNote = "Date of birth could not be read; set it at review.";
            }

            if (pending.Dob is { } d)
            {
                var match = existing.FirstOrDefault(c =>
                    c.Dob == d
                    && string.Equals(c.FirstName, pending.FirstName, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(c.Surname, pending.Surname, StringComparison.OrdinalIgnoreCase));
                if (match is not null)
                {
                    pending.PossibleDuplicate = true;
                    pending.DuplicateOfCamperId = match.CamperId;
                }
            }

            staged.Add(pending);
        }

        if (staged.Count == 0)
        {
            return BadRequest("The file had a header but no usable data rows.");
        }

        db.PendingRegistrations.AddRange(staged);
        await db.SaveChangesAsync();

        return Ok(new ImportResultDto
        {
            ImportBatchId = batchId,
            RowsImported = staged.Count,
            PossibleDuplicates = staged.Count(s => s.PossibleDuplicate),
            RowsWithNotes = staged.Count(s => s.ImportNote is not null),
            Pending = staged.Select(ToDto).ToList(),
        });
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<PendingRegistrationDto>>> GetPending()
    {
        var pending = await db.PendingRegistrations
            .Where(p => p.Status == "pending")
            .OrderByDescending(p => p.ImportedAt)
            .ThenBy(p => p.SourceRow)
            .ToListAsync();
        return Ok(pending.Select(ToDto));
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<ActionResult<CamperDto>> Confirm(Guid id, ConfirmRegistrationRequest request)
    {
        // Lock the staging row for the duration of the transaction so two admins
        // reviewing the same draft at once cannot both promote it into two campers.
        // A second confirm blocks here, then sees status != 'pending' and is rejected.
        await using var tx = await db.Database.BeginTransactionAsync();

        var pending = await db.PendingRegistrations
            .FromSql($"SELECT * FROM pending_registrations WHERE pending_registration_id = {id} FOR UPDATE")
            .FirstOrDefaultAsync();
        if (pending is null) { return NotFound(); }
        if (pending.Status != "pending")
        {
            return Conflict("This registration has already been reviewed.");
        }

        if (request.Dob.Year < 1900 || request.Dob > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return BadRequest("Date of birth is not a valid date.");
        }

        if (pending.PossibleDuplicate && !request.ConfirmDespiteDuplicate)
        {
            return Conflict(
                "This child looks like an existing camper. A returning child should be "
                + "re-registered to the new camp, not created again. Confirm anyway to override.");
        }

        var camperId = Guid.NewGuid();
        var fileNumber = string.IsNullOrWhiteSpace(request.FileNumber)
            ? $"INTAKE-{camperId:N}"[..15]
            : request.FileNumber.Trim();
        var now = DateTimeOffset.UtcNow;

        var camper = new Camper
        {
            CamperId = camperId,
            FirstName = request.FirstName,
            Surname = request.Surname,
            Dob = request.Dob,
            Sex = NormaliseSex(request.Sex),
            Race = request.Race,
            Address = request.Address,
            CellNumber = request.CellNumber,
            Language = request.Language,
            TShirtSize = request.TShirtSize,
            FileNumber = fileNumber,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Campers.Add(camper);

        db.Caregivers.Add(new Caregiver
        {
            CaregiverId = Guid.NewGuid(),
            CamperId = camperId,
            Name = request.CaregiverName,
            CellNo = request.CaregiverCellNo,
            WorkNo = request.CaregiverWorkNo,
            Relationship = string.IsNullOrWhiteSpace(request.CaregiverRelationship)
                ? "Parent / caregiver"
                : request.CaregiverRelationship,
            IsPrimary = true,
            CreatedAt = now,
        });

        db.EmergencyContacts.Add(new EmergencyContact
        {
            ContactId = Guid.NewGuid(),
            CamperId = camperId,
            Name = request.EmergencyName,
            CellNo = request.EmergencyCellNo,
            WorkNo = request.EmergencyWorkNo,
            Relationship = request.EmergencyRelationship,
            CreatedAt = now,
        });

        pending.Status = "confirmed";
        pending.PromotedCamperId = camperId;
        pending.ReviewedAt = now;

        try
        {
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // Transaction disposes without commit, so the staging row stays 'pending'.
            return Conflict("A camper with this file number already exists.");
        }

        return CreatedAtAction(
            actionName: "GetById",
            controllerName: "Campers",
            routeValues: new { id = camperId },
            value: ToCamperDto(camper));
    }

    [HttpPost("{id:guid}/discard")]
    public async Task<IActionResult> Discard(Guid id)
    {
        var pending = await db.PendingRegistrations.FindAsync(id);
        if (pending is null) { return NotFound(); }
        if (pending.Status != "pending")
        {
            return Conflict("This registration has already been reviewed.");
        }

        pending.Status = "discarded";
        pending.ReviewedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// The campers.sex column is canonically "M" or "F", matching the seeder and
    /// the camper form's enum. The public intake form collects the words "Male"
    /// and "Female", so confirmation must fold them down. Storing the long form
    /// put two conventions in one column, which made the camper edit form load
    /// "Female" as "M" and silently flip a child's sex on the next save.
    /// </summary>
    private static string NormaliseSex(string sex) => sex.Trim().ToLowerInvariant() switch
    {
        "m" or "male" => "M",
        "f" or "female" => "F",
        _ => sex.Trim(),
    };

    private static bool TryParseDob(string text, out DateOnly dob)
    {
        text = text.Trim();
        if (DateOnly.TryParseExact(text, DobFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out dob))
        {
            return true;
        }
        return DateOnly.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out dob);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static string? NullIfBlank(string value, int? max)
    {
        if (string.IsNullOrWhiteSpace(value)) { return null; }
        return max is { } m ? Truncate(value, m) : value;
    }

    private static PendingRegistrationDto ToDto(PendingRegistration p) => new()
    {
        PendingRegistrationId = p.PendingRegistrationId,
        ImportBatchId = p.ImportBatchId,
        SourceRow = p.SourceRow,
        FirstName = p.FirstName,
        Surname = p.Surname,
        Dob = p.Dob,
        Sex = p.Sex,
        Race = p.Race,
        Address = p.Address,
        CellNumber = p.CellNumber,
        Language = p.Language,
        TShirtSize = p.TShirtSize,
        CaregiverName = p.CaregiverName,
        CaregiverCellNo = p.CaregiverCellNo,
        CaregiverWorkNo = p.CaregiverWorkNo,
        EmergencyName = p.EmergencyName,
        EmergencyCellNo = p.EmergencyCellNo,
        EmergencyWorkNo = p.EmergencyWorkNo,
        EmergencyRelationship = p.EmergencyRelationship,
        RawDob = p.RawDob,
        ImportNote = p.ImportNote,
        Status = p.Status,
        PossibleDuplicate = p.PossibleDuplicate,
        DuplicateOfCamperId = p.DuplicateOfCamperId,
        PromotedCamperId = p.PromotedCamperId,
        ImportedAt = p.ImportedAt,
    };

    private static CamperDto ToCamperDto(Camper c) => new()
    {
        CamperId = c.CamperId,
        FirstName = c.FirstName,
        Surname = c.Surname,
        Dob = c.Dob,
        Sex = c.Sex,
        Race = c.Race,
        Address = c.Address,
        CellNumber = c.CellNumber,
        Language = c.Language,
        TShirtSize = c.TShirtSize,
        PhotoUrl = c.PhotoUrl,
        Diagnosis = c.Diagnosis,
        TreatingClinic = c.TreatingClinic,
        FileNumber = c.FileNumber,
        FamilyGroupId = c.FamilyGroupId,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt,
    };
}
