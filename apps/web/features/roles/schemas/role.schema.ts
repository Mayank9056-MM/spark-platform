import { z } from 'zod';

export const roleSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  displayName: z.string(),
});
export type RoleSummary = z.infer<typeof roleSummarySchema>;

export const roleItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  displayName: z.string(),
  isSystemDefined: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RoleItem = z.infer<typeof roleItemSchema>;

export const permissionItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  displayName: z.string(),
  description: z.string(),
  createdAt: z.string(),
});
export type PermissionItem = z.infer<typeof permissionItemSchema>;

export const permissionSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  displayName: z.string(),
});
export type PermissionSummary = z.infer<typeof permissionSummarySchema>;

export const roleWithPermissionsSchema = roleItemSchema.extend({
  permissions: z.array(permissionSummarySchema),
});
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>;

export const scopeContextSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('COLLEGE') }),
  z.object({ type: z.literal('DEPARTMENT'), departmentId: z.string() }),
]);
export type ScopeContext = z.infer<typeof scopeContextSchema>;

export const roleAssignmentItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  roleId: z.string(),
  scope: scopeContextSchema,
  validFrom: z.string(),
  validUntil: z.string().nullable(),
  grantedByUserId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: roleSummarySchema.optional(),
});
export type RoleAssignmentItem = z.infer<typeof roleAssignmentItemSchema>;

export const createRoleSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Role key is required')
    .max(100)
    .regex(
      /^[a-z0-9](?:[a-z0-9_:-]*[a-z0-9])?$/,
      'Must contain only lowercase letters, digits, hyphens, underscores, or colons',
    ),
  displayName: z.string().trim().min(1, 'Display name is required').max(150),
});
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(150),
});
export type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>;

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scopeType: z.enum(['COLLEGE', 'DEPARTMENT']),
  departmentId: z.string().uuid().optional(),
});
export type AssignRoleFormValues = z.infer<typeof assignRoleSchema>;
