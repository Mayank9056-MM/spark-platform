// apps/api/src/modules/hod/hod.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { hodService } from './hod.service.js';
import type {
  CreateHodFacultyAssignmentBody,
  CreateHodTimetableBody,
  HodTimetableQuery,
  ListHodStudentsQuery,
} from './hod.validation.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const profile = await hodService.getProfile(userId);
  ApiResponse.ok(res, profile);
};

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const overview = await hodService.getOverview(userId);
  ApiResponse.ok(res, overview);
};

export const getFaculty = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const faculty = await hodService.getFaculty(userId);
  ApiResponse.ok(res, faculty);
};

export const getCourseOfferings = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const offerings = await hodService.getCourseOfferings(userId);
  ApiResponse.ok(res, offerings);
};

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const query = (req.valid?.query ?? {}) as ListHodStudentsQuery;
  const result = await hodService.getStudents(userId, query);
  ApiResponse.ok(res, result);
};

export const getTimetable = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const query = (req.valid?.query ?? {}) as HodTimetableQuery;
  const timetable = await hodService.getTimetable(userId, query);
  ApiResponse.ok(res, timetable);
};

export const getTimetableOptions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const options = await hodService.getTimetableOptions(userId);
  ApiResponse.ok(res, options);
};

export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const attendance = await hodService.getAttendance(userId);
  ApiResponse.ok(res, attendance);
};

export const getPromotions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const promotions = await hodService.getPromotions(userId);
  ApiResponse.ok(res, promotions);
};

export const createFacultyAssignment = async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user!.id;
  const body = req.valid?.body as CreateHodFacultyAssignmentBody;
  const assignment = await hodService.createFacultyAssignment(actorUserId, body);
  ApiResponse.created(res, assignment, 'Faculty assignment created successfully');
};

export const createTimetableEntry = async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user!.id;
  const body = req.valid?.body as CreateHodTimetableBody;
  const timetable = await hodService.createTimetableEntry(actorUserId, body);
  ApiResponse.created(res, timetable, 'Timetable entry scheduled successfully');
};
