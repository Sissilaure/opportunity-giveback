const session = require("express-session");

const HUIT_HEURES_EN_SECONDES = 60 * 60 * 8;

// Store de session minimal, adossé à la base MySQL déjà utilisée par l'app.
// Évite une dépendance externe (express-mysql-session traîne des sous-dépendances
// vulnérables quelle que soit sa version) pour un besoin simple : survivre aux
// redémarrages/mises en veille du service, contrairement à la MemoryStore par défaut.
class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.pret = this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        INDEX idx_sessions_expires (expires_at)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  // Les sessions expirées ne sont jamais relues mais restaient en base : on les supprime (appelé chaque jour).
  async purge() {
    await this.pret;
    const [result] = await this.pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
    return result.affectedRows;
  }

  async get(sid, callback) {
    try {
      await this.pret;
      const [rows] = await this.pool.query(
        "SELECT data FROM sessions WHERE sid = ? AND expires_at > NOW()",
        [sid],
      );
      callback(null, rows[0] ? JSON.parse(rows[0].data) : null);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      await this.pret;
      const maxAgeSecondes = Math.floor((sessionData.cookie?.maxAge || HUIT_HEURES_EN_SECONDES * 1000) / 1000);
      await this.pool.query(
        `INSERT INTO sessions (sid, data, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
         ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)`,
        [sid, JSON.stringify(sessionData), maxAgeSecondes],
      );
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.pret;
      await this.pool.query("DELETE FROM sessions WHERE sid = ?", [sid]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      await this.pret;
      const maxAgeSecondes = Math.floor((sessionData.cookie?.maxAge || HUIT_HEURES_EN_SECONDES * 1000) / 1000);
      await this.pool.query("UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE sid = ?", [
        maxAgeSecondes,
        sid,
      ]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = MySQLSessionStore;
