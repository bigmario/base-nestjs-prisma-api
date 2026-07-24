import { Prisma } from '@prisma/client';

/** Session fields needed to build the authenticated user profile. */
export const SESSION_PROFILE_SELECT: Prisma.sessionFindFirstArgs['select'] = {
  id: true,
  email: true,
  user: {
    select: {
      id: true,
      name: true,
      lastName: true,
      imgUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  type: { select: { id: true, name: true } },
  rol: { select: { id: true, name: true } },
};

/**
 * Flatten a session record (selected with {@link SESSION_PROFILE_SELECT})
 * into the public user profile shape.
 */
export function mapSessionToProfile(session: any) {
  return {
    ...session.user,
    email: session.email,
    type: session.type.name,
    rol: session.rol.name,
  };
}
