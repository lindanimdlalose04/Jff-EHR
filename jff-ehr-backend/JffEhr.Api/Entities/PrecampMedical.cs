namespace JffEhr.Api.Entities;

/// <summary>
/// Pre-camp medical information, the caregiver's half of the medical intake
/// (Refinement A). One per CampRegistration: viral load, TB status and adherence
/// are re-declared each camp cycle, so the per-camp history is preserved.
/// Owns the overlap fields (dietary_requirements, religion, additional_info);
/// the arrival check displays them read-only.
/// Source of field authority: spec/forms/01, part 2.
/// </summary>
public class PrecampMedical : ISoftDeletableClinicalEntity
{
    public Guid PrecampId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    /// <summary>Diagnosis as declared for this camp cycle (longitudinal diagnosis stays on Camper).</summary>
    public string? Diagnosis { get; set; }

    /// <summary>The treating clinic/hospital's own file number (not JFF's file_number).</summary>
    public string? HospitalFileNumber { get; set; }

    /// <summary>Clinic / hospital / doctor contact details where the child receives treatment.</summary>
    public string? TreatingContact { get; set; }

    public bool? VlOver1000 { get; set; }
    public string? ViralLoad { get; set; }
    public DateOnly? VlTestDate { get; set; }
    public DateOnly? VlDateReceived { get; set; }
    public string? ClinicalFindings { get; set; }

    /// <summary>current / past / negative / on treatment.</summary>
    public string? TbStatus { get; set; }
    public bool? HepatitisB { get; set; }
    public bool TbOisHistory { get; set; }
    public string? TbOisHistoryDetail { get; set; }

    /// <summary>jsonb array of medication names (the form numbers up to 4).</summary>
    public string? MedicationList { get; set; }

    public bool AdherenceBarriers { get; set; }
    public string? AdherenceBarriersDetail { get; set; }

    // Overlap fields, owned here per the build brief.
    public string? DietaryRequirements { get; set; }
    public string? Religion { get; set; }
    public string? AdditionalInfo { get; set; }

    /// <summary>Behavioural history, psychosocial needs, self-care needs (form: history / suggestions / limitations).</summary>
    public string? CamperHistoryNotes { get; set; }

    /// <summary>The staff member who captured the caregiver's form into the system.</summary>
    public Guid CapturedBy { get; set; }
    public CrewMember? CapturedByCrewMember { get; set; }
    public DateTimeOffset CapturedAt { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
