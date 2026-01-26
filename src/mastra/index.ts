import { ArizeExporter } from '@mastra/arize';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import {
  type CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';

import { copywriterAgent, editorAgent, weatherAgent } from './agents';
import { agentStreamRoute } from './routes/agent-stream';
import { feedbackRoute } from './routes/feedback';
import { workflowTraceRoute } from './routes/workflow-trace';
import { answerRelevancyScorer, weatherAccuracyScorer } from './scorers';
import { contentWorkflow, weatherWorkflow } from './workflows';

// Build exporters list - always include DefaultExporter for Mastra Studio
const exporters: Array<DefaultExporter | CloudExporter | ArizeExporter> = [
  new DefaultExporter(), // Persists traces to storage for Mastra Studio
  // new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
];

// Add Phoenix/Arize exporter when enabled via environment variable
if (process.env.PHOENIX_ENABLED === 'true') {
  exporters.push(new ArizeExporter());
}

export const mastra = new Mastra({
  agents: { weatherAgent, copywriterAgent, editorAgent },
  workflows: { contentWorkflow, weatherWorkflow },
  scorers: { weatherAccuracyScorer, answerRelevancyScorer },
  server: {
    apiRoutes: [feedbackRoute, agentStreamRoute, workflowTraceRoute],
  },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: process.env.MASTRA_DB_URL || ':memory:',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: process.env.PHOENIX_PROJECT_NAME || 'mastragen-test-proj',
        exporters,
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
