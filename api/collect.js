// api/collect.js
import Redis from 'ioredis';

// Подключаемся к Redis через URL из переменных окружения
const redis = new Redis(process.env.REDIS_URL);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Telegram отправляет только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Если это не текстовое сообщение — игнорируем
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const userName = update.message.from?.username || update.message.from?.first_name || 'User';

    // Реагируем только на /start
    if (text === '/start') {
      // 1. Добавляем ID в множество (Set) для рассылки
      await redis.sadd('tg_users', String(chatId));
      
      // 2. Сохраняем детали о пользователе (опционально, но полезно)
      await redis.hset(`user:${chatId}`, {
        username: userName,
        first_seen: new Date().toISOString(),
        last_active: new Date().toISOString()
      });

      // 3. Отправляем приветствие
      const botToken = process.env.TG_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Привет, ${userName}!\nТеперь вы будете получать заявки с сайта.`
        })
      });
    }

    // Telegram требует ответ 200 OK
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Collect error:', error);
    return res.status(200).json({ ok: true });
  }
}