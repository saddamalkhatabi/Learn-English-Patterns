const path = require('node:path');
module.exports = {
  client: 'better-sqlite3',
  connection: { filename: path.resolve(process.env.EP_DB_PATH || path.join(__dirname, 'data/content.sqlite')) },
  useNullAsDefault: true,
  pool: {
    afterCreate(connection, done) {
      try {
        connection.pragma('foreign_keys = ON');
        done(null, connection);
      } catch (error) {
        done(error, connection);
      }
    }
  },
  migrations: { directory: path.join(__dirname, 'db/migrations'), loadExtensions: ['.cjs'] },
  seeds: { directory: path.join(__dirname, 'db/seeds'), loadExtensions: ['.cjs'] }
};
