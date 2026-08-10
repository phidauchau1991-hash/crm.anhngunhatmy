const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Try to find the existing config
  let config = await prisma.aiConfig.findFirst();

  if (config) {
    // Update existing config
    await prisma.aiConfig.update({
      where: { id: config.id },
      data: {
        provider: 'deepseek',
        apiKey: 'sk-f68d429de6df4589bff79460f63ec216',
        modelName: 'deepseek-chat',
        isActive: true,
      }
    });
    console.log('Updated existing AI config to Deepseek');
  } else {
    // Create new config
    await prisma.aiConfig.create({
      data: {
        provider: 'deepseek',
        apiKey: 'sk-f68d429de6df4589bff79460f63ec216',
        modelName: 'deepseek-chat',
        isActive: true,
      }
    });
    console.log('Created new AI config for Deepseek');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
