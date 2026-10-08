/**
 * Customer Requests feature — public entry point.
 *
 * Custom services an academy's owner/administrator asks the Atlas team
 * for (a logo, a custom domain, a theme, a website section, a feature),
 * and the Platform Owner console that handles them. Other features use
 * the contextual card and the dialog through this barrel only; the pages
 * are lazy-loaded by the router.
 */
export { RequestServiceCard } from './components/RequestServiceCard';
export type { RequestServiceCardProps } from './components/RequestServiceCard';
export { CreateCustomerRequestDialog } from './components/CreateCustomerRequestDialog';
export type { CreateCustomerRequestDialogProps } from './components/CreateCustomerRequestDialog';
export {
  useCanRequestCustomerServices,
  useCustomerRequestAccess,
} from './hooks';
export type { CustomerRequestAccess } from './hooks';
export {
  CUSTOMER_REQUEST_TYPES,
  CUSTOMER_REQUEST_STATUSES,
} from './constants/customer-request.constants';
export { customerRequestService } from './services/CustomerRequestService';
export { platformCustomerRequestService } from './services/PlatformCustomerRequestService';
export type * from './types/customer-request.types';
