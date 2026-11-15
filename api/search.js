
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'POSTで送信してください。'
    });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: '検索APIキーがまだ設定されていません。'
    });
  }

  const query = String(req.body?.query || '').trim();

  if (!query || query.length > 200) {
    return res.status(400).json({
      error: '検索ワードを入力してください（200文字以内）。'
    });
  }

  try {
    const response = await fetch(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: `${query} コミケ サークル`,
          search_depth: 'basic',
          max_results: 8,
          include_answer: false
        })
      }
    );

    if (!response.ok) {
      throw new Error('検索サービスでエラーが発生しました。');
    }

    const data = await response.json();

    const results = (data.results || []).map(item => ({
      title: item.title || 'タイトルなし',
      url: item.url || '',
      content: item.content || '',
      status: 'Webで発見・未確認'
    }));

    return res.status(200).json({ results });

  } catch (error) {
    return res.status(500).json({
      error: '検索に失敗しました。時間をおいて再度試してください。'
    });
  }
}
