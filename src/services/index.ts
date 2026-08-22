/**
 * Atlas Service Layer — public entry point.
 *
 * Every business operation in Atlas goes through a service. Features import
 * services; they never import the API or HTTP layers directly.
 */
export { BaseService } from './base.service';
export * from './api';
export * from './query';
export * from './identity';