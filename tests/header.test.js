const puppeteer = require('puppeteer');

let browser;
let page;

beforeEach(async () => {
    browser = await puppeteer.launch({
        headless: false,
    });
    page = await browser.newPage();

    await page.goto('localhost:3000');
});

afterEach(async () => {
   await browser.close();
});

test('Header has correct title', async () => {
    const text = await page.$eval('a.brand-logo', el => el.innerHTML);

    expect(text).toEqual('Blogster');
});

test('Clicking Login starts oAuth flow', async () => {
    await page.click('.right a');
    const url = await page.url();

    expect(url).toMatch(/accounts\.google\.com/)
});