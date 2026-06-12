import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const html = /* html */`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400&family=Inter:wght@300;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      position: relative;
      width: 1200px;
      height: 630px;
      background: #0a0a0a;
      color: #ddd8cf;
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .kanji {
      font-family: 'Noto Serif JP', serif;
      font-size: 108px;
      color: #8b1c1c;
      line-height: 1;
      margin-bottom: 40px;
    }
    .ronin {
      font-size: 82px;
      font-weight: 600;
      letter-spacing: 0.28em;
      color: #ddd8cf;
      text-transform: uppercase;
      line-height: 1;
    }
    .daily {
      font-size: 27px;
      font-weight: 300;
      letter-spacing: 0.72em;
      color: #a09a94;
      text-transform: uppercase;
      margin-top: 14px;
    }
    .rule {
      width: 44px;
      height: 1px;
      background: #8b1c1c;
      margin: 48px auto;
    }
    .tagline {
      font-size: 20px;
      font-weight: 300;
      letter-spacing: 0.22em;
      color: #6b6560;
      text-transform: uppercase;
    }
    .url {
      position: absolute;
      bottom: 38px;
      right: 54px;
      font-size: 15px;
      font-weight: 300;
      letter-spacing: 0.1em;
      color: #2e2b28;
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="kanji">侍</div>
    <div class="ronin">RONIN</div>
    <div class="daily">DAILY</div>
    <div class="rule"></div>
    <div class="tagline">Daily mission. No excuses.</div>
  </div>
  <div class="url">ronindaily.app</div>
</body>
</html>`

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const outPath = join(__dir, '../public/og.png')
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()

console.log(`og.png → ${outPath}`)
