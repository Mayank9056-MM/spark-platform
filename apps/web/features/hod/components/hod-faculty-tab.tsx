import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { HodFacultyMember } from '../schemas/hod.schema';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HodFacultyTabProps {
  faculty: HodFacultyMember[];
  isLoading: boolean;
  onOpenAssignDialog?: (facultyUserId?: string) => void;
}

export function HodFacultyTab({ faculty, isLoading, onOpenAssignDialog }: HodFacultyTabProps) {
  const [search, setSearch] = useState('');

  const filteredFaculty = faculty.filter((f) => {
    const fullName = `${f.firstName} ${f.lastName}`.toLowerCase();
    const query = search.toLowerCase();
    return (
      fullName.includes(query) ||
      f.email.toLowerCase().includes(query) ||
      f.assignedSubjects.some((s) => s.subjectCode.toLowerCase().includes(query))
    );
  });

  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="font-heading text-lg">Department Faculty & Workload</CardTitle>
          <CardDescription>
            Teaching staff, subject assignments, and instructional workload allocations
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAssignDialog && (
            <Button
              onClick={() => onOpenAssignDialog()}
              size="sm"
              className="gap-1.5 rounded-none font-mono text-xs"
            >
              <Plus className="size-3.5" />
              Assign Subject
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search faculty by name, email, or subject code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-background placeholder:text-muted-foreground focus:ring-primary flex h-9 w-full max-w-sm rounded-none border px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1"
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center font-mono text-sm">
            Loading department faculty members...
          </div>
        ) : filteredFaculty.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {search ? 'No faculty members match your search.' : 'No faculty members currently assigned to this department.'}
          </div>
        ) : (
          <div className="divide-border divide-y">
            {filteredFaculty.map((member) => {
              const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();

              return (
                <div
                  key={member.userId}
                  className="flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  {/* Faculty Identity */}
                  <div className="flex items-start gap-3">
                    <Avatar className="border-border size-10 rounded-none border">
                      {member.avatarUrl && (
                        <AvatarImage
                          src={member.avatarUrl}
                          alt={`${member.firstName} ${member.lastName}`}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary rounded-none font-mono text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-bold text-foreground">
                          Prof. {member.firstName} {member.lastName}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {member.designation}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {member.email}
                      </div>
                    </div>
                  </div>

                  {/* Workload and Assigned Subjects */}
                  <div className="flex flex-1 flex-col gap-2 lg:max-w-xl lg:items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Assigned Courses:</span>
                      <Badge variant="secondary" className="font-mono text-xs font-bold">
                        {member.assignmentCount} Courses
                      </Badge>
                      {onOpenAssignDialog && (
                        <Button
                          onClick={() => onOpenAssignDialog(member.userId)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-none ml-1"
                        >
                          <Plus className="size-3" />
                          Assign Course
                        </Button>
                      )}
                    </div>

                    {member.assignedSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 lg:justify-end">
                        {member.assignedSubjects.map((sub, idx) => (
                          <div
                            key={idx}
                            className="border-border bg-muted/30 flex items-center gap-1.5 border px-2 py-1 text-xs"
                          >
                            <span className="font-mono font-semibold text-foreground">
                              {sub.subjectCode}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              ({sub.componentType})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">
                        No active course assignments this semester
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
