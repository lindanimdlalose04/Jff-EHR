namespace JffEhr.Api.Entities;

public class CrewMedicalCheckin
{
    public Guid CheckinId { get; set; }

    /// <summary>
    /// The crew member's registration to this camp (B3). The check-in hangs off
    /// the registration, mirroring how a camper's clinical records hang off
    /// camp_registrations; the crew member and camp are read through it.
    /// </summary>
    public Guid CrewRegistrationId { get; set; }
    public CrewCampRegistration? CrewCampRegistration { get; set; }

    public string? Allergies { get; set; }

    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? CurrentMedications { get; set; }

    /// <summary>
    /// Free-text notes for anything clinically notable. Replaces the earlier
    /// broviac/port, blood-count and mobility fields, which Gail's demo review
    /// found too specific for a crew check-in.
    /// </summary>
    public string? Comments { get; set; }

    /// <summary>The crew indemnity / medical release acknowledgement (form 07 gate).</summary>
    public bool MedicalReleaseSigned { get; set; }

    /// <summary>The crew member performing the check-in.</summary>
    public Guid CheckedInBy { get; set; }
    public CrewMember? CheckedInByCrewMember { get; set; }

    public DateTimeOffset CheckedInAt { get; set; }
}
