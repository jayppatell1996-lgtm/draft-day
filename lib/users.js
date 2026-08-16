import bcrypt from 'bcryptjs';
import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

const BCRYPT_COST = 12;

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    teamId: row.team_id,
    teamName: row.team_name,
    isAdmin: row.is_admin,
  };
}

export async function findUserByEmail(email) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.team_id, u.is_admin, t.name AS team_name
     FROM league_users u
     JOIN fantasy_teams t ON t.id = u.team_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email]
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findUserById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.team_id, u.is_admin, t.name AS team_name
     FROM league_users u
     JOIN fantasy_teams t ON t.id = u.team_id
     WHERE u.id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function countUsers() {
  const pool = getPool();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM league_users');
  return rows[0].count;
}

export async function createUserWithTeam({ email, password, teamName }) {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM league_users');
    const isFirstUser = countResult.rows[0].count === 0;

    const teamResult = await client.query(
      `INSERT INTO fantasy_teams (league_id, name) VALUES ($1, $2) RETURNING id, name`,
      [DEFAULT_LEAGUE_ID, teamName]
    );
    const team = teamResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO league_users (email, password_hash, team_id, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, team_id, is_admin`,
      [email, passwordHash, team.id, isFirstUser]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    return {
      id: user.id,
      email: user.email,
      teamId: team.id,
      teamName: team.name,
      isAdmin: user.is_admin,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      if (error.constraint === 'fantasy_teams_name_unique') {
        throw new Error('Team name is already taken');
      }
      if (
        error.constraint === 'idx_league_users_email_lower' ||
        error.message?.includes('idx_league_users_email_lower')
      ) {
        throw new Error('Email is already registered');
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyUserCredentials(email, password) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.team_id, u.is_admin, t.name AS team_name
     FROM league_users u
     JOIN fantasy_teams t ON t.id = u.team_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email]
  );
  const row = rows[0];
  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return mapUserRow(row);
}

export async function deleteUserAccount(userId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT team_id FROM league_users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return false;
    }
    const teamId = rows[0].team_id;
    await client.query('DELETE FROM league_users WHERE id = $1', [userId]);
    await client.query('DELETE FROM fantasy_teams WHERE id = $1', [teamId]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
