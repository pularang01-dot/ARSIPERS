import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = ["/login", "/offline", "/lupa-password", "/atur-password", "/auth", "/verifikasi"];

/** Cookie sesi yang token penyegarnya tidak dikenal lagi (akun dihapus, sesi dicabut, atau ganti proyek). */
function isStaleSession(e: unknown): boolean {
  const x = e as { code?: string; message?: string } | null;
  if (!x) return false;
  return x.code === "refresh_token_not_found" || x.code === "refresh_token_already_used" || /refresh token/i.test(x.message ?? "");
}

export async function updateSession(request: NextRequest) {
  // Bila ada cookie sesi rusak, hapus dari permintaan ini dan dari browser.
  let staleNames: string[] = [];
  const clearStale = (res: NextResponse) => {
    staleNames.forEach((n) => res.cookies.set(n, "", { maxAge: 0, path: "/" }));
    return res;
  };

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list: CookieToSet[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let user: { id: string } | null = null;
  let authError: unknown = null;
  try {
    const r = await supabase.auth.getUser();
    user = r.data.user;
    authError = r.error;
  } catch (e) {
    authError = e;
  }

  if (authError && isStaleSession(authError)) {
    staleNames = request.cookies.getAll().map((c) => c.name).filter((n) => n.startsWith("sb-") && n.includes("auth-token"));
    staleNames.forEach((n) => request.cookies.delete(n));
    response = NextResponse.next({ request });
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/") url.searchParams.set("next", path);
    return clearStale(NextResponse.redirect(url));
  }
  // Jangan redirect bila ada ?error (mis. sesi valid tetapi profil tidak ada) agar tidak terjadi loop
  if (user && path === "/login" && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return clearStale(response);
}