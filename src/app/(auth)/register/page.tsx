"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuthSession } from "@/components/SessionProvider";
import {
  GOOGLE_PROVIDER_DISABLED_MESSAGE,
  getAuthErrorMessage,
  isGoogleOAuthEnabled,
  signInWithGoogle,
  signUp,
} from "@/lib/supabase/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuthSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isGoogleEnabled = isGoogleOAuthEnabled();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [status, router]);

  useEffect(() => {
    const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
    if (!oauthError) return;

    const oauthErrorMap: Record<string, string> = {
      access_denied: "Access denied during Google sign-in.",
      server_error: "Google sign-in callback failed. Please try again.",
    };

    setServerError(oauthErrorMap[oauthError] ?? "Google sign-in failed. Please try again.");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    // Validate with Zod
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signUp(email.trim(), password, name.trim());

      if (error) {
        setServerError(getAuthErrorMessage(error, "Failed to create account"));
      } else {
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
        }
      }
    } catch {
      setServerError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleEnabled) {
      setServerError(GOOGLE_PROVIDER_DISABLED_MESSAGE);
      return;
    }

    setServerError("");
    setIsLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setServerError(getAuthErrorMessage(error, "Google sign-in could not be started. Please try again."));
        setIsLoading(false);
      }
    } catch {
      setServerError("Google sign-in could not be started. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-xl">C</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight">Colqad</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Start your math learning journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || !isGoogleEnabled}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
            {!isGoogleEnabled && (
              <p className="text-xs text-muted-foreground text-center">
                {GOOGLE_PROVIDER_DISABLED_MESSAGE}
              </p>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {serverError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
