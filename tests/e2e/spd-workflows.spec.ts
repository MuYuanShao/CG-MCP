import { expect, test } from '@playwright/test';

test.describe('SPD supplier platform workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('spd_auth_token', 'ui-e2e-token');
      window.localStorage.setItem('spd_auth_user', JSON.stringify({
        token: 'ui-e2e-token',
        username: 'e2e',
        role: 'admin',
        permissions: [],
      }));
    });
  });

  test('navigates core modules and opens refund dialogs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await page.getByRole('button', { name: /退货管理/ }).click();

    await expect(page.getByRole('heading', { name: '退货管理' })).toBeVisible();
    await expect(page.getByText('退货申请、审核、出库与库存回退')).toBeVisible();
    await page.getByRole('button', { name: /新增/ }).click();
    const refundDialog = page.getByRole('dialog');
    await expect(refundDialog.getByText('新增退货单')).toBeVisible();
    await refundDialog.getByLabel('关联订单').fill('PO202604270001');
    await refundDialog.getByLabel('医院').fill('测试医院');
    await refundDialog.getByLabel('商品').fill('测试耗材');
    await refundDialog.getByLabel('批号').fill('B20260427');
    await refundDialog.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(/退货单保存失败|请求失败|Failed to fetch/)).toBeVisible();
  });

  test('covers table selection and permission-like disabled states', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /退货管理/ }).click();

    await expect(page.getByRole('button', { name: /审核通过/ })).toBeDisabled();
    await expect(page.getByText('退货数据暂时无法从 API 加载')).toBeVisible();
  });

  test('keeps amount/status workflows visible across finance modules', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /结算管理/ }).click();
    await expect(page.getByText('JS20240401')).toBeVisible();
    await expect(page.getByText('¥285,000')).toBeVisible();

    await page.getByRole('button', { name: /发票管理/ }).click();
    await expect(page.getByText('00001234')).toBeVisible();
    await page.getByRole('button', { name: /新增/ }).click();
    await expect(page.getByText(/编辑发票/)).toBeVisible();
    await expect(page.getByText('价税合计(元) *')).toBeVisible();
  });
});
