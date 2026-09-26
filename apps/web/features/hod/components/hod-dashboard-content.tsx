'use client';

import {
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  Percent,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import {
  useHodAttendance,
  useHodFaculty,
  useHodOverview,
  useHodProfile,
  useHodPromotions,
  useHodStudents,
  useHodTimetable,
} from '../hooks/use-hod';

import { CreateFacultyAssignmentDialog } from './create-faculty-assignment-dialog';
import { HodAttendanceTab } from './hod-attendance-tab';
import { HodFacultyTab } from './hod-faculty-tab';
import { HodHeader } from './hod-header';
import { HodMetricsCards } from './hod-metrics-cards';
import { HodOverviewTab } from './hod-overview-tab';
import { HodPromotionsTab } from './hod-promotions-tab';
import { HodStudentsTab } from './hod-students-tab';
import { HodTimetableTab } from './hod-timetable-tab';
import { HodUnassociatedState } from './hod-unassociated-state';

import { Button } from '@/components/ui/button';

interface HodDashboardContentProps {
  initialTab?: string;
}

export function HodDashboardContent({ initialTab = 'overview' }: HodDashboardContentProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFacultyUserId, setSelectedFacultyUserId] = useState<string | null>(null);

  // Timetable filter
  const [selectedDay, setSelectedDay] = useState('ALL');

  // Students filter & pagination
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsSearch, setStudentsSearch] = useState('');

  // 1. Fetch HOD profile to establish department scope authority
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
    isRefetching: isProfileRefetching,
  } = useHodProfile();

  const isAssociated = Boolean(profile?.isAssociated && profile?.department);

  // 2. Fetch scoped queries only if associated
  const {
    data: overview,
    refetch: refetchOverview,
    isRefetching: isOverviewRefetching,
  } = useHodOverview(isAssociated);

  const {
    data: faculty = [],
    isLoading: isFacultyLoading,
    refetch: refetchFaculty,
  } = useHodFaculty(isAssociated);

  const {
    data: studentsData,
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
  } = useHodStudents(
    {
      page: studentsPage,
      limit: 20,
      search: studentsSearch || undefined,
    },
    isAssociated,
  );

  const {
    data: timetable = [],
    isLoading: isTimetableLoading,
    refetch: refetchTimetable,
  } = useHodTimetable(
    {
      dayOfWeek: selectedDay === 'ALL' ? undefined : selectedDay,
    },
    isAssociated,
  );

  const {
    data: attendanceData,
    isLoading: isAttendanceLoading,
    refetch: refetchAttendance,
  } = useHodAttendance(isAssociated);

  const {
    data: promotions = [],
    isLoading: isPromotionsLoading,
    refetch: refetchPromotions,
  } = useHodPromotions(isAssociated);

  const handleRefreshAll = () => {
    void refetchProfile();
    if (isAssociated) {
      void refetchOverview();
      void refetchFaculty();
      void refetchStudents();
      void refetchTimetable();
      void refetchAttendance();
      void refetchPromotions();
    }
  };

  // Loading state
  if (isProfileLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">
            Verifying HOD Department Scope...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError || !profile) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h3 className="font-heading text-destructive text-lg font-bold">
          Failed to load HOD profile
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          {profileError instanceof Error ? profileError.message : 'An unexpected error occurred.'}
        </p>
        <Button
          onClick={() => void refetchProfile()}
          variant="outline"
          size="sm"
          className="mt-4 rounded-none font-mono text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Safe Restricted State: User is HOD but has no department scope assigned
  if (!isAssociated) {
    return (
      <div className="space-y-6">
        <HodUnassociatedState
          userName={`${profile.user.firstName} ${profile.user.lastName}`}
        />
      </div>
    );
  }

  const isRefreshing = isProfileRefetching || isOverviewRefetching;

  return (
    <div className="space-y-6">
      {/* 1. HOD Department Header */}
      <HodHeader
        profile={profile}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
      />

      {/* 2. Department Metrics Cards (6-card row) */}
      {overview && <HodMetricsCards overview={overview} />}

      {/* 3. Navigation Tabs */}
      <div className="border-border flex flex-wrap gap-1 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="size-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'faculty'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-3.5" />
          <span>Faculty & Workload</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'students'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="size-3.5" />
          <span>Student Cohort</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'timetable'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="size-3.5" />
          <span>Timetable Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'attendance'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Percent className="size-3.5" />
          <span>Attendance Audits</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-medium transition-colors ${
            activeTab === 'promotions'
              ? 'border-primary text-foreground font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="size-3.5" />
          <span>Term Promotions</span>
        </button>
      </div>

      {/* 4. Tab Panels */}
      {activeTab === 'overview' && overview && (
        <HodOverviewTab overview={overview} onNavigateTab={setActiveTab} />
      )}

      {activeTab === 'faculty' && (
        <HodFacultyTab
          faculty={faculty}
          isLoading={isFacultyLoading}
          onOpenAssignDialog={(facultyUserId) => {
            setSelectedFacultyUserId(facultyUserId ?? null);
            setIsAssignDialogOpen(true);
          }}
        />
      )}

      {activeTab === 'students' && (
        <HodStudentsTab
          studentsData={studentsData}
          isLoading={isStudentsLoading}
          page={studentsPage}
          onPageChange={setStudentsPage}
          search={studentsSearch}
          onSearchChange={(s) => {
            setStudentsSearch(s);
            setStudentsPage(1);
          }}
        />
      )}

      {activeTab === 'timetable' && (
        <HodTimetableTab
          timetable={timetable}
          isLoading={isTimetableLoading}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}

      {activeTab === 'attendance' && (
        <HodAttendanceTab
          attendanceData={attendanceData}
          isLoading={isAttendanceLoading}
        />
      )}

      {activeTab === 'promotions' && (
        <HodPromotionsTab
          promotions={promotions}
          isLoading={isPromotionsLoading}
        />
      )}

      {/* Modal Dialog for Faculty Assignment */}
      <CreateFacultyAssignmentDialog
        isOpen={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false);
          setSelectedFacultyUserId(null);
        }}
        faculty={faculty}
        defaultFacultyUserId={selectedFacultyUserId}
      />
    </div>
  );
}
