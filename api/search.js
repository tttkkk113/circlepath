
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
  query: `${query} C109 サークル参加 お品書き 新刊 頒布物 スペース 配置`,
  search_depth: 'advanced',
  max_results: 10,
  include_answer: false,
  include_domains: [
    'webcatalog.circle.ms',
    'x.com',
    'twitter.com'
  ]
})
    
  ]
})
      }
    );

    if (!response.ok) {
      throw new Error('検索サービスでエラーが発生しました。');
    }

    const data = await response.json();
console.log('検索APIの結果:', data);
    const results = (data.results || []).map(item => ({
      title: item.title || 'タイトルなし',
      url: item.url || '',
      content: item.content || '',
      status: 'Webで発見・未確認'
    }));

    return res.status(200).json({ results });

  } catch (error) {
    return res.status(500).json({
  error: error.message || '検索に失敗しました。'
});
  }
}
