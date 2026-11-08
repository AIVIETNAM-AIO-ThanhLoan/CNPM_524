import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const browser = await chromium.launch({ channel: 'msedge' });
try {
 const page = await browser.newPage();
 await page.route('**/api/finance?**', route => route.fulfill({json: {daily: [], income: 0, expense: 100000000, budget: 0, budgetAmount: 0, budgetSpent: 0, transactions: [], hasMore: false, breakdown: [{name:'Ăn uống',kind:'expense',amount:'100000000'}]}}));
 for (const width of [320,390,768]) {
  await page.setViewportSize({width,height:844});
  await page.goto('http://localhost:3100/reports');
  await page.locator('.calendar-summary').waitFor();
  assert.equal(await page.getByLabel('Khoảng báo cáo').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),`reports-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
  assert.equal(await page.locator('.report-view-switch').getAttribute('data-view'),'details');
  const marker=page.locator('.bottom-nav [aria-current="page"]');
  assert.equal(await marker.evaluate(el=>getComputedStyle(el,'::after').width),'22px');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.report-view-panel').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await marker.evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});

  await page.getByRole('button',{name:'Tuần',exact:true}).click();
  await page.getByRole('button',{name:'Kỳ trước',exact:true}).click();
  const range=await page.locator('.period-text').innerText();
  await page.getByRole('button',{name:'Lịch',exact:true}).click();
  await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Tuần',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.period-text').innerText(),range);
  await page.screenshot({path:join(tmpdir(),`reports-details-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Hôm nay',exact:true}).click();
  assert.notEqual(await page.locator('.period-text').innerText(),range);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 console.log('Report calendar, responsive layout and preserved week selection passed (mocked API).');
} finally {await browser.close();}
