"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const backup_routes_1 = __importDefault(require("./routes/backup-routes"));
const scheduler_1 = require("./services/scheduler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const scheduler = new scheduler_1.BackupScheduler();
exports.scheduler = scheduler;
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/backups', backup_routes_1.default);
app.listen(PORT, async () => {
    console.log(`🚀 BucketBackup Server running on port ${PORT}`);
    await scheduler.init();
    console.log('⏰ Backup Scheduler initialized');
});
//# sourceMappingURL=index.js.map