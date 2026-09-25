// apps/api/src/modules/student/student.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { studentService } from './student.service.js';
import type { UpdateStudentProfileBody } from './student.validation.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await studentService.getProfile(req.user!.id);
  ApiResponse.ok(res, profile);
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as UpdateStudentProfileBody;
  const updated = await studentService.updateProfile(req.user!.id, body);
  ApiResponse.ok(res, updated);
};

export const getAcademics = async (req: Request, res: Response): Promise<void> => {
  const academics = await studentService.getAcademics(req.user!.id);
  ApiResponse.ok(res, academics);
};

export const getSubjects = async (req: Request, res: Response): Promise<void> => {
  const subjects = await studentService.getSubjects(req.user!.id);
  ApiResponse.ok(res, subjects);
};

export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  const attendance = await studentService.getAttendance(req.user!.id);
  ApiResponse.ok(res, attendance);
};

export const getTimetable = async (req: Request, res: Response): Promise<void> => {
  const timetable = await studentService.getTimetable(req.user!.id);
  ApiResponse.ok(res, timetable);
};

export const getProgress = async (req: Request, res: Response): Promise<void> => {
  const progress = await studentService.getProgress(req.user!.id);
  ApiResponse.ok(res, progress);
};
