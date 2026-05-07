
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const userName = update.message.from?.username || update.message.from?.first_name || 'Пользователь';

    if (text === '/start') {
      // Добавляем в Redis Set
      await redis.sadd('tg_users', String(chatId));
      
      await redis.hset(`user:${chatId}`, {
        username: userName,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });

      const botToken = process.env.TG_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ Привет, ${userName}!\nТеперь вы будете получать заявки с сайта.`
        })
      });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Collect error:', error);
    return res.status(200).json({ ok: true });
  }
}