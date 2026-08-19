using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Organization.Entities;

[Table("departments", Schema = "public")]
public class Department : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public Guid? LeadId { get; set; }
    public string? CostCenter { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Department? Parent { get; set; }
    public ICollection<Department> SubDepartments { get; set; } = [];
    public Employee? Lead { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
    public ICollection<JobPosition> JobPositions { get; set; } = [];
}

[Table("job_positions", Schema = "public")]
public class JobPosition : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Level { get; set; } = "Mid"; // Executive, Director, Manager, Lead, Senior, Mid, Junior, Intern
    public string? JobDescription { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Department? Department { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}

[Table("employees", Schema = "public")]
public class Employee : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? JobPositionId { get; set; }
    public Guid? ManagerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? EmployeeNumber { get; set; }
    public string? Title { get; set; }
    public string EmploymentType { get; set; } = "FullTime"; // FullTime, PartTime, Contractor, Remote, Hybrid, Intern
    public string Status { get; set; } = "Active"; // Active, OnLeave, Terminated, Probation
    public DateTime? HireDate { get; set; }
    public string? AvatarUrl { get; set; }
    public decimal? Salary { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string FullName => $"{FirstName} {LastName}".Trim();

    public Department? Department { get; set; }
    public JobPosition? JobPosition { get; set; }
    public Employee? Manager { get; set; }
    public ICollection<Employee> DirectReports { get; set; } = [];
}
