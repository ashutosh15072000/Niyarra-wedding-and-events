import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        errors = []
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        await page.goto('http://127.0.0.1:8000/index.html')
        await page.wait_for_timeout(2000)
        
        with open('browser_errors.log', 'w') as f:
            f.write('\n'.join(errors))
        print('Done, errors written')
        await browser.close()

asyncio.run(run())
