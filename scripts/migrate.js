const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'youtube_automation',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function runMigrations() {
  const pool = new Pool(config);
  
  try {
    console.log('🗄️  Connecting to database...');
    await pool.connect();
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    
    // Check which migrations have already been run
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    
    const executedFilenames = executedMigrations.map(row => row.filename);
    
    // Run pending migrations
    for (const filename of migrationFiles) {
      if (executedFilenames.includes(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }
      
      console.log(`🔄 Running migration: ${filename}`);
      
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`✅ Completed migration: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();