"""Script to check CVSS calculator page and capture console errors"""
import asyncio
from playwright.async_api import async_playwright
import json
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

async def check_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Capture console messages
        console_messages = []
        page.on('console', lambda msg: console_messages.append({
            'type': msg.type,
            'text': msg.text
        }))
        
        # Capture errors
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        
        # Navigate to the page
        print("Navigating to http://localhost:5175/cvss_calc/index.html...")
        try:
            await page.goto('http://localhost:5175/cvss_calc/index.html', wait_until='networkidle')
            await page.wait_for_timeout(2000)  # Wait 2 seconds for JavaScript to execute
            
            # Get full HTML to inspect structure
            html = await page.content()
            with open('d:/projects/pentest-audit-helper/cvss_page_source.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print("HTML source saved to cvss_page_source.html")
            
            # Take screenshot
            screenshot_path = 'd:/projects/pentest-audit-helper/cvss_screenshot.png'
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"\nScreenshot saved to: {screenshot_path}")
            
            # Get page content structure
            metrics_container = await page.query_selector('#metrics-container')
            if metrics_container:
                print("\n[OK] #metrics-container found")
                html_content = await metrics_container.inner_html()
                print(f"Container has {len(html_content)} chars of HTML")
            else:
                print("\n[X] #metrics-container NOT found")
            
            # Check for metric groups
            groups = await page.query_selector_all('.metric-group')
            print(f"\nMetric groups found: {len(groups)}")
            
            # Get first few group titles
            for i, group in enumerate(groups[:5]):
                title_elem = await group.query_selector('.metric-group-title')
                if title_elem:
                    title = await title_elem.inner_text()
                    print(f"  Group {i+1}: {title}")
            
            # Check for buttons
            buttons = await page.query_selector_all('button')
            print(f"\nButtons found: {len(buttons)}")
            
            # Check for metric buttons specifically
            metric_buttons = await page.query_selector_all('.metric-button')
            print(f"Metric buttons (.metric-button): {len(metric_buttons)}")
            
            # Get page title
            title = await page.title()
            print(f"\nPage title: {title}")
            
            # Get body classes and id
            body = await page.query_selector('body')
            if body:
                body_classes = await body.get_attribute('class')
                print(f"Body classes: {body_classes}")
            
            # Check specific sections
            base_metrics = await page.query_selector_all('text=/BASE METRICS/')
            print(f"\n'BASE METRICS' text found: {len(base_metrics) > 0}")
            
            exploit_metrics = await page.query_selector_all('text=/EXPLOITABILITY METRICS/')
            print(f"'EXPLOITABILITY METRICS' text found: {len(exploit_metrics) > 0}")
            
            # Print console messages
            print("\n--- Console Messages ---")
            if console_messages:
                for msg in console_messages:
                    print(f"[{msg['type']}] {msg['text']}")
            else:
                print("(No console messages)")
            
            # Print errors
            if errors:
                print("\n--- JavaScript Errors ---")
                for error in errors:
                    print(error)
            else:
                print("\n[OK] No JavaScript errors detected")
                
        except Exception as e:
            print(f"\nError navigating to page: {e}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(check_page())
