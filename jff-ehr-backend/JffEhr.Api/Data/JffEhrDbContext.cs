using JffEhr.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JffEhr.Api.Data;

/// <summary>
/// EF Core context for all 16 ERD entities. Configures relationships, nullability,
/// string lengths and unique constraints. Migrations, RLS and immutability triggers
/// are generated from this model; see HANDOVER.md build order.
///
/// Delete behaviour is a three-way split:
///  - Clinical tables (soft-delete only, DeletedAt/DeletedBy): never physically removed;
///    DB-level immutability triggers (added via migration) block hard DELETE outright,
///    regardless of what's configured here at the FK level.
///  - Operational chain (Camp -> CampRegistration -> its dependent rows): Cascade.
///  - Reference/lookup relationships (the 9 CrewMember performer-role FKs, User<->
///    CrewMember, and the DeletedBy -> CrewMember audit FKs): Restrict, so a crew
///    member referenced as author of any record can never be deleted out from under it.
/// </summary>
public class JffEhrDbContext(DbContextOptions<JffEhrDbContext> options) : DbContext(options)
{
    public DbSet<Camper> Campers => Set<Camper>();
    public DbSet<Caregiver> Caregivers => Set<Caregiver>();
    public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
    public DbSet<CrewMember> CrewMembers => Set<CrewMember>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Camp> Camps => Set<Camp>();
    public DbSet<CampRegistration> CampRegistrations => Set<CampRegistration>();
    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();
    public DbSet<CrewMedicalCheckin> CrewMedicalCheckins => Set<CrewMedicalCheckin>();
    public DbSet<PrecampMedical> PrecampMedicals => Set<PrecampMedical>();
    public DbSet<ArrivalCheck> ArrivalChecks => Set<ArrivalCheck>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<MedicationDose> MedicationDoses => Set<MedicationDose>();
    public DbSet<MedshackVisit> MedshackVisits => Set<MedshackVisit>();
    public DbSet<MedshackTreatment> MedshackTreatments => Set<MedshackTreatment>();
    public DbSet<MedicationEvent> MedicationEvents => Set<MedicationEvent>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureCamper(modelBuilder);
        ConfigureCaregiver(modelBuilder);
        ConfigureEmergencyContact(modelBuilder);
        ConfigureCrewMember(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureCamp(modelBuilder);
        ConfigureCampRegistration(modelBuilder);
        ConfigureConsentRecord(modelBuilder);
        ConfigureCrewMedicalCheckin(modelBuilder);
        ConfigurePrecampMedical(modelBuilder);
        ConfigureArrivalCheck(modelBuilder);
        ConfigurePrescription(modelBuilder);
        ConfigureMedicationDose(modelBuilder);
        ConfigureMedshackVisit(modelBuilder);
        ConfigureMedshackTreatment(modelBuilder);
        ConfigureMedicationEvent(modelBuilder);
        ConfigureAuditLog(modelBuilder);
    }

