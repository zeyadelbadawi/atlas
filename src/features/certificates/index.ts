/**
 * Certificates feature — public entry point (P64 Phase 3, D6/D7).
 *
 * Pages are lazy-loaded by the routers from their own paths; what other
 * features may reach for is the issue dialog (the roster drawer) and the
 * verify page (both hosts mount it).
 */
export { default as CertificateVerifyPage } from './pages/CertificateVerifyPage';
export type {
  CertificateVerifyFrame,
  CertificateVerifyPageProps,
} from './pages/CertificateVerifyPage';
export { CertificateVerifySheet } from './components/CertificateVerifySheet';
export { IssueCertificateDialog } from './components/IssueCertificateDialog';
export type {
  IssueCertificateDialogProps,
  IssueCertificateTarget,
} from './components/IssueCertificateDialog';
export {
  buildVerifyUrl,
  certificateRenderLabelKey,
  certificateRenderTone,
  certificateStatusLabelKey,
  certificateStatusTone,
} from './utils/certificate.utils';
