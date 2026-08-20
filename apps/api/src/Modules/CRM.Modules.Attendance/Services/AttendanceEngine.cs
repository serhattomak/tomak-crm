using CRM.Modules.Attendance.Entities;

namespace CRM.Modules.Attendance.Services;

public interface IAttendanceEngine
{
    void RecalculateRecord(AttendanceRecord record, ShiftSchedule? schedule, List<AttendancePunch> punches);
}

public class AttendanceEngine : IAttendanceEngine
{
    public void RecalculateRecord(AttendanceRecord record, ShiftSchedule? schedule, List<AttendancePunch> punches)
    {
        var sortedPunches = punches.OrderBy(p => p.PunchTime).ToList();
        if (sortedPunches.Count == 0)
        {
            record.FirstClockIn = null;
            record.LastClockOut = null;
            record.TotalWorkedMinutes = 0;
            record.TotalBreakMinutes = 0;
            record.OvertimeMinutes = 0;
            record.LateMinutes = 0;
            record.EarlyLeaveMinutes = 0;
            record.Status = "Absent";
            return;
        }

        var firstIn = sortedPunches.FirstOrDefault(p => p.PunchType == "ClockIn");
        var lastOut = sortedPunches.LastOrDefault(p => p.PunchType == "ClockOut");

        record.FirstClockIn = firstIn?.PunchTime;
        record.LastClockOut = lastOut?.PunchTime;

        // Calculate break duration
        int totalBreakMinutes = 0;
        DateTimeOffset? currentBreakStart = null;

        foreach (var p in sortedPunches)
        {
            if (p.PunchType == "BreakStart")
            {
                currentBreakStart = p.PunchTime;
            }
            else if (p.PunchType == "BreakEnd" && currentBreakStart.HasValue)
            {
                var duration = (int)(p.PunchTime - currentBreakStart.Value).TotalMinutes;
                if (duration > 0)
                {
                    totalBreakMinutes += duration;
                }
                currentBreakStart = null;
            }
        }
        record.TotalBreakMinutes = totalBreakMinutes;

        // Calculate total gross span
        int grossMinutes = 0;
        if (record.FirstClockIn.HasValue && record.LastClockOut.HasValue && record.LastClockOut > record.FirstClockIn)
        {
            grossMinutes = (int)(record.LastClockOut.Value - record.FirstClockIn.Value).TotalMinutes;
        }
        else if (record.FirstClockIn.HasValue && !record.LastClockOut.HasValue)
        {
            // Currently clocked in
            grossMinutes = (int)(DateTimeOffset.UtcNow - record.FirstClockIn.Value).TotalMinutes;
        }

        // Net worked minutes
        int netWorked = Math.Max(0, grossMinutes - totalBreakMinutes);
        record.TotalWorkedMinutes = netWorked;

        // Shift schedule comparison & tolerances
        var shiftTemplate = schedule?.ShiftTemplate;
        int expectedMinutes = 480; // 8h default
        int graceMinutes = 15;

        if (shiftTemplate != null)
        {
            var start = schedule?.CustomStartTime ?? shiftTemplate.StartTime;
            var end = schedule?.CustomEndTime ?? shiftTemplate.EndTime;
            var shiftSpan = end > start ? (int)(end - start).TotalMinutes : (int)(TimeSpan.FromHours(24) - start + end).TotalMinutes;
            expectedMinutes = Math.Max(0, shiftSpan - shiftTemplate.BreakDurationMinutes);
            graceMinutes = shiftTemplate.GracePeriodMinutes;

            // Late check
            if (record.FirstClockIn.HasValue)
            {
                var localIn = record.FirstClockIn.Value.LocalDateTime.TimeOfDay;
                if (localIn > start.Add(TimeSpan.FromMinutes(graceMinutes)))
                {
                    record.LateMinutes = (int)(localIn - start).TotalMinutes;
                }
                else
                {
                    record.LateMinutes = 0;
                }
            }

            // Early leave check
            if (record.LastClockOut.HasValue)
            {
                var localOut = record.LastClockOut.Value.LocalDateTime.TimeOfDay;
                if (localOut < end.Subtract(TimeSpan.FromMinutes(graceMinutes)))
                {
                    record.EarlyLeaveMinutes = (int)(end - localOut).TotalMinutes;
                }
                else
                {
                    record.EarlyLeaveMinutes = 0;
                }
            }
        }

        record.ExpectedWorkedMinutes = expectedMinutes;

        // Overtime check (Regular vs Holiday)
        if (netWorked > expectedMinutes)
        {
            var overtime = netWorked - expectedMinutes;
            var isWeekend = record.Date.DayOfWeek == DayOfWeek.Saturday || record.Date.DayOfWeek == DayOfWeek.Sunday;
            if (isWeekend)
            {
                record.HolidayOvertimeMinutes = overtime;
                record.OvertimeMinutes = 0;
            }
            else
            {
                record.OvertimeMinutes = overtime;
                record.HolidayOvertimeMinutes = 0;
            }
        }
        else
        {
            record.OvertimeMinutes = 0;
            record.HolidayOvertimeMinutes = 0;
        }

        // Determine final Status
        if (!record.FirstClockIn.HasValue)
        {
            record.Status = "Absent";
        }
        else if (record.LateMinutes > 0)
        {
            record.Status = "Late";
        }
        else if (record.EarlyLeaveMinutes > 0)
        {
            record.Status = "EarlyDeparture";
        }
        else
        {
            record.Status = "Present";
        }
    }
}
