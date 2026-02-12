import "dotenv/config";

import { buildServer } from "./server.js";
import { loadConfig } from "./config.js";
import { startScheduledJobs } from "./jobs/scheduler.js";

const config = loadConfig(process.env);
const port = config.PORT ?? 3001;
const host = config.HOST ?? "0.0.0.0";

const server = await buildServer();

startScheduledJobs();

await server.listen({ port, host });
