// apps/api/src/modules/hod/hod.repository.ts

import type { DayOfWeek, Prisma, StudentLifecycleStatus } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';
import { seedRoomsAndSlots } from '../../scripts/seed-rooms-and-slots.js';

import type {
  HodCourseOfferingDTO,
  HodTimetableSchedulingOptionsDTO,
  ListHodStudentsFilters,
} from './hod.types.js';

export class HodRepository {
  async findHodRoleAssignment(userId: string) {
    const now = new Date();
    return prisma.roleAssignment.findFirst({
      where: {
        userId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        role: {
          key: 'hod',
        },
      },
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
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
    });
  }

  async findActiveAcademicYear() {
    return prisma.academicYear.findFirst({
      where: { isActive: true },
    });
  }

  async findDepartmentOverview(departmentId: string, activeAcademicYearId?: string) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPrograms,
      totalFaculty,
      totalStudents,
      totalActiveSubjects,
      todayLectures,
      attendanceSessions,
      pendingPromotions,
      programs,
      recentLectures,
    ] = await Promise.all([
      prisma.program.count({
        where: { departmentId },
      }),
      prisma.roleAssignment.count({
        where: {
          scopeType: 'DEPARTMENT',
          scopeId: departmentId,
          role: { key: { in: ['faculty', 'hod'] } },
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
      }),
      prisma.studentEnrollment.count({
        where: {
          program: { departmentId },
          status: 'ACTIVE',
        },
      }),
      prisma.subject.count({
        where: {
          semesterCatalog: {
            curriculumVersion: {
              program: { departmentId },
              status: 'ACTIVE',
            },
          },
        },
      }),
      prisma.lecture.count({
        where: {
          scheduledDate: { gte: today, lt: tomorrow },
          ...(activeAcademicYearId && { academicYearId: activeAcademicYearId }),
          subjectOffering: {
            subject: {
              semesterCatalog: {
                curriculumVersion: {
                  program: { departmentId },
                },
              },
            },
          },
        },
      }),
      prisma.attendanceSession.findMany({
        where: {
          lecture: {
            ...(activeAcademicYearId && { academicYearId: activeAcademicYearId }),
            subjectOffering: {
              subject: {
                semesterCatalog: {
                  curriculumVersion: {
                    program: { departmentId },
                  },
                },
              },
            },
          },
        },
        include: {
          records: {
            select: {
              status: true,
            },
          },
        },
      }),
      prisma.promotionBatch.count({
        where: {
          academicYear: {
            isActive: true,
          },
          semesterCatalog: {
            curriculumVersion: {
              program: { departmentId },
            },
          },
        },
      }),
      prisma.program.findMany({
        where: { departmentId },
        include: {
          curriculumVersions: true,
        },
        orderBy: { code: 'asc' },
      }),
      prisma.lecture.findMany({
        where: {
          subjectOffering: {
            subject: {
              semesterCatalog: {
                curriculumVersion: {
                  program: { departmentId },
                },
              },
            },
          },
        },
        include: {
          room: true,
          facultyUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          subjectOffering: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: [{ scheduledDate: 'desc' }, { startTime: 'desc' }],
        take: 5,
      }),
    ]);

    // Calculate overall attendance rate
    let totalRecords = 0;
    let presentRecords = 0;
    for (const session of attendanceSessions) {
      for (const rec of session.records) {
        totalRecords++;
        if (rec.status === 'PRESENT' || rec.status === 'LATE') {
          presentRecords++;
        }
      }
    }
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    const mappedPrograms = programs.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      durationYears: p.durationYears,
      curriculumCount: p.curriculumVersions.length,
    }));

    const mappedLectures = recentLectures.map((lec) => {
      const formatTimeHelper = (d: Date | string) => {
        if (typeof d === 'string') return d.slice(11, 16);
        return d.toISOString().slice(11, 16);
      };
      return {
        id: lec.id,
        date: lec.scheduledDate.toISOString().split('T')[0]!,
        startTime: formatTimeHelper(lec.startTime),
        endTime: formatTimeHelper(lec.endTime),
        status: lec.status,
        subjectCode: lec.subjectOffering.subject.code,
        subjectName: lec.subjectOffering.subject.name,
        facultyName: `${lec.facultyUser.firstName} ${lec.facultyUser.lastName}`,
        roomName: lec.room.name,
      };
    });

    return {
      totalPrograms,
      totalFaculty,
      totalStudents,
      totalActiveSubjects,
      activeSubjects: totalActiveSubjects,
      todayLectures,
      todayClassesCount: todayLectures,
      attendanceRate,
      pendingPromotions,
      programs: mappedPrograms,
      recentLectures: mappedLectures,
    };
  }

  async findDepartmentFaculty(departmentId: string, activeAcademicYearId?: string) {
    const now = new Date();

    const roleAssignments = await prisma.roleAssignment.findMany({
      where: {
        scopeType: 'DEPARTMENT',
        scopeId: departmentId,
        role: { key: { in: ['faculty', 'hod'] } },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            status: true,
            facultyAssignments: {
              ...(activeAcademicYearId
                ? {
                    where: {
                      subjectOffering: {
                        academicYearId: activeAcademicYearId,
                      },
                    },
                  }
                : {}),
              include: {
                subjectOffering: {
                  include: {
                    subject: {
                      include: {
                        semesterCatalog: {
                          include: {
                            curriculumVersion: {
                              include: {
                                program: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                subjectComponent: true,
              },
            },
          },
        },
      },
    });

    return roleAssignments.map((ra) => {
      const user = ra.user;
      const assignments = user.facultyAssignments.map((fa) => ({
        subjectCode: fa.subjectOffering.subject.code,
        subjectName: fa.subjectOffering.subject.name,
        componentType: fa.subjectComponent.type,
        programCode:
          fa.subjectOffering.subject.semesterCatalog.curriculumVersion.program.code,
      }));

      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        designation: ra.role.displayName,
        roleKey: ra.role.key,
        assignmentCount: assignments.length,
        assignedSubjects: assignments,
      };
    });
  }

  async findDepartmentStudents(
    departmentId: string,
    filters: ListHodStudentsFilters,
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentEnrollmentWhereInput = {
      program: {
        departmentId,
      },
      ...(filters.programId && { programId: filters.programId }),
      ...(filters.status && { status: filters.status as StudentLifecycleStatus }),
      ...(filters.search && {
        OR: [
          { rollNumber: { contains: filters.search, mode: 'insensitive' } },
          { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, students] = await Promise.all([
      prisma.studentEnrollment.count({ where }),
      prisma.studentEnrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rollNumber: 'asc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          program: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          semesterEnrollments: {
            orderBy: { attemptNumber: 'desc' },
            take: 1,
            include: {
              semesterCatalog: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      students: students.map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        email: s.user.email,
        avatarUrl: s.user.avatarUrl,
        program: s.program,
        currentSemester: s.semesterEnrollments[0]?.semesterCatalog.number ?? null,
        status: s.status,
        admissionDate: s.admissionDate.toISOString().split('T')[0]!,
      })),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findDepartmentTimetable(
    departmentId: string,
    activeAcademicYearId?: string,
    dayOfWeek?: DayOfWeek,
    programId?: string,
  ) {
    const where: Prisma.TimetableWhereInput = {
      facultyAssignment: {
        subjectOffering: {
          ...(activeAcademicYearId && { academicYearId: activeAcademicYearId }),
          subject: {
            semesterCatalog: {
              curriculumVersion: {
                program: {
                  departmentId,
                  ...(programId && { id: programId }),
                },
              },
            },
          },
        },
      },
      ...(dayOfWeek && { dayOfWeek }),
    };

    return prisma.timetable.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { startTime: 'asc' } }],
      include: {
        room: true,
        timeSlot: true,
        facultyAssignment: {
          include: {
            faculty: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            subjectComponent: true,
            subjectOffering: {
              include: {
                subject: {
                  include: {
                    semesterCatalog: {
                      include: {
                        curriculumVersion: {
                          include: {
                            program: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findDepartmentAttendanceSummary(departmentId: string, activeAcademicYearId?: string) {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        lecture: {
          ...(activeAcademicYearId && { academicYearId: activeAcademicYearId }),
          subjectOffering: {
            subject: {
              semesterCatalog: {
                curriculumVersion: {
                  program: { departmentId },
                },
              },
            },
          },
        },
      },
      include: {
        lecture: {
          include: {
            facultyUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            subjectOffering: {
              include: {
                subject: true,
              },
            },
          },
        },
        records: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalSessions = sessions.length;
    let lockedSessions = 0;
    let totalRecords = 0;
    let presentRecords = 0;
    let lowAttendanceWarningCount = 0;

    const subjectMap = new Map<
      string,
      { code: string; name: string; totalSessions: number; totalRecords: number; presentRecords: number }
    >();

    const recentSessions = [];

    for (const session of sessions) {
      if (session.status === 'LOCKED') lockedSessions++;

      const sub = session.lecture.subjectOffering.subject;
      const stats = subjectMap.get(sub.id) ?? {
        code: sub.code,
        name: sub.name,
        totalSessions: 0,
        totalRecords: 0,
        presentRecords: 0,
      };

      stats.totalSessions++;
      let sessionPresent = 0;

      for (const rec of session.records) {
        totalRecords++;
        stats.totalRecords++;
        if (rec.status === 'PRESENT' || rec.status === 'LATE') {
          presentRecords++;
          stats.presentRecords++;
          sessionPresent++;
        }
      }

      subjectMap.set(sub.id, stats);

      const sessionTotal = session.records.length;
      const sessionPercentage =
        sessionTotal > 0 ? Math.round((sessionPresent / sessionTotal) * 100) : 0;
      if (sessionPercentage < 75) {
        lowAttendanceWarningCount++;
      }

      if (recentSessions.length < 10) {
        recentSessions.push({
          id: session.id,
          date: session.lecture.scheduledDate.toISOString().split('T')[0]!,
          lectureDate: session.lecture.scheduledDate.toISOString().split('T')[0]!,
          subjectCode: sub.code,
          subjectName: sub.name,
          facultyName: `${session.lecture.facultyUser.firstName} ${session.lecture.facultyUser.lastName}`,
          status: session.status,
          presentCount: sessionPresent,
          totalCount: sessionTotal,
          totalStudents: sessionTotal,
          percentage: sessionPercentage,
        });
      }
    }

    const overallAttendancePercentage =
      totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    const subjectBreakdown = Array.from(subjectMap.entries()).map(([id, s]) => ({
      subjectId: id,
      subjectCode: s.code,
      subjectName: s.name,
      totalSessions: s.totalSessions,
      attendancePercentage:
        s.totalRecords > 0 ? Math.round((s.presentRecords / s.totalRecords) * 100) : 0,
    }));

    return {
      overallAttendanceRate: overallAttendancePercentage,
      overallAttendancePercentage,
      totalSessionsRecorded: totalSessions,
      totalSessions,
      lockedSessions,
      lowAttendanceWarningCount,
      subjectBreakdown,
      recentSessions,
    };
  }

  async findDepartmentPromotions(departmentId: string) {
    const batches = await prisma.promotionBatch.findMany({
      where: {
        semesterCatalog: {
          curriculumVersion: {
            program: {
              departmentId,
            },
          },
        },
      },
      include: {
        academicYear: true,
        semesterCatalog: {
          include: {
            curriculumVersion: {
              include: {
                program: true,
              },
            },
          },
        },
        decisions: {
          select: {
            outcome: true,
          },
        },
        _count: {
          select: {
            decisions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return batches.map((b) => {
      const fromSemester = b.semesterCatalog.number;
      const toSemester = fromSemester + 1;
      const totalStudents = b.decisions.length;
      const promotedCount = b.decisions.filter((d) => d.outcome === 'PROMOTE').length;
      const detainedCount = b.decisions.filter((d) => d.outcome !== 'PROMOTE').length;
      const promotedAt = (b.finalizedAt ?? b.createdAt).toISOString();

      return {
        id: b.id,
        academicYear: {
          id: b.academicYear.id,
          label: b.academicYear.label,
        },
        program: {
          id: b.semesterCatalog.curriculumVersion.program.id,
          code: b.semesterCatalog.curriculumVersion.program.code,
          name: b.semesterCatalog.curriculumVersion.program.name,
        },
        fromSemester,
        toSemester,
        totalStudents,
        promotedCount,
        detainedCount,
        promotedAt,
        academicYearLabel: b.academicYear.label,
        semesterCatalogNumber: fromSemester,
        programName: b.semesterCatalog.curriculumVersion.program.name,
        programCode: b.semesterCatalog.curriculumVersion.program.code,
        status: b.status,
        createdAt: b.createdAt.toISOString().split('T')[0]!,
        totalDecisions: totalStudents,
      };
    });
  }

  async findSubjectOfferingById(subjectOfferingId: string) {
    return prisma.subjectOffering.findUnique({
      where: { id: subjectOfferingId },
      include: {
        subject: {
          include: {
            semesterCatalog: {
              include: {
                curriculumVersion: {
                  include: {
                    program: true,
                  },
                },
              },
            },
            components: true,
          },
        },
      },
    });
  }

  async findFacultyMemberInDept(facultyUserId: string, departmentId: string) {
    const now = new Date();
    return prisma.roleAssignment.findFirst({
      where: {
        userId: facultyUserId,
        scopeType: 'DEPARTMENT',
        scopeId: departmentId,
        role: { key: { in: ['faculty', 'hod'] } },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
    });
  }

  async findDepartmentCourseOfferings(
    departmentId: string,
    activeAcademicYearId?: string,
  ): Promise<HodCourseOfferingDTO[]> {
    if (activeAcademicYearId) {
      const activeSubjects = await prisma.subject.findMany({
        where: {
          semesterCatalog: {
            curriculumVersion: {
              program: { departmentId },
              status: 'ACTIVE',
            },
          },
        },
        select: { id: true },
      });

      if (activeSubjects.length > 0) {
        await Promise.all(
          activeSubjects.map((sub) =>
            prisma.subjectOffering.upsert({
              where: {
                subjectId_academicYearId: {
                  subjectId: sub.id,
                  academicYearId: activeAcademicYearId,
                },
              },
              create: {
                subjectId: sub.id,
                academicYearId: activeAcademicYearId,
              },
              update: {},
            }),
          ),
        );
      }
    }

    const offerings = await prisma.subjectOffering.findMany({
      where: {
        subject: {
          semesterCatalog: {
            curriculumVersion: {
              program: {
                departmentId,
              },
            },
          },
        },
        ...(activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {}),
      },
      include: {
        academicYear: {
          select: {
            id: true,
            label: true,
          },
        },
        subject: {
          include: {
            semesterCatalog: {
              include: {
                curriculumVersion: {
                  include: {
                    program: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
            components: {
              orderBy: {
                type: 'asc',
              },
            },
          },
        },
        facultyAssignments: {
          include: {
            faculty: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            subjectComponent: true,
          },
        },
      },
      orderBy: [
        { subject: { code: 'asc' } },
      ],
    });

    return Promise.all(
      offerings.map(async (offering) => {
        // If no components exist for this subject in the curriculum catalog, auto-provision a default THEORY component
        if (offering.subject.components.length === 0) {
          const defaultComp = await prisma.subjectComponent.create({
            data: {
              subjectId: offering.subject.id,
              type: 'THEORY',
              credits: 3,
              hoursPerWeek: 3,
            },
          });
          offering.subject.components.push(defaultComp);
        }

        const assignmentMap = new Map<
          string,
          { id: string; firstName: string; lastName: string; name: string; email: string }
        >();

        for (const fa of offering.facultyAssignments) {
          assignmentMap.set(fa.subjectComponentId, {
            id: fa.faculty.id,
            firstName: fa.faculty.firstName,
            lastName: fa.faculty.lastName,
            name: `${fa.faculty.firstName} ${fa.faculty.lastName}`.trim(),
            email: fa.faculty.email,
          });
        }

        const components = offering.subject.components.map((comp) => {
          const assigned = assignmentMap.get(comp.id);
          return {
            id: comp.id,
            type: comp.type,
            credits: comp.credits,
            hoursPerWeek: comp.hoursPerWeek,
            isAssigned: Boolean(assigned),
            assignedFaculty: assigned ?? null,
          };
        });

        return {
          id: offering.id,
          academicYear: {
            id: offering.academicYear.id,
            label: offering.academicYear.label,
          },
          subject: {
            id: offering.subject.id,
            code: offering.subject.code,
            name: offering.subject.name,
            isElective: offering.subject.isElective,
          },
          program: {
            id: offering.subject.semesterCatalog.curriculumVersion.program.id,
            code: offering.subject.semesterCatalog.curriculumVersion.program.code,
            name: offering.subject.semesterCatalog.curriculumVersion.program.name,
          },
          semesterNumber: offering.subject.semesterCatalog.number,
          components,
        };
      }),
    );
  }

  async findFacultyAssignmentById(id: string) {
    return prisma.facultyAssignment.findUnique({
      where: { id },
      include: {
        subjectOffering: {
          include: {
            subject: {
              include: {
                semesterCatalog: {
                  include: {
                    curriculumVersion: {
                      include: {
                        program: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findSchedulingOptions(
    departmentId: string,
    activeAcademicYearId?: string,
  ): Promise<HodTimetableSchedulingOptionsDTO> {
    const facultyAssignments = await prisma.facultyAssignment.findMany({
      where: {
        subjectOffering: {
          ...(activeAcademicYearId && { academicYearId: activeAcademicYearId }),
          subject: {
            semesterCatalog: {
              curriculumVersion: {
                program: {
                  departmentId,
                },
              },
            },
          },
        },
      },
      include: {
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        subjectComponent: true,
        subjectOffering: {
          include: {
            subject: {
              include: {
                semesterCatalog: {
                  include: {
                    curriculumVersion: {
                      include: {
                        program: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          subjectOffering: {
            subject: {
              code: 'asc',
            },
          },
        },
      ],
    });

    let rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
    });
    let timeSlots = await prisma.timeSlot.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    if (rooms.length === 0 || timeSlots.length === 0) {
      await seedRoomsAndSlots();
      rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      timeSlots = await prisma.timeSlot.findMany({
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    }

    const formatTime = (d: Date | string): string => {
      if (typeof d === 'string') return d.slice(11, 16);
      return d.toISOString().slice(11, 16);
    };

    return {
      facultyAssignments: facultyAssignments.map((fa) => {
        const sub = fa.subjectOffering.subject;
        const prog = sub.semesterCatalog.curriculumVersion.program;
        return {
          id: fa.id,
          faculty: {
            id: fa.faculty.id,
            firstName: fa.faculty.firstName,
            lastName: fa.faculty.lastName,
            name: `${fa.faculty.firstName} ${fa.faculty.lastName}`,
            email: fa.faculty.email,
          },
          subject: {
            id: sub.id,
            code: sub.code,
            name: sub.name,
          },
          component: {
            id: fa.subjectComponent.id,
            type: fa.subjectComponent.type,
            hoursPerWeek: fa.subjectComponent.hoursPerWeek,
          },
          program: {
            id: prog.id,
            code: prog.code,
            name: prog.name,
          },
          semesterNumber: sub.semesterCatalog.number,
        };
      }),
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
      })),
      timeSlots: timeSlots.map((ts) => {
        const start = formatTime(ts.startTime);
        const end = formatTime(ts.endTime);
        const dayLabel = ts.dayOfWeek.charAt(0) + ts.dayOfWeek.slice(1).toLowerCase();
        return {
          id: ts.id,
          dayOfWeek: ts.dayOfWeek,
          startTime: start,
          endTime: end,
          label: `${dayLabel} ${start} - ${end}`,
        };
      }),
    };
  }
}

export const hodRepository = new HodRepository();
