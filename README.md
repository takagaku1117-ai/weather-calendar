# お天気カレンダー

OpenWeatherMap の API と連携した Next.js の天気アプリ。

- 都市名検索・現在地・よく使う都市ボタンで場所を選ぶ
- いまの気温・天気・体感・湿度・風速を表示
- カレンダーで日付を選ぶと、その日の最高/最低気温・降水確率・湿度・3時間ごとの予報に切り替わる（今日から5日先まで）

## 動かし方

```bash
cp .env.example .env.local   # OPENWEATHER_API_KEY に自分のキーを入れる
npm install
npm run dev
```

APIキーはサーバー側（`src/app/api/weather/route.ts`）だけで読み、ブラウザには渡さない。
Vercel では Project Settings → Environment Variables に `OPENWEATHER_API_KEY` を設定する。
