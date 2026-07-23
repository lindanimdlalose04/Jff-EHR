using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class PrecampMedicalDto
{
    public Guid PrecampId { get; set; }
    public Guid RegistrationId { get; set; }
    public string? Diagnosis { get; set; }
    public string? HospitalFileNumber { get; set; }
    public string? TreatingContact { get; set; }
    public bool? VlOver1000 { get; set; }
    public string? ViralLoad { get; set; }
    public DateOnly? VlTestDate { get; set; }
    public DateOnly? VlDateReceived { get; set; }
    public string? ClinicalFindings { get; set; }
    public string? TbStatus { get; set; }
    public bool? HepatitisB { get; set; }
    public bool TbOisHistory { get; set; }
    public string? TbOisHistoryDetail { get; set; }
    public string? MedicationList { get; set; }
    public bool AdherenceBarriers { get; set; }
    public string? AdherenceBarriersDetail { get; set; }
    public string? DietaryRequirements { get; set; }
    public string? Religion { get; set; }
    public string? AdditionalInfo { get; set; }
    public string? CamperHistoryNotes { get; set; }
    public Guid CapturedBy { get; set; }
    public string? CapturedByName { get; set; }
    public DateTimeOffset CapturedAt { get; set; }
}

public sealed class CreatePrecampMedicalRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    public string? Diagnosis { get; set; }

    [MaxLength(40)]
    public string? HospitalFileNumber { get; set; }
    public string? TreatingContact { get; set; }

    public bool? VlOver1000 { get; set; }

    [MaxLength(40)]
    public string? ViralLoad { get; set; }
    public DateOnly? VlTestDate { get; set; }
    public DateOnly? VlDateReceived { get; set; }
    public string? ClinicalFindings { get; set; }

    [MaxLength(20)]
    public string? TbStatus { get; set; }
    public bool? HepatitisB { get; set; }
    public bool TbOisHistory { get; set; }
    public string? TbOisHistoryDetail { get; set; }

    public string? MedicationList { get; set; }
    public bool AdherenceBarriers { get; set; }
    public string? AdherenceBarriersDetail { get; set; }

    [MaxLength(200)]
    public string? DietaryRequirements { get; set; }

    [MaxLength(40)]
    public string? Religion { get; set; }
    public string? AdditionalInfo { get; set; }
    public string? CamperHistoryNotes { get; set; }
}

/// <summary>Same shape as create minus the registration, which never moves.</summary>
public sealed class UpdatePrecampMedicalRequest
{
    public string? Diagnosis { get; set; }

    [MaxLength(40)]
    public string? HospitalFileNumber { get; set; }
    public string? TreatingContact { get; set; }

    public bool? VlOver1000 { get; set; }

    [MaxLength(40)]
    public string? ViralLoad { get; set; }
    public DateOnly? VlTestDate { get; set; }
    public DateOnly? VlDateReceived { get; set; }
    public string? ClinicalFindings { get; set; }

    [MaxLength(20)]
    public string? TbStatus { get; set; }
    public bool? HepatitisB { get; set; }
    public bool TbOisHistory { get; set; }
    public string? TbOisHistoryDetail { get; set; }

    public string? MedicationList { get; set; }
    public bool AdherenceBarriers { get; set; }
    public string? AdherenceBarriersDetail { get; set; }

    [MaxLength(200)]
    public string? DietaryRequirements { get; set; }

    [MaxLength(40)]
    public string? Religion { get; set; }
    public string? AdditionalInfo { get; set; }
    public string? CamperHistoryNotes { get; set; }
}
