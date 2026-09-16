/**
 * User — minimal authenticated-user identity.
 */

export type UserId = string;

export interface User {
  id: UserId;
  displayName: string;
  email?: string;
  images: { url: string }[];
}
