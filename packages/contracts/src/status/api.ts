import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';

import { DeploymentMetadata } from '../deployment/contracts.js';
import { HealthStatus } from './contracts.js';

export class StatusApi extends HttpApiGroup.make('status', { topLevel: true }).add(
  HttpApiEndpoint.get('health', '/api/health', { success: HealthStatus }),
  HttpApiEndpoint.get('version', '/api/version', { success: DeploymentMetadata }),
) {}
