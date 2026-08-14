import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateTeamName,
} from '../../../lib/authValidation';
import { createUserWithTeam } from '../../../lib/users';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, teamName } = req.body || {};

  const emailResult = validateEmail(email || '');
  if (!emailResult.ok) {
    return res.status(400).json({ message: emailResult.error });
  }

  const passwordResult = validatePassword(password || '');
  if (!passwordResult.ok) {
    return res.status(400).json({ message: passwordResult.error });
  }

  const teamResult = validateTeamName(teamName || '');
  if (!teamResult.ok) {
    return res.status(400).json({ message: teamResult.error });
  }

  try {
    const user = await createUserWithTeam({
      email: normalizeEmail(emailResult.value),
      password: passwordResult.value,
      teamName: teamResult.value,
    });

    return res.status(201).json({
      message: 'Account created',
      user: {
        id: user.id,
        email: user.email,
        teamId: user.teamId,
        teamName: user.teamName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    const message = error.message || 'Could not create account';
    const status = message.includes('already') ? 409 : 500;
    return res.status(status).json({ message });
  }
}
