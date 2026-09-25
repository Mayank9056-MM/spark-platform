'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, IdCard, Save, User } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { useUpdateStudentProfile } from '../hooks/use-student';
import {
  type StudentProfile,
  type UpdateStudentProfileInput,
  updateStudentProfileSchema,
} from '../schemas/student.schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface StudentProfileFormProps {
  profile: StudentProfile;
}

export function StudentProfileForm({ profile }: StudentProfileFormProps) {
  const updateMutation = useUpdateStudentProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateStudentProfileInput>({
    resolver: zodResolver(updateStudentProfileSchema),
    defaultValues: {
      phone: profile.user.phone ?? '',
    },
  });

  const onSubmit = (values: UpdateStudentProfileInput) => {
    updateMutation.mutate(values);
  };

  const fullName = [profile.user.firstName, profile.user.middleName, profile.user.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Institutional Academic Identity (Read-Only) */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <IdCard className="text-primary size-4" />
            Institutional Academic Identity
          </CardTitle>
          <CardDescription>
            Official institutional enrollment records managed by the Registrar
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Full Legal Name</span>
            <p className="text-foreground font-semibold">{fullName}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Roll / PRN Number</span>
            <p className="text-foreground font-mono font-semibold">{profile.rollNumber}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Admission Number</span>
            <p className="text-foreground font-mono text-sm font-semibold">
              {profile.admission.admissionNumber}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Enrolled Program</span>
            <p className="text-foreground text-sm font-semibold">
              {profile.program.name} ({profile.program.code})
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Academic Department</span>
            <p className="text-foreground text-sm font-semibold">
              {profile.department.name} ({profile.department.code})
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Curriculum Scheme</span>
            <p className="text-foreground text-sm font-semibold">
              {profile.curriculumVersion.label}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Admission Quota</span>
            <p className="text-foreground font-mono text-xs font-semibold uppercase">
              {profile.admission.quota}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Admission Type</span>
            <p className="text-foreground font-mono text-xs font-semibold uppercase">
              {profile.admission.admissionType}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Admission Date</span>
            <p className="text-foreground text-xs font-semibold">
              {new Date(profile.admissionDate).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable Contact Information */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="text-primary size-4" />
            Contact & Communication Details
          </CardTitle>
          <CardDescription>
            Update your registered phone number for institutional SMS and communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-lg space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Official Email Address</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={profile.user.email}
                    disabled
                    className="bg-muted/50 cursor-not-allowed font-mono text-sm"
                  />
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Institutional email addresses are managed by IT Administration and cannot be
                  changed.
                </p>
              </Field>

              <Field>
                <FieldLabel>Contact Phone Number</FieldLabel>
                <Input
                  type="tel"
                  placeholder="+919876543210"
                  {...register('phone')}
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone ? (
                  <FieldError>{errors.phone.message}</FieldError>
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    Format: +919876543210 (include country code)
                  </p>
                )}
              </Field>
            </FieldGroup>

            <Button type="submit" disabled={!isDirty || updateMutation.isPending} className="gap-2">
              <Save className="size-4" />
              {updateMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
