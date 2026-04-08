export default async function handler(req, res) {
  // CORS ヘッダーの設定（GitHub Pages からのリクエストを許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, name, text } = req.body;

    // 環境変数からキーを取得（Vercel の環境変数設定が必要）
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

    if (!GEMINI_API_KEY || !DISCORD_WEBHOOK_URL) {
      throw new Error('Server configuration error');
    }

    // 1. Gemini による判定
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `
      以下のテキストが「荒らし」「スパム」「極端に不適切な言葉」を含んでいるか判定してください。
      判定基準：
      - 荒らしやスパムである
      - 他者を著しく傷つける暴言が含まれている
      - ポルノや違法な内容である
      上記に該当する場合は "unsafe"、問題ない場合は "safe" とのみ答えてください。
      テキスト: "${text}"
    `;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const geminiData = await geminiRes.json();
    const result = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || '';

    if (result.includes('unsafe')) {
      return res.status(400).json({ error: '不適切な内容が含まれているため送信できません' });
    }

    // 2. Discord への送信
    const formattedContent = `[${category}]${text}by${name}`;
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'UchuAddon Antenna',
        content: formattedContent,
      }),
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}