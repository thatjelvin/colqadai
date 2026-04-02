import { DefaultSession } from "next-auth";
import { Plan, SubscriptionStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: Plan;
      subscriptionStatus: SubscriptionStatus;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: Plan;
    subscriptionStatus?: SubscriptionStatus;
  }
}
