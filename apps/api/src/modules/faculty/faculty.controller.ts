// apps/api/src/modules/faculty/faculty.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { facultyService } from './faculty.service.js';
import type {
  FacultyLectureIdParams,
  ListFacultyLecturesQuery,
  SubmitAttendanceBody,
} from './faculty.validation.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await facultyService.getProfile(req.user!.id);
  ApiResponse.ok(res, profile);
};

export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  const assignments = await facultyService.getAssignments(req.user!.id);
  ApiResponse.ok(res, assignments);
};

export const getTimetable = async (req: Request, res: Response): Promise<void> => {
  const timetable = await facultyService.getTimetable(req.user!.id);
  ApiResponse.ok(res, timetable);
};

export const getLectures = async (req: Request, res: Response): Promise<void> => {
  const query = (req.valid?.query ?? {}) as ListFacultyLecturesQuery;
  const lectures = await facultyService.getLectures(req.user!.id, query);
  ApiResponse.ok(res, lectures);
};

export const getLectureRoster = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as FacultyLectureIdParams;
  const roster = await facultyService.getLectureRoster(req.user!.id, params.lectureId);
  ApiResponse.ok(res, roster);
};

export const submitAttendance = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as FacultyLectureIdParams;
  const body = req.valid?.body as SubmitAttendanceBody;
  const result = await facultyService.submitAttendance(req.user!.id, params.lectureId, body);
  ApiResponse.ok(res, result);
};

export const getAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  const summary = await facultyService.getAttendanceSummary(req.user!.id);
  ApiResponse.ok(res, summary);
};
