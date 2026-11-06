/**
 * Academy protection settings schemas (P64 Phase 2).
 *
 * The bounds mirror the backend DTOs (`learning/dto/academy-protection.dto.ts`):
 * watermark text ≤ 80 characters; devices 1–20 and concurrent sessions
 * 1–10, further capped by the live platform maximum the GET returns (the
 * backend refuses anything above it with `devicePolicyAboveMaximum`).
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

export const WATERMARK_TEXT_MAX_LENGTH = 80;
export const DEVICE_POLICY_DTO_MAX_DEVICES = 20;
export const DEVICE_POLICY_DTO_MAX_SESSIONS = 10;

export const contentProtectionSchema = z.object({
  watermark: z.boolean(),
  watermarkText: z
    .string()
    .max(
      WATERMARK_TEXT_MAX_LENGTH,
      'academy:protection.content.watermarkText.tooLong'
    ),
});

export type ContentProtectionFormData = z.infer<typeof contentProtectionSchema>;

/** Built per response: the ceiling is the platform's, which can change. */
export function buildDevicePolicySchema(
  platformMaxDevices: number,
  platformMaxConcurrentSessions: number
) {
  const maxDevices = Math.min(
    platformMaxDevices,
    DEVICE_POLICY_DTO_MAX_DEVICES
  );
  const maxSessions = Math.min(
    platformMaxConcurrentSessions,
    DEVICE_POLICY_DTO_MAX_SESSIONS
  );
  // B4 (UX audit) V20 — the message states the real range ("from 1 to 5"),
  // not "the maximum shown".
  const range = (max: number) =>
    validationMessage('academy:protection.devices.outOfRangeMax', { max });
  return z.object({
    maxDevices: z.coerce
      .number({ invalid_type_error: range(maxDevices) })
      .int(range(maxDevices))
      .min(1, range(maxDevices))
      .max(maxDevices, range(maxDevices)),
    maxConcurrentSessions: z.coerce
      .number({ invalid_type_error: range(maxSessions) })
      .int(range(maxSessions))
      .min(1, range(maxSessions))
      .max(maxSessions, range(maxSessions)),
  });
}

export interface DevicePolicyFormData {
  readonly maxDevices: number;
  readonly maxConcurrentSessions: number;
}
