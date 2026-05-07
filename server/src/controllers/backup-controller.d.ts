import { Request, Response } from 'express';
export declare const getAllJobs: (req: Request, res: Response) => Promise<void>;
export declare const createJob: (req: Request, res: Response) => Promise<void>;
export declare const getJobById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const triggerBackup: (req: Request, res: Response) => Promise<void>;
export declare const getJobLogs: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=backup-controller.d.ts.map