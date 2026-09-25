export const studentPortalKeys = {
  all: ['student-portal'] as const,
  profile: () => [...studentPortalKeys.all, 'profile'] as const,
  academics: () => [...studentPortalKeys.all, 'academics'] as const,
  subjects: () => [...studentPortalKeys.all, 'subjects'] as const,
  attendance: () => [...studentPortalKeys.all, 'attendance'] as const,
  timetable: () => [...studentPortalKeys.all, 'timetable'] as const,
  progress: () => [...studentPortalKeys.all, 'progress'] as const,
};
