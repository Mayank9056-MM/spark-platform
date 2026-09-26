import type { DayOfWeek, Prisma } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type { ListFacultyLecturesFilters } from './faculty.types.js';

export class FacultyRepository {
  async findFacultyRoleAssignment(userId: string) {
    const now = new Date();
    return prisma.roleAssignment.findFirst({
      where: {
        userId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        role: {
          key: { in: ['faculty', 'hod', 'admin', 'super_admin'] },
        },
      },
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findUserWithProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
      },
    });
  }

  async findDepartmentById(departmentId: string) {
    return prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
  }

  async findActiveAcademicYear() {
    return prisma.academicYear.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  async findFacultyAssignments(userId: string) {
    return prisma.facultyAssignment.findMany({
      where: { facultyUserId: userId },
      include: {
        subjectOffering: {
          include: {
            subject: {
              include: {
                semesterCatalog: {
                  include: {
                    curriculumVersion: {
                      include: {
                        program: {
                          include: {
                            department: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            academicYear: true,
          },
        },
        subjectComponent: true,
        timetableEntries: {
          where: { isCancelled: false },
        },
        _count: {
          select: {
            lectures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findFacultyTimetable(userId: string) {
    return prisma.timetable.findMany({
      where: {
        facultyAssignment: {
          facultyUserId: userId,
        },
        isCancelled: false,
      },
      include: {
        room: true,
        timeSlot: true,
        subjectOffering: {
          include: {
            subject: true,
          },
        },
        subjectComponent: true,
        semesterCatalog: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findFacultyLectures(userId: string, filters: ListFacultyLecturesFilters = {}) {
    // Auto-materialize scheduled lectures from active Timetable entries for the target day
    try {
      const targetDateStr = filters.date ?? new Date().toISOString().split('T')[0]!;
      const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);
      const DAY_OF_WEEK_BY_UTC_DAY: Readonly<Record<number, DayOfWeek>> = {
        1: 'MONDAY',
        2: 'TUESDAY',
        3: 'WEDNESDAY',
        4: 'THURSDAY',
        5: 'FRIDAY',
        6: 'SATURDAY',
      };
      const dayOfWeek = DAY_OF_WEEK_BY_UTC_DAY[targetDate.getUTCDay()];

      if (dayOfWeek) {
        const activeTimetables = await prisma.timetable.findMany({
          where: {
            facultyAssignment: {
              facultyUserId: userId,
            },
            isCancelled: false,
            dayOfWeek,
            effectiveFrom: { lte: targetDate },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: targetDate } },
            ],
          },
          include: {
            facultyAssignment: true,
          },
        });

        for (const tt of activeTimetables) {
          const existing = await prisma.lecture.findFirst({
            where: {
              subjectOfferingId: tt.subjectOfferingId,
              scheduledDate: targetDate,
              startTime: tt.startTime,
            },
          });

          if (!existing) {
            await prisma.lecture.create({
              data: {
                timetableId: tt.id,
                subjectOfferingId: tt.subjectOfferingId,
                subjectComponentId: tt.subjectComponentId,
                facultyAssignmentId: tt.facultyAssignmentId,
                facultyUserId: tt.facultyAssignment.facultyUserId,
                roomId: tt.roomId,
                semesterCatalogId: tt.semesterCatalogId,
                academicYearId: tt.academicYearId,
                scheduledDate: targetDate,
                startTime: tt.startTime,
                endTime: tt.endTime,
                status: 'SCHEDULED',
              },
            }).catch(() => {
              // Ignore potential duplicate or race condition
            });
          }
        }
      }
    } catch {
      // Continue safely if auto-materialization encounters any DB issue
    }

    const where: Prisma.LectureWhereInput = {
      facultyUserId: userId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      const targetDate = new Date(`${filters.date}T00:00:00.000Z`);
      where.scheduledDate = targetDate;
    } else if (filters.startDate || filters.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.scheduledDate.lte = new Date(`${filters.endDate}T00:00:00.000Z`);
      }
    }

    return prisma.lecture.findMany({
      where,
      include: {
        room: true,
        subjectOffering: {
          include: {
            subject: true,
          },
        },
        subjectComponent: true,
        semesterCatalog: true,
        academicYear: true,
        attendanceSession: {
          include: {
            records: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'desc' }, { startTime: 'asc' }],
    });
  }

  async findLectureById(lectureId: string) {
    return prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        room: true,
        subjectOffering: {
          include: {
            subject: true,
          },
        },
        subjectComponent: true,
        semesterCatalog: true,
        academicYear: true,
        attendanceSession: {
          include: {
            records: true,
          },
        },
      },
    });
  }

  async findEligibleStudentsForLecture(semesterCatalogId: string, academicYearId: string) {
    return prisma.semesterEnrollment.findMany({
      where: {
        semesterCatalogId,
        academicYearId,
        status: 'IN_PROGRESS',
      },
      include: {
        studentEnrollment: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        studentEnrollment: {
          rollNumber: 'asc',
        },
      },
    });
  }

  async findAttendanceSessionByLectureIdTx(tx: Prisma.TransactionClient, lectureId: string) {
    return tx.attendanceSession.findUnique({
      where: { lectureId },
      include: {
        records: true,
      },
    });
  }

  async createAttendanceSessionTx(
    tx: Prisma.TransactionClient,
    data: { lectureId: string; takenByUserId: string },
  ) {
    return tx.attendanceSession.create({
      data: {
        lectureId: data.lectureId,
        takenByUserId: data.takenByUserId,
        status: 'OPEN',
      },
    });
  }

  async upsertAttendanceRecordTx(
    tx: Prisma.TransactionClient,
    data: {
      attendanceSessionId: string;
      semesterEnrollmentId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      markedByUserId: string;
    },
  ) {
    return tx.attendanceRecord.upsert({
      where: {
        attendanceSessionId_semesterEnrollmentId: {
          attendanceSessionId: data.attendanceSessionId,
          semesterEnrollmentId: data.semesterEnrollmentId,
        },
      },
      create: {
        attendanceSessionId: data.attendanceSessionId,
        semesterEnrollmentId: data.semesterEnrollmentId,
        status: data.status,
        markedByUserId: data.markedByUserId,
      },
      update: {
        status: data.status,
        markedByUserId: data.markedByUserId,
      },
    });
  }

  async lockAttendanceSessionTx(tx: Prisma.TransactionClient, sessionId: string) {
    return tx.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
    });
  }
}

export const facultyRepository = new FacultyRepository();
