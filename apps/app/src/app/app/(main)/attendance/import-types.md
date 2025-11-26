This file is just a developer note for CSV import formats.

Attendance CSV expected headers:
- display_name
- date (YYYY-MM-DD)
- status (scheduled | working | finished | absent)
- start_time (HH:MM or HH:MM:SS)
- end_time (HH:MM or HH:MM:SS)

The importAttendanceFromCsv action also takes `attendanceRole` from the form (cast or staff) and restricts name-to-profile mapping to profiles with matching role (staff includes admin).
