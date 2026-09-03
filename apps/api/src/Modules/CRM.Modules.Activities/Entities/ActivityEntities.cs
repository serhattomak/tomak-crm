using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Activities.Entities;

[Table("activities", Schema = "public")]
public class Activity : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("title")]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Meeting, Call, Task, Visit
    /// </summary>
    [Column("type")]
    [MaxLength(50)]
    public string Type { get; set; } = "Meeting";

    /// <summary>
    /// Scheduled, Completed, Cancelled, Missed
    /// </summary>
    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "Scheduled";

    /// <summary>
    /// Low, Medium, High, Urgent
    /// </summary>
    [Column("priority")]
    [MaxLength(50)]
    public string Priority { get; set; } = "Medium";

    [Column("start_time")]
    public DateTime? StartTime { get; set; }

    [Column("end_time")]
    public DateTime? EndTime { get; set; }

    [Column("is_all_day")]
    public bool IsAllDay { get; set; } = false;

    [Column("due_date")]
    public DateTime? DueDate { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("location")]
    [MaxLength(255)]
    public string? Location { get; set; }

    [Column("meeting_link")]
    [MaxLength(500)]
    public string? MeetingLink { get; set; }

    /// <summary>
    /// Incoming, Outgoing
    /// </summary>
    [Column("call_direction")]
    [MaxLength(50)]
    public string? CallDirection { get; set; }

    /// <summary>
    /// Interested, ProposalRequested, LeftMessage, NoAnswer, Busy, WrongNumber, FollowUpNeeded, Other
    /// </summary>
    [Column("call_outcome")]
    [MaxLength(50)]
    public string? CallOutcome { get; set; }

    [Column("call_duration_minutes")]
    public int? CallDurationMinutes { get; set; }

    [Column("outcome_notes")]
    public string? OutcomeNotes { get; set; }

    [Column("customer_id")]
    public Guid? CustomerId { get; set; }

    [Column("customer_name")]
    [MaxLength(255)]
    public string? CustomerName { get; set; }

    [Column("deal_id")]
    public Guid? DealId { get; set; }

    [Column("deal_title")]
    [MaxLength(255)]
    public string? DealTitle { get; set; }

    [Column("assigned_user_id")]
    public Guid? AssignedUserId { get; set; }

    [Column("assigned_user_name")]
    [MaxLength(255)]
    public string? AssignedUserName { get; set; }

    [Column("created_by_user_id")]
    public Guid? CreatedByUserId { get; set; }

    [Column("created_by_user_name")]
    [MaxLength(255)]
    public string? CreatedByUserName { get; set; }

    [Column("reminder_minutes_before")]
    public int? ReminderMinutesBefore { get; set; }

    /// <summary>
    /// JSON array of attendee emails or names: [{"name":"Ali","email":"ali@example.com"}]
    /// </summary>
    [Column("attendees_json")]
    public string? AttendeesJson { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
