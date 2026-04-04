import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.featureFlag.upsert({
    where: { featureName: "spaced_repetition" },
    update: {},
    create: { featureName: "spaced_repetition", enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { featureName: "retrieval_practice" },
    update: {},
    create: { featureName: "retrieval_practice", enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { featureName: "interleaved_practice" },
    update: {},
    create: { featureName: "interleaved_practice", enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { featureName: "elaborative_interrogation" },
    update: {},
    create: { featureName: "elaborative_interrogation", enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { featureName: "worked_example_study" },
    update: {},
    create: { featureName: "worked_example_study", enabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { featureName: "error_analysis" },
    update: {},
    create: { featureName: "error_analysis", enabled: true },
  });

  console.log("Seeded feature flags for learning science controls.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
