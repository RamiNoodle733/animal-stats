/**
 * UI Snapshot Tool
 * Captures screenshots at multiple viewport sizes for visual verification
 * 
 * Usage:
 *   node tools/ui-snapshot.mjs [url] [routes...]
 *   npm run ui:snap              # Uses default URL and routes
 *   npm run ui:snap:local        # Uses localhost:3000
 * 
 * Examples:
 *   node tools/ui-snapshot.mjs http://localhost:3000
 *   node tools/ui-snapshot.mjs http://localhost:3000 /stats /compare /rankings
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SNAPSHOT_DIR = join(ROOT_DIR, 'ui-snapshots');

// Viewport configurations
const VIEWPORTS = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
];

// Default routes to capture
const DEFAULT_ROUTES = ['/', '/stats', '/compare', '/rankings', '/community'];

// Parse command line arguments
const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:3000';
const routes = args.length > 1 ? args.slice(1) : DEFAULT_ROUTES;

// Console log collector
const consoleLogs = [];

async function captureSnapshots() {
    console.log('🎯 UI Snapshot Tool');
    console.log(`📍 Base URL: ${baseUrl}`);
    console.log(`📄 Routes: ${routes.join(', ')}`);
    console.log(`📐 Viewports: ${VIEWPORTS.map(v => v.name).join(', ')}`);
    console.log('');

    // Create snapshot directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sessionDir = join(SNAPSHOT_DIR, timestamp);
    await mkdir(sessionDir, { recursive: true });

    let browser;
    try {
        // Launch browser
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        
        for (const viewport of VIEWPORTS) {
            console.log(`\n📱 Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
            
            const context = await browser.newContext({
                viewport: { width: viewport.width, height: viewport.height },
                deviceScaleFactor: viewport.name === 'mobile' ? 2 : 1
            });
            
            const page = await context.newPage();
            
            // Collect console logs
            page.on('console', msg => {
                const logEntry = `[${viewport.name}] [${msg.type()}] ${msg.text()}`;
                consoleLogs.push(logEntry);
            });
            
            // Collect page errors
            page.on('pageerror', err => {
                const logEntry = `[${viewport.name}] [ERROR] ${err.message}`;
                consoleLogs.push(logEntry);
            });
            
            for (const route of routes) {
                const url = `${baseUrl}${route}`;
                const routeName = route === '/' ? 'home' : route.replace(/\//g, '-').slice(1);
                const filename = `${viewport.name}-${routeName}.png`;
                
                try {
                    console.log(`  📸 ${route}...`);
                    
                    // Navigate and wait for DOM content loaded (faster than networkidle)
                    await page.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    
                    // Wait for content to render
                    await page.waitForTimeout(2500);
                    
                    // Hide loading screens if present
                    await page.evaluate(() => {
                        const loadingScreen = document.getElementById('app-loading-screen');
                        if (loadingScreen) loadingScreen.style.display = 'none';
                    });
                    
                    // Take full page screenshot
                    await page.screenshot({
                        path: join(sessionDir, filename),
                        fullPage: true
                    });
                    
                    console.log(`     ✅ Saved: ${filename}`);
                } catch (err) {
                    console.log(`     ❌ Failed: ${err.message}`);
                    consoleLogs.push(`[${viewport.name}] [CAPTURE_ERROR] ${route}: ${err.message}`);
                }
            }
            
            await context.close();
        }
        
        // Save console logs
        const logFile = join(sessionDir, 'console.log');
        await writeFile(logFile, consoleLogs.join('\n'), 'utf-8');
        console.log(`\n📋 Console logs saved to: console.log`);
        
        // Create summary
        const summary = {
            timestamp,
            baseUrl,
            routes,
            viewports: VIEWPORTS,
            screenshots: VIEWPORTS.flatMap(v => 
                routes.map(r => `${v.name}-${r === '/' ? 'home' : r.replace(/\//g, '-').slice(1)}.png`)
            ),
            consoleLogCount: consoleLogs.length
        };
        
        await writeFile(
            join(sessionDir, 'summary.json'), 
            JSON.stringify(summary, null, 2), 
            'utf-8'
        );
        
        console.log(`\n✨ Snapshots saved to: ui-snapshots/${timestamp}/`);
        console.log(`   Total screenshots: ${summary.screenshots.length}`);
        console.log(`   Console log entries: ${consoleLogs.length}`);
        
        // List the files
        console.log('\n📁 Files created:');
        for (const file of summary.screenshots) {
            console.log(`   - ${file}`);
        }
        console.log('   - console.log');
        console.log('   - summary.json');
        
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run
captureSnapshots().catch(console.error);