    private static void ConfigureCamper(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Camper>(entity =>
        {
            entity.HasKey(e => e.CamperId);
            entity.HasIndex(e => e.FileNumber).IsUnique();

            entity.Property(e => e.FirstName).HasMaxLength(80);
            entity.Property(e => e.Surname).HasMaxLength(80);
            entity.Property(e => e.Sex).HasMaxLength(8);
            entity.Property(e => e.Race).HasMaxLength(30);
            entity.Property(e => e.CellNumber).HasMaxLength(20);
            entity.Property(e => e.Language).HasMaxLength(40);
            entity.Property(e => e.TShirtSize).HasMaxLength(8);
            entity.Property(e => e.FileNumber).HasMaxLength(20);

            entity.HasMany(e => e.Caregivers)
                .WithOne(e => e.Camper)
                .HasForeignKey(e => e.CamperId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.EmergencyContacts)
                .WithOne(e => e.Camper)
                .HasForeignKey(e => e.CamperId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Registrations)
                .WithOne(e => e.Camper)
                .HasForeignKey(e => e.CamperId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCaregiver(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Caregiver>(entity =>
        {
            entity.HasKey(e => e.CaregiverId);
            entity.Property(e => e.Name).HasMaxLength(160);
            entity.Property(e => e.CellNo).HasMaxLength(20);
            entity.Property(e => e.WorkNo).HasMaxLength(20);
            entity.Property(e => e.Relationship).HasMaxLength(40);
        });
    }

    private static void ConfigureEmergencyContact(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmergencyContact>(entity =>
        {
            entity.HasKey(e => e.ContactId);
            entity.Property(e => e.Name).HasMaxLength(160);
            entity.Property(e => e.CellNo).HasMaxLength(20);
            entity.Property(e => e.WorkNo).HasMaxLength(20);
            entity.Property(e => e.Relationship).HasMaxLength(40);
        });
    }

    private static void ConfigureCrewMember(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrewMember>(entity =>
        {
            entity.HasKey(e => e.CrewId);
            entity.HasIndex(e => e.IdNumber).IsUnique();

            entity.Property(e => e.Name).HasMaxLength(80);
            entity.Property(e => e.Surname).HasMaxLength(80);
            entity.Property(e => e.IdNumber).HasMaxLength(20);
            entity.Property(e => e.Role).HasMaxLength(60);

            entity.HasMany(e => e.CheckInsPerformed)
                .WithOne(e => e.CheckedInByCrewMember)
                .HasForeignKey(e => e.CheckedInBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.PrecampMedicalsCaptured)
                .WithOne(e => e.CapturedByCrewMember)
                .HasForeignKey(e => e.CapturedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.ArrivalChecksAssessed)
                .WithOne(e => e.AssessedByCrewMember)
                .HasForeignKey(e => e.AssessedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.ArrivalChecksSigned)
                .WithOne(e => e.SignedByCrewMember)
                .HasForeignKey(e => e.SignedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.PrescriptionsPrescribed)
                .WithOne(e => e.PrescribedByCrewMember)
                .HasForeignKey(e => e.PrescribedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedicationDosesAdministered)
                .WithOne(e => e.AdministeredByCrewMember)
                .HasForeignKey(e => e.AdministeredBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedshackVisitsAsNurse)
                .WithOne(e => e.Nurse)
                .HasForeignKey(e => e.NurseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedshackVisitsAsDoctor)
                .WithOne(e => e.Doctor)
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedshackTreatmentsAdministered)
                .WithOne(e => e.AdministeredByCrewMember)
                .HasForeignKey(e => e.AdministeredBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedicationEventsReported)
                .WithOne(e => e.Reporter)
                .HasForeignKey(e => e.ReporterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.MedicationEventsReviewed)
                .WithOne(e => e.Reviewer)
                .HasForeignKey(e => e.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.HasIndex(e => e.CrewId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.Email).HasMaxLength(160);
            entity.Property(e => e.RolePermissions).HasMaxLength(40);

            // One-to-one: a CrewMember may have exactly one User account.
            entity.HasOne(e => e.CrewMember)
                .WithOne(e => e.User)
                .HasForeignKey<User>(e => e.CrewId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.AuditLogs)
                .WithOne(e => e.User)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCamp(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Camp>(entity =>
        {
            entity.HasKey(e => e.CampId);
            entity.HasIndex(e => e.CampNumber).IsUnique();

            entity.Property(e => e.Venue).HasMaxLength(200);
            entity.Property(e => e.Province).HasMaxLength(40);
            entity.Property(e => e.CampType).HasMaxLength(60);
            entity.Property(e => e.Status).HasMaxLength(20);

            // Operational chain: deleting a Camp cascades to its registrations.
            entity.HasMany(e => e.Registrations)
                .WithOne(e => e.Camp)
                .HasForeignKey(e => e.CampId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.CrewMedicalCheckins)
                .WithOne(e => e.Camp)
                .HasForeignKey(e => e.CampId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCampRegistration(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CampRegistration>(entity =>
        {
            entity.HasKey(e => e.RegistrationId);

            entity.Property(e => e.Cabin).HasMaxLength(20);
            entity.Property(e => e.GroupName).HasMaxLength(40);
            entity.Property(e => e.Status).HasMaxLength(20);

            // Operational chain: FK-level cascade. For the clinical dependents (all but
            // none here, since ConsentRecord/Prescription/MedshackVisit/MedicationEvent
            // are themselves clinical soft-delete tables) the DB immutability trigger
            // still blocks the cascaded DELETE unless every such row is already soft-
            // deleted, so this cascade is a safety net for pure operational cleanup, not
            // a way to bypass the soft-delete requirement. See DbContext-level doc comment.
            entity.HasMany(e => e.ConsentRecords)
                .WithOne(e => e.Registration)
                .HasForeignKey(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Prescriptions)
                .WithOne(e => e.Registration)
                .HasForeignKey(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.MedshackVisits)
                .WithOne(e => e.Registration)
                .HasForeignKey(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.MedicationEvents)
                .WithOne(e => e.Registration)
                .HasForeignKey(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureConsentRecord(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConsentRecord>(entity =>
        {
            entity.HasKey(e => e.ConsentId);

            entity.Property(e => e.ConsentType).HasMaxLength(40);
            entity.Property(e => e.SignedBy).HasMaxLength(160);
            entity.Property(e => e.WitnessName).HasMaxLength(160);
            entity.Property(e => e.SignedLocation).HasMaxLength(120);

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureCrewMedicalCheckin(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrewMedicalCheckin>(entity =>
        {
            entity.HasKey(e => e.CheckinId);

            entity.HasOne(e => e.CrewMember)
                .WithMany(e => e.MedicalCheckins)
                .HasForeignKey(e => e.CrewId)
                .OnDelete(DeleteBehavior.Restrict);

            // CheckedInByCrewMember -> CrewMember.CheckInsPerformed is configured
            // from the CrewMember side in ConfigureCrewMember.
        });
    }

    private static void ConfigurePrecampMedical(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PrecampMedical>(entity =>
        {
            entity.HasKey(e => e.PrecampId);
            // One LIVE record per registration. Filtered on deleted_at so a
            // soft-deleted (amended) record does not burn the slot: the amend
            // flow soft-deletes the old row and inserts a correction.
            entity.HasIndex(e => e.RegistrationId)
                .IsUnique()
                .HasFilter("deleted_at IS NULL");

            entity.Property(e => e.HospitalFileNumber).HasMaxLength(40);
            entity.Property(e => e.ViralLoad).HasMaxLength(40);
            entity.Property(e => e.TbStatus).HasMaxLength(20);
            entity.Property(e => e.Religion).HasMaxLength(40);
            entity.Property(e => e.DietaryRequirements).HasMaxLength(200);
            entity.Property(e => e.MedicationList).HasColumnType("jsonb");

            // One-to-one: at most one pre-camp medical per CampRegistration
            // (viral load / TB status are re-declared each camp cycle).
            entity.HasOne(e => e.Registration)
                .WithOne(e => e.PrecampMedical)
                .HasForeignKey<PrecampMedical>(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);

            // CapturedByCrewMember -> CrewMember.PrecampMedicalsCaptured is configured
            // from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureArrivalCheck(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ArrivalCheck>(entity =>
        {
            entity.HasKey(e => e.ArrivalCheckId);
            // One LIVE check per registration. Filtered on deleted_at so the
            // amend flow (soft-delete the signed row, insert a fresh draft) is
            // not blocked by the retired record still holding the slot.
            entity.HasIndex(e => e.RegistrationId)
                .IsUnique()
                .HasFilter("deleted_at IS NULL");

            entity.Property(e => e.Status).HasMaxLength(10);
            entity.Property(e => e.AdlNeeds).HasColumnType("jsonb");
            entity.Property(e => e.TbScreening).HasColumnType("jsonb");
            entity.Property(e => e.MedicationList).HasColumnType("jsonb");

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_ArrivalCheck_Status", "status IN ('draft', 'signed')"));

            // Signed rows must carry both signature stamps; drafts carry neither.
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_ArrivalCheck_SignedStamps",
                "(status = 'signed') = (signed_at IS NOT NULL AND signed_by IS NOT NULL)"));

            // One-to-one: a child assessed at Camp 12 is re-assessed at Camp 13.
            entity.HasOne(e => e.Registration)
                .WithOne(e => e.ArrivalCheck)
                .HasForeignKey<ArrivalCheck>(e => e.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);

            // AssessedBy/SignedBy -> CrewMember.ArrivalChecksAssessed/Signed are
            // configured from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigurePrescription(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.PrescriptionId);

            entity.Property(e => e.MedicationName).HasMaxLength(120);
            entity.Property(e => e.Dose).HasMaxLength(60);
            entity.Property(e => e.Route).HasMaxLength(40);
            entity.Property(e => e.Frequency).HasMaxLength(60);
            entity.Property(e => e.ScheduledTimes).HasColumnType("jsonb");

            // Completes the prescription -> dose chain (operational cascade).
            entity.HasMany(e => e.Doses)
                .WithOne(e => e.Prescription)
                .HasForeignKey(e => e.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            // PrescribedByCrewMember -> CrewMember.PrescriptionsPrescribed is configured
            // from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureMedicationDose(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedicationDose>(entity =>
        {
            entity.HasKey(e => e.DoseId);
            entity.Property(e => e.Status).HasMaxLength(20);

            // AdministeredByCrewMember -> CrewMember.MedicationDosesAdministered is
            // configured from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureMedshackVisit(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedshackVisit>(entity =>
        {
            entity.HasKey(e => e.VisitId);

            entity.Property(e => e.AccompaniedBy).HasMaxLength(160);
            entity.Property(e => e.BloodPressure).HasMaxLength(20);
            entity.Property(e => e.Temperature).HasColumnType("decimal(4,1)");

            // Completes the visit -> treatment chain (operational cascade).
            entity.HasMany(e => e.Treatments)
                .WithOne(e => e.Visit)
                .HasForeignKey(e => e.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            // Nurse/Doctor -> CrewMember.MedshackVisitsAsNurse/AsDoctor are configured
            // from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureMedshackTreatment(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedshackTreatment>(entity =>
        {
            entity.HasKey(e => e.TreatmentId);

            // AdministeredByCrewMember -> CrewMember.MedshackTreatmentsAdministered is
            // configured from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureMedicationEvent(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedicationEvent>(entity =>
        {
            entity.HasKey(e => e.EventId);

            entity.Property(e => e.EventTypes).HasColumnType("jsonb");
            entity.Property(e => e.ContributingFactors).HasColumnType("jsonb");

            // Reporter/Reviewer -> CrewMember.MedicationEventsReported/Reviewed are
            // configured from the CrewMember side in ConfigureCrewMember.

            ConfigureClinicalSoftDelete(entity);
        });
    }

    private static void ConfigureAuditLog(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditId);

            entity.Property(e => e.EntityTable).HasMaxLength(40);
            entity.Property(e => e.Action).HasMaxLength(20);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.BeforeState).HasColumnType("jsonb");
            entity.Property(e => e.AfterState).HasColumnType("jsonb");

            // EntityId is a generic reference to any of the 16 tables; deliberately
            // not configured as a foreign key.
        });
    }

    /// <summary>
    /// Shared configuration for the clinical soft-delete entities: the DeletedBy FK
    /// (Restrict, so a crew member referenced as the one who soft-deleted a record can't
    /// be removed), a query filter excluding soft-deleted rows by default, and a check
    /// constraint enforcing DeletedAt/DeletedBy are set together or not at all. Hard
    /// DELETE and any other column update are blocked at the DB level by a trigger added
    /// in the AddSecurityLayer migration, not by anything EF Core can express here.
    /// </summary>
    private static void ConfigureClinicalSoftDelete<TEntity>(EntityTypeBuilder<TEntity> entity)
        where TEntity : class, ISoftDeletableClinicalEntity
    {
        entity.HasOne(e => e.DeletedByCrewMember)
            .WithMany()
            .HasForeignKey(e => e.DeletedBy)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasQueryFilter(e => e.DeletedAt == null);

        entity.ToTable(t => t.HasCheckConstraint(
            $"CK_{typeof(TEntity).Name}_DeletedAtDeletedBy",
            "(deleted_at IS NULL) = (deleted_by IS NULL)"));
    }
}
