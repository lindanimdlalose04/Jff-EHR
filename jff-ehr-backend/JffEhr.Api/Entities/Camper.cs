namespace JffEhr.Api.Entities;

/// <summary>
/// Longitudinal camper record. Diagnosis and family_group_id (sibling grouping,
/// no junction table) live here; per-camp state is captured on CamperAssessment.
/// </summary>
public class Camper
{
    public Guid CamperId { get; set; }

    public required string FirstName { get; set; }
    public required string Surname { get; set; }
    public DateOnly Dob { get; set; }
    public required string Sex { get; set; }

    public string? Race { get; set; }
    public string? Address { get; set; }
    public string? CellNumber { get; set; }
    public string? Language { get; set; }
    public string? TShirtSize { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatingClinic { get; set; }

    /// <summary>Unique file number, not a surrogate key.</summary>
    public required string FileNumber { get; set; }

    /// <summary>Sibling grouping value. Not a foreign key; no junction table.</summary>
    public Guid? FamilyGroupId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Caregiver> Caregivers { get; set; } = new List<Caregiver>();
    public ICollection<EmergencyContact> EmergencyContacts { get; set; } = new List<EmergencyContact>();
    public ICollection<CampRegistration> Registrations { get; set; } = new List<CampRegistration>();
}
