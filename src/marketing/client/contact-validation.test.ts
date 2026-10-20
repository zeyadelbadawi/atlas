import { describe, expect, it } from 'vitest';
import {
  MARKETING_CONTACT_LIMITS,
  MARKETING_CONTACT_TOPICS,
} from '@/features/home/utils/marketing-contact';
import { CONTACT_LIMITS, CONTACT_TOPICS, validateContact } from './contact-validation';

describe('static contact form validation', () => {
  it('uses the same limits and topics as the app form', () => {
    expect(CONTACT_LIMITS).toEqual(MARKETING_CONTACT_LIMITS);
    expect([...CONTACT_TOPICS]).toEqual([...MARKETING_CONTACT_TOPICS]);
  });

  it('accepts a complete enquiry', () => {
    expect(
      validateContact({
        name: 'Mona Adel',
        email: 'mona@example.com',
        topic: 'sales',
        message: 'I teach physics and want my own academy.',
      }),
    ).toEqual({});
  });

  it('reports one code per invalid field', () => {
    expect(
      validateContact({
        name: 'M',
        email: 'not-an-email',
        organizationName: 'x'.repeat(201),
        topic: 'founding',
        message: 'short',
      }),
    ).toEqual({
      name: 'NameTooShort',
      email: 'EmailInvalid',
      organizationName: 'OrganizationTooLong',
      topic: 'TopicInvalid',
      message: 'MessageTooShort',
    });
  });

  it('treats whitespace-only fields as missing', () => {
    expect(validateContact({ name: '  ', email: ' ', topic: 'other', message: '   ' })).toEqual({
      name: 'NameRequired',
      email: 'EmailRequired',
      message: 'MessageRequired',
    });
  });
});
