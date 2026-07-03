import { expect, test } from '@playwright/test'

test('create a task and see it in the list', async ({ page }) => {
  const title = `E2E task ${Date.now()}`

  await page.goto('/')
  await page.getByTestId('task-title-input').fill(title)
  await page.getByTestId('task-submit').click()

  await expect(page.getByTestId('task-list')).toContainText(title)
})

test('toggling a task marks it done', async ({ page }) => {
  const title = `E2E toggle ${Date.now()}`

  await page.goto('/')
  await page.getByTestId('task-title-input').fill(title)
  await page.getByTestId('task-submit').click()

  const item = page.getByTestId('task-list').locator('li', { hasText: title })
  await item.getByRole('checkbox').click()

  await expect(item.getByTestId('task-title')).toHaveClass(/line-through/)
})
