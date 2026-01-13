/**
 * UI Snapshot Tool
 * Captures screenshots AND text-based layout analysis for AI verification
 * 
 * Usage:
 *   node tools/ui-snapshot.mjs [url] [routes...]
 *   npm run ui:snap              # Uses default URL and routes
 *   npm run ui:snap:local        # Uses localhost:3000
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

// Key elements to analyze for layout
const LAYOUT_SELECTORS = {
    // Global
    'body': 'Body',
    '.game-header': 'Header',
    '.mobile-bottom-nav': 'Mobile Bottom Nav',
    '.nav-tabs': 'Nav Tabs',
    
    // Home page
    '#home-view': 'Home View',
    '.portal-nav': 'Portal Nav',
    '.portal-panel': 'Portal Panel',
    '.portal-widgets': 'Portal Widgets',
    
    // Stats page
    '#stats-view': 'Stats View',
    '.character-display-area': 'Character Display Area',
    '.character-showcase': 'Character Showcase',
    '.character-model-container': 'Character Model Container',
    '.stats-panel': 'Stats Panel',
    '.stats-panel-left': 'Stats Panel Left',
    '.stats-panel-right': 'Stats Panel Right',
    '.stat-bar': 'Stat Bar',
    '.details-panel': 'Details Panel',
    '.character-grid-container': 'Character Grid',
    
    // Compare page
    '#compare-view': 'Compare View',
    '.fight-screen': 'Fight Screen',
    '.fighter-section': 'Fighter Section',
    '.fighter-left': 'Fighter Left',
    '.fighter-right': 'Fighter Right',
    '.fight-center': 'Fight Center',
    '.compare-bars-container': 'Compare Bars',
    
    // Rankings page
    '#rankings-view': 'Rankings View',
    '.rankings-hero-banner': 'Rankings Hero Banner',
    '.rankings-main-content': 'Rankings Main Content',
    '.rankings-list-column': 'Rankings List Column',
    '.rankings-right-column': 'Rankings Right Column',
    '.ranking-item': 'Ranking Item',
    
    // Community page
    '#community-view': 'Community View',
    '.community-feed-layout': 'Community Layout',
    '.community-sidebar-column': 'Community Sidebar',
    '.community-feed-column': 'Community Feed',
    '.feed-compose-box': 'Compose Box',
    
    // Tournament
    '.tournament-modal': 'Tournament Modal',
    '.t-fighter-card': 'Tournament Fighter Card',
    '.t-battle-arena': 'Tournament Arena'
};

// Parse command line arguments
const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:3000';
const routes = args.length > 1 ? args.slice(1) : DEFAULT_ROUTES;

// Console log collector
const consoleLogs = [];

// Layout analysis results
const layoutAnalysis = {};

async function analyzeLayout(page, viewport, route) {
    const analysis = await page.evaluate((selectors) => {
        const results = {
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollWidth: document.body.scrollWidth,
                scrollHeight: document.body.scrollHeight,
                hasHorizontalScroll: document.body.scrollWidth > window.innerWidth
            },
            elements: {},
            issues: []
        };
        
        // Check for horizontal overflow (major mobile issue)
        if (results.viewport.hasHorizontalScroll) {
            results.issues.push(`⚠️ HORIZONTAL SCROLL DETECTED: body scrollWidth (${document.body.scrollWidth}px) > viewport width (${window.innerWidth}px)`);
        }
        
        for (const [selector, name] of Object.entries(selectors)) {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) continue;
            
            const elementData = [];
            elements.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                
                const data = {
                    index: idx,
                    visible: styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
                    display: styles.display,
                    position: styles.position,
                    dimensions: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        top: Math.round(rect.top),
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        bottom: Math.round(rect.bottom)
                    },
                    overflow: {
                        x: styles.overflowX,
                        y: styles.overflowY
                    },
                    flexDirection: styles.flexDirection,
                    gridTemplateColumns: styles.gridTemplateColumns !== 'none' ? styles.gridTemplateColumns : null
                };
                
                // Check for elements extending beyond viewport
                if (rect.right > window.innerWidth + 5) {
                    results.issues.push(`⚠️ ${name}[${idx}] extends beyond viewport: right edge at ${Math.round(rect.right)}px (viewport: ${window.innerWidth}px)`);
                }
                
                // Check for very small touch targets on mobile
                if (window.innerWidth < 500 && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                    if (rect.width < 44 || rect.height < 44) {
                        if (data.visible) {
                            results.issues.push(`⚠️ ${name}[${idx}] touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (min: 44x44px)`);
                        }
                    }
                }
                
                elementData.push(data);
            });
            
            results.elements[name] = elementData;
        }
        
        return results;
    }, LAYOUT_SELECTORS);
    
    return analysis;
}

async function captureSnapshots() {
    console.log('🎯 UI Snapshot Tool (with Layout Analysis)');
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
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        
        for (const viewport of VIEWPORTS) {
            console.log(`\n📱 Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
            layoutAnalysis[viewport.name] = {};
            
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
                    
                    await page.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    
                    // Wait for content to render
                    await page.waitForTimeout(2500);
                    
                    // Hide loading screens
                    await page.evaluate(() => {
                        const loadingScreen = document.getElementById('app-loading-screen');
                        if (loadingScreen) loadingScreen.style.display = 'none';
                    });
                    
                    // Analyze layout BEFORE screenshot
                    const analysis = await analyzeLayout(page, viewport, route);
                    layoutAnalysis[viewport.name][routeName] = analysis;
                    
                    // Report issues immediately
                    if (analysis.issues.length > 0) {
                        console.log(`     🔍 Issues found:`);
                        analysis.issues.forEach(issue => console.log(`        ${issue}`));
                    }
                    
                    // Take screenshot
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
        await writeFile(join(sessionDir, 'console.log'), consoleLogs.join('\n'), 'utf-8');
        
        // Save detailed layout analysis (THIS IS WHAT THE AI CAN READ)
        await writeFile(
            join(sessionDir, 'layout-analysis.json'), 
            JSON.stringify(layoutAnalysis, null, 2), 
            'utf-8'
        );
        
        // Create human-readable layout report
        let report = '# UI Layout Analysis Report\n\n';
        report += `Generated: ${timestamp}\n`;
        report += `Base URL: ${baseUrl}\n\n`;
        
        for (const [viewportName, viewportData] of Object.entries(layoutAnalysis)) {
            report += `## ${viewportName.toUpperCase()}\n\n`;
            
            for (const [routeName, analysis] of Object.entries(viewportData)) {
                report += `### /${routeName === 'home' ? '' : routeName}\n\n`;
                report += `**Viewport:** ${analysis.viewport.width}x${analysis.viewport.height}\n`;
                report += `**Scroll Size:** ${analysis.viewport.scrollWidth}x${analysis.viewport.scrollHeight}\n`;
                report += `**Horizontal Scroll:** ${analysis.viewport.hasHorizontalScroll ? '⚠️ YES' : '✅ No'}\n\n`;
                
                if (analysis.issues.length > 0) {
                    report += `**Issues Found:**\n`;
                    analysis.issues.forEach(issue => {
                        report += `- ${issue}\n`;
                    });
                    report += '\n';
                }
                
                report += `**Key Elements:**\n`;
                for (const [elemName, elemData] of Object.entries(analysis.elements)) {
                    if (elemData.length > 0) {
                        const first = elemData[0];
                        const visibleCount = elemData.filter(e => e.visible).length;
                        report += `- ${elemName}: ${first.dimensions.width}x${first.dimensions.height}px, display: ${first.display}`;
                        if (elemData.length > 1) {
                            report += ` (${visibleCount}/${elemData.length} visible)`;
                        } else {
                            report += first.visible ? ' ✅' : ' ❌ hidden';
                        }
                        report += '\n';
                    }
                }
                report += '\n';
            }
        }
        
        await writeFile(join(sessionDir, 'layout-report.md'), report, 'utf-8');
        
        // Create summary
        const allIssues = [];
        for (const [viewport, routes] of Object.entries(layoutAnalysis)) {
            for (const [route, analysis] of Object.entries(routes)) {
                analysis.issues.forEach(issue => {
                    allIssues.push({ viewport, route, issue });
                });
            }
        }
        
        const summary = {
            timestamp,
            baseUrl,
            routes,
            viewports: VIEWPORTS,
            totalIssues: allIssues.length,
            issues: allIssues,
            consoleLogCount: consoleLogs.length
        };
        
        await writeFile(join(sessionDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
        
        console.log(`\n✨ Snapshots saved to: ui-snapshots/${timestamp}/`);
        console.log(`   Screenshots: ${VIEWPORTS.length * routes.length}`);
        console.log(`   Layout issues found: ${allIssues.length}`);
        console.log(`   Console log entries: ${consoleLogs.length}`);
        
        console.log('\n📁 Files created:');
        console.log('   - *.png (screenshots)');
        console.log('   - layout-analysis.json (detailed element data)');
        console.log('   - layout-report.md (human-readable report)');
        console.log('   - console.log');
        console.log('   - summary.json');
        
        // Print issues summary
        if (allIssues.length > 0) {
            console.log('\n⚠️ ISSUES SUMMARY:');
            allIssues.forEach(({ viewport, route, issue }) => {
                console.log(`   [${viewport}/${route}] ${issue}`);
            });
        } else {
            console.log('\n✅ No layout issues detected!');
        }
        
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

captureSnapshots().catch(console.error);
