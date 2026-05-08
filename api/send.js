// api/send.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// CORS настройки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // ✅ Устанавливаем заголовки для ВСЕХ ответов
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  console.log('📩 Request received:', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  });

  // ✅ Обработка preflight (OPTIONS) запроса
  if (req.method === 'OPTIONS') {
    console.log('🔀 OPTIONS request');
    return res.status(200).end();
  }

  // ✅ Разрешаем только POST
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('📦 Form data:', body);
    
    const contact = body.Name || '—'; 
    const name = body.Email || '—'; 
    
    const message = `* Новая заявка с сайта!*

 *Имя:* ${name}
 *Контакт:* ${contact}
 *Время:* ${new Date().toLocaleString('ru-RU')}`;

    const botToken = process.env.TG_BOT_TOKEN;
    
    // Получаем всех пользователей
    const userIds = await redis.smembers('tg_users');
    
    if (!userIds || userIds.length === 0) {
      console.warn('No users found in database');
      return res.status(200).json({ status: 'ok', sent: 0 });
    }

    // Рассылаем батчами
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

    // ✅ Возвращаем успех (заголовки уже установлены выше)
    return res.status(200).json({ 
      status: 'ok', 
      sent: sentCount,
      total: userIds.length
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}