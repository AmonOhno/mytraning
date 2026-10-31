import { expect, test, type Page } from '@playwright/test'

/**
 * 主要画面フローのスモーク E2E。
 * データは localStorage に保存されるため、各テストは新しいブラウザコンテキスト(=空の localStorage)で始まる。
 * 外部への通信は Webhook 送信のみで、page.route でモックする。
 */

const tab = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true })

test.beforeEach(async ({ page }) => {
  // 想定外の外部通信を検知できるよう、モックしていないクロスオリジン通信は失敗させる
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort(),
  )
  await page.goto('/')
})

test('初期表示で入力画面とタブバーが表示される', async ({ page }) => {
  await expect(page).toHaveTitle(/MyTraining/)
  await expect(page.getByRole('heading', { name: 'MyTraining' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '今日の記録' })).toBeVisible()
  for (const name of ['入力', '履歴', '統計', '目標', '連携']) {
    await expect(tab(page, name)).toBeVisible()
  }
})

test('内容が空のまま保存するとエラーが表示される', async ({ page }) => {
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('記録する内容を1つ以上入力してください')
})

test('筋トレ記録を入力して保存すると履歴に表示され、リロード後も残る', async ({ page }) => {
  await page.getByRole('button', { name: '+ 種目追加' }).click()
  // 種目マスタが空なので最初からテキスト入力
  await page.getByPlaceholder('新しい種目名(例: ベンチプレス)').fill('ベンチプレス')
  await page.getByPlaceholder('kg', { exact: true }).fill('60')
  await page.getByPlaceholder('回', { exact: true }).fill('10')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  // 保存後は履歴タブへ遷移する
  await expect(page.getByRole('heading', { name: '直近7日間' })).toBeVisible()
  const record = page.locator('.record').first()
  await expect(record).toContainText('ベンチプレス: 60kg×10')
  await expect(record).toContainText('ボリューム 600kg')

  await page.reload()
  await tab(page, '履歴').click()
  await expect(page.locator('.record')).toHaveCount(1)
  await expect(page.locator('.record').first()).toContainText('ベンチプレス: 60kg×10')

  // 統計タブに種目別の最大負荷が反映される
  await tab(page, '統計').click()
  await expect(page.getByRole('heading', { name: '週別ボリューム (kg)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '種目別の最大負荷' })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveValue('ベンチプレス')

  // 保存した種目は種目マスタに自動登録される
  await tab(page, '連携').click()
  await expect(page.locator('.master-list').first()).toContainText('ベンチプレス')
})

test('記録を編集・削除できる', async ({ page }) => {
  await page.getByRole('button', { name: '+ 有酸素追加' }).click()
  await page.getByPlaceholder('種類(例: ランニング)').fill('ランニング')
  await page.getByLabel('分', { exact: true }).fill('30')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  const record = page.locator('.record').first()
  await expect(record).toContainText('ランニング: ')

  await record.getByRole('button', { name: '編集' }).click()
  await expect(page.getByRole('heading', { name: '記録を編集' })).toBeVisible()
  await page.getByRole('textbox', { name: 'メモ' }).fill('E2E 編集テスト')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.record')).toHaveCount(1)
  await expect(page.locator('.record').first()).toContainText('E2E 編集テスト')

  page.once('dialog', (d) => d.accept())
  await page.locator('.record').first().getByRole('button', { name: '削除' }).click()
  await expect(page.locator('.record')).toHaveCount(0)
  await expect(page.getByText('まだ記録がありません。')).toBeVisible()
})

test('統計・目標・連携タブが表示できる(記録なし)', async ({ page }) => {
  await tab(page, '統計').click()
  await expect(page.getByText('記録がありません。「入力」タブから記録を追加してください。')).toBeVisible()

  await tab(page, '目標').click()
  await expect(page.getByRole('heading', { name: '目標を設定(空欄は未設定)' }).first()).toBeVisible()

  await tab(page, '連携').click()
  await expect(page.getByRole('heading', { name: 'MyOS 連携' })).toBeVisible()
})

test('Webhook 送信はモックした MyOS API へ POST され結果が表示される', async ({ page }) => {
  const webhook = 'https://myos.example.com/api/training'
  let body: { source?: string; records?: unknown[] } | null = null
  let auth: string | undefined
  await page.route(webhook, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type, authorization',
        },
      })
    }
    body = req.postDataJSON()
    auth = req.headers()['authorization']
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      body: '{}',
    })
  })

  await page.getByRole('textbox', { name: 'メモ' }).fill('送信テスト')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  await tab(page, '連携').click()
  await page.getByLabel('MyOS Webhook URL').fill(webhook)
  await page.getByLabel('API トークン(任意)').fill('test-token')
  await page.getByRole('button', { name: 'MyOS へ送信 (1件)' }).click()

  await expect(page.getByRole('status')).toHaveText('送信成功 (1件, HTTP 200)')
  expect(body).not.toBeNull()
  expect(body!.source).toBe('mytraining')
  expect(body!.records).toHaveLength(1)
  expect(auth).toBe('Bearer test-token')
})

test('Webhook 送信が失敗した場合はエラーが表示される', async ({ page }) => {
  const webhook = 'https://myos.example.com/api/training'
  await page.route(webhook, (route) =>
    route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: '' }),
  )
  await tab(page, '連携').click()
  await page.getByLabel('MyOS Webhook URL').fill(webhook)
  await page.getByRole('button', { name: 'MyOS へ送信 (0件)' }).click()
  await expect(page.getByRole('status')).toHaveText('送信失敗: HTTP 500')
})
