export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
  
    const contact = body.Name || '—';        // телефон или email
    const name = body.Email || '—';          // имя
    
    const message = `*Новая заявка с сайта!*

 *Имя:* ${name}
 *Контакт:* ${contact}
 *Время:* ${new Date().toLocaleString('ru-RU')}`;

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

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};

