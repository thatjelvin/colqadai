import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

export function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    const options: Partial<CookieOptions> = {};
    if (cookie.path) options.path = cookie.path;
    if (cookie.domain) options.domain = cookie.domain;
    if (cookie.sameSite) options.sameSite = cookie.sameSite;
    if (cookie.secure !== undefined) options.secure = cookie.secure;
    if (cookie.httpOnly !== undefined) options.httpOnly = cookie.httpOnly;
    if (cookie.expires) options.expires = cookie.expires;

    to.cookies.set(cookie.name, cookie.value, options);
  });
}
