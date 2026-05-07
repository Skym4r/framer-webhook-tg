export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Получаем данные от Framer
    const body = req.body;
    
    // Framer присылает объект, например: { "name": "Ivan", "phone": "999..." }
    // Собираем текст сообщения
    const name = body.name || body['Ваше имя'] || '—'; // Подставьте точные названия полей из Framer, если они отличаются
    const contact = body.phone || body.email || body['Контактные данные'] || '—';
    
    const message = ` *Новая заявка с сайта!*

👤 *Имя:* ${name}
📞 *Контакт:* ${contact}
⏰ *Время:* ${new Date().toLocaleString('ru-RU')}`;

    // 2. Отправляем в Telegram
    const botToken = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const tgData = await tgResponse.json();

    if (!tgResponse.ok) {
      console.error('Telegram Error:', tgData);
      return res.status(502).json({ error: 'Failed to send to Telegram' });
    }

    // 3. Возвращаем успех Framer (обязательно 200 OK)
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Настройка для Vercel (отключаем bodyParser, чтобы получить сырой JSON, если нужно, 
// но для обычных форм Vercel сам парсит JSON)
export const config = {
  api: {
    bodyParser: true,
  },
};