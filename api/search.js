
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
    const searchQueries = [
  `"${query}" C109 参加サークル サークル名 配置 スペース番号 お品書き 新刊`,
  `"${query}" C109 サークル参加 頒布物 グッズ 新刊 X`
];

const responses = await Promise.all(
  searchQueries.map(searchQuery =>
    fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: 'advanced',
        max_results: 30,
        include_answer: false,
        include_domains: [
          'webcatalog.circle.ms',
          'x.com',
          'twitter.com'
        ]
      })
    })
  )
);

for (const response of responses) {
  if (!response.ok) {
    throw new Error('検索サービスでエラーが発生しました。');
  }
}

const searchData = await Promise.all(
  responses.map(response => response.json())
);

const combined = searchData.flatMap(item => item.results || []);

const unique = [
  ...new Map(
    combined
      .filter(item => item.url)
      .map(item => [item.url, item])
  ).values()
];

console.log('検索APIの結果:', unique);

const results = unique
  .map(item => {
    const text = `${item.title || ''} ${item.content || ''}`;
    const lower = text.toLowerCase();

    const excluded = [
      'コミックマーケット準備会',
      '@comiketofficial',
      'comic market committee',
      '@comiket_intl',
      'チケット',
      'tickets',
      'wristband',
      '入場案内',
      '参加申込書',
      '申込関連',
      '開催日程',
      'December 29-31',
      '入場時間',
      'リポスト',
      'repost',
      'rt @',
      '引用ポスト',
      '引用リポスト',
      'retweeted'
    ];

    if (excluded.some(word => lower.includes(word.toLowerCase()))) {
      return null;
    }

    const keywords = [
      'c109',
      '冬コミ',
      'コミケ',
      'サークル参加',
      'スペース',
      '配置',
      'お品書き',
      '新刊',
      '頒布',
      '同人誌',
      'グッズ'
    ];

    const score = keywords.reduce(
      (total, word) => total + (lower.includes(word.toLowerCase()) ? 1 : 0),
      0
    );

    if (score < 2) return null;

    return {
      title: item.title || 'タイトルなし',
      url: item.url || '',
      content: item.content || '',
      status: 'Webで発見・未確認',
      score
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score)
  .map(({ score, ...item }) => item);

return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({
  error: error.message || '検索に失敗しました。'
});
  }
}
