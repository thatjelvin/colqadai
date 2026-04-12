import fs from 'fs';
import path from 'path';

const fileArray = [
"src/lib/auth.ts",
"src/app/pricing/page.tsx",
"src/app/api/user/onboarding/route.ts",
"src/app/api/topics/route.ts",
"src/app/api/study/session/route.ts",
"src/app/api/reflections/route.ts",
"src/app/api/problems/[id]/worked-example/route.ts",
"src/app/api/problems/[id]/start/route.ts",
"src/app/api/problems/[id]/route.ts",
"src/app/api/problems/[id]/review/route.ts",
"src/app/api/problems/[id]/attempt/route.ts",
"src/app/api/problems/due/route.ts",
"src/app/api/notebooks/[id]/summary/route.ts",
"src/app/api/notebooks/[id]/route.ts",
"src/app/api/notebooks/[id]/documents/route.ts",
"src/app/api/notebooks/route.ts",
"src/app/api/learning/flags/route.ts",
"src/app/api/errors/log/route.ts",
"src/app/api/dashboard/stats/route.ts",
"src/app/(app)/topics/[slug]/page.tsx",
"src/app/(app)/topics/page.tsx",
"src/app/(app)/study/page.tsx",
"src/app/(app)/settings/page.tsx",
"src/app/(app)/reflections/page.tsx",
"src/app/(app)/layout.tsx",
"src/app/(app)/error-log/page.tsx",
"src/app/api/chat/sessions/route.ts",
"src/app/api/chat/route.ts",
"src/app/api/billing/usage/route.ts",
"src/app/api/billing/checkout/route.ts",
"src/app/api/billing/change-plan/route.ts"
];

for (const file of fileArray) {
  const filePath = file.replace(/\//g, path.sep);
  if (!fs.existsSync(filePath)) {
    console.log(`Skip ${filePath} (not found)`);
    continue;
  }
  
  if (file.includes('src/lib/auth.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/export async function getServerSession[\s\S]*?\}\n/g, '');
    fs.writeFileSync(filePath, content);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');
  console.log(`Processing ${file}`);

  code = code.replace(/import\s+\{\s*getServerSession\s*\}\s+from\s+["']@\/lib\/auth["'];?/, 'import { auth } from "@clerk/nextjs/server";\nimport { prisma } from "@/lib/prisma";');
  
  const hasPrismaImport = code.match(/import\s+\{\s*prisma\s*\}\s+from\s+["']@\/lib\/prisma["']/g);
  if (hasPrismaImport && hasPrismaImport.length > 1) {
      code = code.replace('import { prisma } from "@/lib/prisma";\n', '');
  }

  const isPage = file.includes('page.tsx') || file.includes('layout.tsx');

  const authBlockPage = `const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { redirect("/sign-in"); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { redirect("/sign-in"); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };`;

  const authBlockApi = `const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { return new Response("Unauthorized", { status: 401 }); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { return new Response("User not found in DB", { status: 404 }); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };`;

  const block = isPage ? authBlockPage : authBlockApi;

  code = code.replace(/const\s+session\s*=\s*await\s+getServerSession\(\);?/g, block);
  
  if (isPage && !code.includes('import { redirect }')) {
     code = 'import { redirect } from "next/navigation";\n' + code;
  }

  fs.writeFileSync(filePath, code);
}
console.log('Modified files successfully.');
