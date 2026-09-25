// apps/api/src/modules/student/student.repository.ts

import { prisma } from '../../lib/prisma.js';

export class StudentRepository {
  /**
   * Loads the student's active enrollment and all related academic identity data.
   */
  async findActiveEnrollmentByUserId(userId: string) {
    return prisma.studentEnrollment.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        program: {
          include: {
            department: true,
          },
        },
        curriculumVersion: true,
        admission: true,
        semesterEnrollments: {
          include: {
            semesterCatalog: true,
            academicYear: true,
          },
          orderBy: [{ attemptNumber: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  /**
   * Retrieves all subjects with components and elective groups for a semester catalog.
   */
  async findSubjectsBySemesterCatalogId(semesterCatalogId: string) {
    return prisma.subject.findMany({
      where: { semesterCatalogId },
      include: {
        components: true,
        electiveGroup: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Retrieves all semester catalogs belonging to a curriculum version.
   */
  async findSemesterCatalogsByCurriculumVersionId(curriculumVersionId: string) {
    return prisma.semesterCatalog.findMany({
      where: { curriculumVersionId },
      include: {
        subjects: {
          include: {
            components: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Retrieves attendance records for a specific semester enrollment.
   */
  async findAttendanceRecordsBySemesterEnrollmentId(semesterEnrollmentId: string) {
    return prisma.attendanceRecord.findMany({
      where: { semesterEnrollmentId },
      include: {
        attendanceSession: {
          include: {
            lecture: {
              include: {
                subjectOffering: {
                  include: {
                    subject: true,
                  },
                },
                subjectComponent: true,
              },
            },
          },
        },
      },
      orderBy: {
        attendanceSession: {
          lecture: {
            scheduledDate: 'desc',
          },
        },
      },
    });
  }

  /**
   * Retrieves timetable slots for a semester catalog in a given academic year.
   */
  async findTimetableEntries(semesterCatalogId: string, academicYearId: string) {
    return prisma.timetable.findMany({
      where: {
        semesterCatalogId,
        academicYearId,
        isCancelled: false,
      },
      include: {
        subjectOffering: {
          include: {
            subject: true,
          },
        },
        subjectComponent: true,
        room: true,
        facultyAssignment: {
          include: {
            faculty: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Retrieves progress history (all term enrollments and promotion decisions).
   */
  async findProgressHistory(studentEnrollmentId: string) {
    const [semesterEnrollments, promotionDecisions] = await Promise.all([
      prisma.semesterEnrollment.findMany({
        where: { studentEnrollmentId },
        include: {
          semesterCatalog: true,
          academicYear: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.promotionDecision.findMany({
        where: { studentEnrollmentId },
        include: {
          fromSemesterEnrollment: {
            include: {
              semesterCatalog: true,
            },
          },
          toSemesterEnrollment: {
            include: {
              semesterCatalog: true,
            },
          },
        },
        orderBy: { decidedAt: 'desc' },
      }),
    ]);

    return { semesterEnrollments, promotionDecisions };
  }
}

export const studentRepository = new StudentRepository();
