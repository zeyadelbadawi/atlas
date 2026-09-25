/**
 * Academy protection settings schemas (P64 Phase 2).
 *
 * The bounds mirror the backend DTOs (`learning/dto/academy-protection.dto.ts`):
 * watermark text ≤ 80 characters; devices 1–20 and concurrent sessions
 * 1–10, further capped by the live platform maximum the GET returns (the
 * backend refuses anything above it with `devicePolicyAboveMaximum`).
 */
import { z } from 'zod';

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
  return z.object({
    maxDevices: z.coerce
      .number({ invalid_type_error: 'academy:protection.devices.outOfRange' })
      .int('academy:protection.devices.outOfRange')
      .min(1, 'academy:protection.devices.outOfRange')
      .max(maxDevices, 'academy:protection.devices.outOfRange'),
    maxConcurrentSessions: z.coerce
      .number({ invalid_type_error: 'academy:protection.devices.outOfRange' })
      .int('academy:protection.devices.outOfRange')
      .min(1, 'academy:protection.devices.outOfRange')
      .max(maxSessions, 'academy:protection.devices.outOfRange'),
  });
}

export interface DevicePolicyFormData {
  readonly maxDevices: number;
  readonly maxConcurrentSessions: number;
}
