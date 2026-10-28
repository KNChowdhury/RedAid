/** The one public contact address. Change it here, not in components. */
export const CONTACT_EMAIL = 'redvora.bd@gmail.com';

/**
 * mailto link for reporting a donor profile. Only the profile id goes in the
 * mail -- no name, phone, or other personal data -- so the report itself
 * doesn't spread the reported person's details.
 */
export const profileReportMailto = (donorId: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Profile report: ${donorId}`)}&body=${encodeURIComponent(
    'What happened? (e.g. asked for money, fake profile, harassment, wrong information)\n\n'
  )}`;
