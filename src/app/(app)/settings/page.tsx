import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const dbUser = await getOrCreateUserForClerkId(clerkUserId);

  const planLabel = dbUser.plan === "MAX" ? "MAX" : dbUser.plan === "PRO" ? "PRO" : "FREE";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your account and learning preferences.</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{dbUser.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <div className="flex items-center gap-2">
              <Badge variant={dbUser.plan === "FREE" ? "outline" : "default"}>{planLabel}</Badge>
              {dbUser.plan === "FREE" && (
                <a href="/pricing" className="text-xs text-primary hover:underline">
                  Upgrade
                </a>
              )}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Member since</span>
            <span className="text-sm font-medium">
              {new Date(dbUser.createdAt).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your name and learning details.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={{
              name: dbUser.name ?? "",
              grade: dbUser.grade ?? "",
              course: dbUser.course ?? "",
              age: dbUser.age ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
