export const MIN_PASSWORD_LENGTH = 8;

export function isGoogleAuthEnabled() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_BETA_ACK === "true"
  );
}
