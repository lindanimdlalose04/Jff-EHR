namespace JffEhr.Api.Entities;

public class EmergencyContact
{
    public Guid ContactId { get; set; }

    public Guid CamperId { get; set; }
    public Camper? Camper { get; set; }

    public required string Name { get; set; }
    public required string CellNo { get; set; }
    public string? WorkNo { get; set; }
    public required string Relationship { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
