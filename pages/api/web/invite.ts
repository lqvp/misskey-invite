import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '~/prisma/client';

export default async function API(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'You must sign in' });
  }

  const userId = session.user.id as string;
  if (!userId) {
    return res.status(401).json({ error: 'You must sign in' });
  }

  const invites = await prisma.invite.findUnique({
    where: { userId }
  });

  if (req.method === 'GET') {
    return res.status(200).json({ code: invites?.code });
  } else if (req.method === 'POST') {
    if (invites) {
      return res.status(403).json({ error: 'You already have an invite' });
    }

    try {
      const code = await getInvite();

      await prisma.invite.create({
        data: { userId, code }
      });

      return res.status(200).json({ code });
    } catch (error) {
      console.error('Invite generation error:', error);

      return res.status(500).json({
        error: 'Something went wrong',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

const getInvite = async () => {
  const domain = process.env.NEXT_PUBLIC_MISSKEY_DOMAIN;
  const token = process.env.MISSKEY_TOKEN;

  if (!domain || !token) {
    throw new Error('Missing Misskey domain or token');
  }

  try {
    const res = await fetch(`https://${domain}/api/invite/create`, {
      method: 'POST',
      body: JSON.stringify({ i: token }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get invite: ${errorText}`);
    }

    const { code } = (await res.json()) as { code: string };
    return code;
  } catch (error) {
    console.error('Misskey invite fetch error:', error);
    throw error;
  }
};
