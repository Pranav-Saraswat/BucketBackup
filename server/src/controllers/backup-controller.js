"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobLogs = exports.triggerBackup = exports.getJobById = exports.createJob = exports.getAllJobs = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const prisma = new client_1.PrismaClient();
const getAllJobs = async (req, res) => {
    try {
        const jobs = await prisma.backupJob.findMany({
            include: { storageConfig: true }
        });
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch backup jobs' });
    }
};
exports.getAllJobs = getAllJobs;
const createJob = async (req, res) => {
    try {
        const { name, sourcePath, cronExpression, storageConfigId } = req.body;
        const job = await prisma.backupJob.create({
            data: { name, sourcePath, cronExpression, storageConfigId }
        });
        res.status(201).json(job);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create backup job' });
    }
};
exports.createJob = createJob;
const getJobById = async (req, res) => {
    const { id } = req.params;
    try {
        const job = await prisma.backupJob.findUnique({
            where: { id },
            include: { storageConfig: true }
        });
        if (!job)
            return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch job' });
    }
};
exports.getJobById = getJobById;
const triggerBackup = async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.scheduler.triggerManualBackup(id);
        res.json({ message: `Backup job ${id} triggered successfully` });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to trigger backup' });
    }
};
exports.triggerBackup = triggerBackup;
const getJobLogs = async (req, res) => {
    const { id } = req.params;
    try {
        const logs = await prisma.backupLog.findMany({
            where: { jobId: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};
exports.getJobLogs = getJobLogs;
//# sourceMappingURL=backup-controller.js.map