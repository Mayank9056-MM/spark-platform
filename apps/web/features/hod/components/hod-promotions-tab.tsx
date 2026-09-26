import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

import type { HodPromotionBatch } from '../schemas/hod.schema';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HodPromotionsTabProps {
  promotions: HodPromotionBatch[];
  isLoading: boolean;
}

export function HodPromotionsTab({ promotions, isLoading }: HodPromotionsTabProps) {
  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg">Department Term Promotions</CardTitle>
        <CardDescription>
          Semester progression batches, student advancement decisions, and detention records
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center font-mono text-sm">
            Loading department promotion records...
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No promotion batches have been processed for this department yet.
          </div>
        ) : (
          <div className="divide-border divide-y">
            {promotions.map((batch) => {
              const formattedDate = new Date(batch.promotedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary font-mono text-xs font-bold px-2 py-0.5">
                        {batch.program.code}
                      </span>
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {batch.program.name}
                      </span>
                    </div>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                      <div className="flex items-center gap-1 font-mono">
                        <span>Sem {batch.fromSemester}</span>
                        <ArrowRight className="size-3 text-primary" />
                        <span className="font-bold text-foreground">Sem {batch.toSemester}</span>
                      </div>
                      <span>•</span>
                      <span className="font-mono">AY {batch.academicYear.label}</span>
                      <span>•</span>
                      <span>Processed: {formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="border-border flex items-center gap-3 border px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-1 text-emerald-600 font-mono font-medium">
                        <CheckCircle2 className="size-3.5" />
                        <span>{batch.promotedCount} Promoted</span>
                      </div>
                      <div className="flex items-center gap-1 text-destructive font-mono font-medium">
                        <XCircle className="size-3.5" />
                        <span>{batch.detainedCount} Detained</span>
                      </div>
                    </div>

                    <Badge variant="outline" className="font-mono text-xs">
                      Total: {batch.totalStudents}
                    </Badge>
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
