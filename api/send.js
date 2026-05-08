// api/send.js
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
    const body = req.body;
    
    // Данные из Framer (ключи Name и Email, как мы выяснили ранее)
    const contact = body.Name || '—'; 
    const name = body.Email || '—'; 
    
    const message = `* Новая заявка с сайта!*

 *Имя:* ${name}
 *Контакт:* ${contact}
 *Время:* ${new Date().toLocaleString('ru-RU')}`;

    const botToken = process.env.TG_BOT_TOKEN;
    
    // 1. Получаем всех пользователей из Redis
    const userIds = await redis.smembers('tg_users');
    
    if (!userIds || userIds.length === 0) {
      console.warn('No users found in database');
      return res.status(200).json({ status: 'ok', sent: 0 });
    }

    // 2. Рассылаем сообщение всем (батчами по 10, чтобы не забанили за спам)
    let sentCount = 0;

    for (let i = 0; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10);
      
      await Promise.allSettled(
        batch.map(async (chatId) => {
          try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
              })
            });
            
            const data = await response.json();

            if (!response.ok) {
              // Если бот заблокирован (403) — удаляем пользователя из базы
              if (data.error_code === 403) {
                await redis.srem('tg_users', chatId);
              }
            } else {
              sentCount++;
            }
          } catch (e) {
            console.error(`Failed to send to ${chatId}:`, e.message);
          }
        })
      );
    }

    return res.status(200).json({ 
      status: 'ok', 
      sent: sentCount,
      total: userIds.length
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}