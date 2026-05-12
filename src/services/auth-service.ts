import type {
  ForgotPasswordPayload,
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  StoredUser,
} from "@/lib/account-types";
import {
  createPasswordSalt,
  createEntityId,
  hashPassword,
  hashLegacyPassword,
  normalizeEmail,
} from "@/lib/account-utils";
import {
  authSessionsSchema,
  authUserSchema,
  forgotPasswordPayloadSchema,
  loginPayloadSchema,
  normalizeStoredUserRole,
  registerPayloadSchema,
  storedUsersSchema,
} from "@/lib/validation-schemas";
import { emitStorageChange, readStorage, removeStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { resolveUserRole, sanitizeIdentifier } from "@/lib/security-utils";
import { clientRateLimitService } from "@/services/client-rate-limit-service";

function stripPassword(user: StoredUser): AuthUser {
  const { passwordHash, passwordSalt, passwordVersion, ...safeUser } = normalizeStoredUserRole(user);
  void passwordHash;
  void passwordSalt;
  void passwordVersion;
  return safeUser;
}

function readUsers() {
  return readStorage<StoredUser[]>(storageKeys.users, [], storedUsersSchema).map(normalizeStoredUserRole);
}

function writeUsers(users: StoredUser[]) {
  writeStorage(storageKeys.users, users.map(normalizeStoredUserRole), storedUsersSchema);
  emitStorageChange("users");
}

function readSessions() {
  return readStorage<AuthSession[]>(storageKeys.sessions, [], authSessionsSchema);
}

function writeSessions(sessions: AuthSession[]) {
  writeStorage(storageKeys.sessions, sessions, authSessionsSchema);
  emitStorageChange("auth");
}

function setActiveAuth(session: AuthSession, user: AuthUser) {
  writeStorage(storageKeys.currentSessionId, session.id);
  writeStorage(storageKeys.currentUser, user, authUserSchema);
  emitStorageChange("auth");
}

function clearActiveAuth({ emit = true }: { emit?: boolean } = {}) {
  removeStorage(storageKeys.currentSessionId);
  removeStorage(storageKeys.currentUser);

  if (emit) {
    emitStorageChange("auth");
  }
}

function getSessionDurationMs(rememberMe: boolean) {
  return rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

function isSessionExpired(session: AuthSession, now = Date.now()) {
  return Number.isNaN(Date.parse(session.expiresAt)) || new Date(session.expiresAt).getTime() <= now;
}

function verifyPassword(password: string, user: StoredUser) {
  if (user.passwordSalt) {
    return user.passwordHash === hashPassword(password, user.passwordSalt);
  }

  return user.passwordHash === hashLegacyPassword(password);
}

function upgradePasswordIfNeeded(user: StoredUser, password: string) {
  if (user.passwordSalt && user.passwordVersion === 2) {
    return user;
  }

  const passwordSalt = createPasswordSalt();
  return {
    ...user,
    passwordSalt,
    passwordVersion: 2,
    passwordHash: hashPassword(password, passwordSalt),
    updatedAt: new Date().toISOString(),
  } satisfies StoredUser;
}

function getCurrentSessionId() {
  const sessionId = readStorage<unknown>(storageKeys.currentSessionId, null);
  return typeof sessionId === "string" ? sanitizeIdentifier(sessionId, "") || null : null;
}

function createSession(userId: string, rememberMe: boolean) {
  const now = Date.now();

  return {
    id: createEntityId("session"),
    userId,
    rememberMe,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + getSessionDurationMs(rememberMe)).toISOString(),
  } satisfies AuthSession;
}

export const authService = {
  getUsers() {
    return readUsers();
  },

  getCurrentUser() {
    return readStorage<AuthUser | null>(storageKeys.currentUser, null, authUserSchema.nullable());
  },

  getCurrentSession() {
    const sessionId = getCurrentSessionId();

    if (!sessionId) {
      return null;
    }

    const sessions = readSessions();
    const now = Date.now();
    const activeSessions = sessions.filter((session) => !isSessionExpired(session, now));

    if (activeSessions.length !== sessions.length) {
      writeSessions(activeSessions);
    }

    return activeSessions.find((session) => session.id === sessionId) ?? null;
  },

  getAuthSnapshot() {
    const currentSession = this.getCurrentSession();

    if (!currentSession) {
      clearActiveAuth({ emit: false });
      return { currentUser: null, currentSession: null };
    }

    const storedUser = this.findStoredUserById(currentSession.userId);

    if (!storedUser) {
      clearActiveAuth({ emit: false });
      return { currentUser: null, currentSession: null };
    }

    const safeUser = stripPassword(storedUser);
    const currentUser = this.getCurrentUser();

    if (!currentUser || currentUser.id !== safeUser.id || currentUser.role !== safeUser.role) {
      writeStorage(storageKeys.currentUser, safeUser, authUserSchema);
    }

    return { currentUser: safeUser, currentSession };
  },

  register(payload: RegisterPayload) {
    const input = registerPayloadSchema.parse(payload);
    const email = normalizeEmail(input.email);
    clientRateLimitService.assertAllowed("register", email);
    const users = readUsers();

    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new Error("Пользователь с таким email уже существует.");
    }

    const now = new Date().toISOString();
    const passwordSalt = createPasswordSalt();
    const newUser: StoredUser = {
      id: createEntityId("user"),
      role: resolveUserRole(email),
      name: input.name,
      email,
      phone: input.phone,
      birthday: null,
      favoriteDriver: null,
      favoriteTeam: null,
      acceptedLegalAt: now,
      createdAt: now,
      updatedAt: now,
      passwordSalt,
      passwordVersion: 2,
      passwordHash: hashPassword(input.password, passwordSalt),
    };

    const nextUsers = [newUser, ...users];
    writeUsers(nextUsers);

    const session = createSession(newUser.id, true);
    writeSessions([session, ...readSessions()]);

    const safeUser = stripPassword(newUser);
    setActiveAuth(session, safeUser);
    clientRateLimitService.clear("register", email);

    return { user: safeUser, session };
  },

  login(payload: LoginPayload) {
    const input = loginPayloadSchema.parse(payload);
    const email = normalizeEmail(input.email);
    clientRateLimitService.assertAllowed("login", email);
    const users = readUsers();
    const matchedUser = users.find(
      (user) => normalizeEmail(user.email) === email && verifyPassword(input.password, user),
    );

    if (!matchedUser) {
      throw new Error("Неверный email или пароль.");
    }

    const normalizedUser = upgradePasswordIfNeeded(matchedUser, input.password);
    if (normalizedUser !== matchedUser) {
      this.replaceStoredUser(normalizedUser);
    }

    const existingSessions = readSessions().filter((session) => session.userId !== matchedUser.id);
    const session = createSession(matchedUser.id, input.rememberMe);
    writeSessions([session, ...existingSessions]);

    const safeUser = stripPassword(normalizedUser);
    setActiveAuth(session, safeUser);
    clientRateLimitService.clear("login", email);

    return { user: safeUser, session };
  },

  logout() {
    const currentSession = this.getCurrentSession();

    if (currentSession) {
      writeSessions(readSessions().filter((session) => session.id !== currentSession.id));
    }

    clearActiveAuth();
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    const input = forgotPasswordPayloadSchema.parse(payload);
    clientRateLimitService.assertAllowed("forgot-password", input.email);
    return true;
  },

  findUserById(userId: string) {
    const user = readUsers().find((entry) => entry.id === userId);
    return user ? stripPassword(user) : null;
  },

  findStoredUserById(userId: string) {
    return readUsers().find((entry) => entry.id === userId) ?? null;
  },

  replaceStoredUser(nextUser: StoredUser) {
    const normalizedUser = normalizeStoredUserRole(nextUser);
    const users = readUsers().map((user) => (user.id === normalizedUser.id ? normalizedUser : user));
    writeUsers(users);
    const currentUser = this.getAuthSnapshot().currentUser;

    if (currentUser?.id === normalizedUser.id) {
      writeStorage(storageKeys.currentUser, stripPassword(normalizedUser), authUserSchema);
      emitStorageChange("auth");
    }

    return stripPassword(normalizedUser);
  },

  assertAuthorizedUserId(userId: string) {
    const currentSession = this.getCurrentSession();

    if (!currentSession) {
      throw new Error("Сессия истекла, войдите снова.");
    }

    if (currentSession.userId !== userId) {
      throw new Error("Недостаточно прав.");
    }
  },
};
