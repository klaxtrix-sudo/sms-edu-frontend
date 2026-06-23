"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axios from "axios";
import { getBackendUrl } from "@/lib/utils";

const CONSOLE_COOKIE_NAME = "klaxtrix_console_token";
const CONSOLE_COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

/**
 * Authenticates against the master console backend and sets the JWT
 * as an httpOnly cookie (XSS-proof). Returns the user data for client display.
 */
export async function consoleLogin(username: string, password: string) {
  try {
    const backendUrl = getBackendUrl();
    const response = await axios.post(`${backendUrl}/console/login`, {
      username,
      password,
    });

    if (!response.data.success) {
      return { error: response.data.message || "Access Denied" };
    }

    const { token, id, username: uname, role } = response.data.data;

    // Set httpOnly cookie — not accessible via JavaScript (XSS-proof)
    const cookieStore = cookies();
    cookieStore.set(CONSOLE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CONSOLE_COOKIE_MAX_AGE,
      path: "/",
    });

    return { success: true, user: { id, username: uname, role } };
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || "Connection Failure";
    return { error: message };
  }
}

/**
 * Clears the console session cookie.
 */
export async function consoleLogout() {
  const cookieStore = cookies();
  cookieStore.delete(CONSOLE_COOKIE_NAME);
  redirect("/console");
}

/**
 * Reads the console token from the httpOnly cookie (server-side only).
 * Used by server components to verify the session and pass the token
 * to client components via props.
 */
export async function getConsoleTokenFromCookie(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(CONSOLE_COOKIE_NAME)?.value || null;
}

/**
 * Verifies the console session by calling the backend /console/me endpoint.
 * Returns the user data if valid, null otherwise.
 */
export async function verifyConsoleSessionServer(): Promise<{ id: string; username: string; role: string } | null> {
  const token = await getConsoleTokenFromCookie();
  if (!token) return null;

  try {
    const backendUrl = getBackendUrl();
    const response = await axios.get(`${backendUrl}/console/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch {
    return null;
  }
}
