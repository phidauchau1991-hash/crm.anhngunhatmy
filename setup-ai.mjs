import Database from 'better-sqlite3';
const db = new Database('./dev.db');

try {
  // Check if exists
  const existing = db.prepare("SELECT * FROM AiConfig").get();
  
  if (existing) {
    db.prepare(`
      UPDATE AiConfig 
      SET provider = 'deepseek', 
          apiKey = 'sk-***[HIDDEN_FOR_SECURITY]***', 
          modelName = 'deepseek-chat', 
          isActive = 1,
          updatedAt = datetime('now')
    `).run();
    console.log('Updated existing config to Deepseek');
  } else {
    db.prepare(`
      INSERT INTO AiConfig (provider, apiKey, modelName, isActive, createdAt, updatedAt)
      VALUES ('deepseek', 'sk-***[HIDDEN_FOR_SECURITY]***', 'deepseek-chat', 1, datetime('now'), datetime('now'))
    `).run();
    console.log('Inserted new config for Deepseek');
  }
} catch (e) {
  console.error(e);
} finally {
  db.close();
}
