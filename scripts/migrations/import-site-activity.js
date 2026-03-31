/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.resolve(__dirname, '../../');
const DEFAULT_INPUT_DIR = path.join(ROOT, 'site-activity_xV4PFzoF89');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const inputDirArg = args.find(arg => arg.startsWith('--input='));
const INPUT_DIR = inputDirArg ? path.resolve(inputDirArg.split('=')[1]) : DEFAULT_INPUT_DIR;

const TITLE_TO_EVENT = [
    ['site visit', 'site_visit'],
    ['user left site', 'site_leave'],
    ['battle comparison', 'fight'],
    ['new vote', 'vote'],
    ['vote changed', 'vote_changed'],
    ['vote removed', 'vote_removed'],
    ['new comment', 'comment'],
    ['comment reply', 'comment_reply'],
    ['comment upvoted', 'comment_upvote'],
    ['comment downvoted', 'comment_downvote'],
    ['comment deleted', 'comment_deleted'],
    ['community chat', 'chat_message'],
    ['chat reply', 'chat_reply'],
    ['tournament completed', 'tournament_complete'],
    ['tournament quit', 'tournament_quit'],
    ['new user signup', 'signup'],
    ['user login', 'login'],
    ['user logout', 'logout'],
    ['prestige', 'prestige'],
    ['level up', 'level_up']
];

function toLower(value) {
    return String(value || '').trim().toLowerCase();
}

function parseEventType(title) {
    const text = toLower(title);
    for (const [match, type] of TITLE_TO_EVENT) {
        if (text.includes(match)) return type;
    }
    return 'unknown';
}

function extractFields(record) {
    const pairs = [];

    for (let index = 0; index < 20; index += 1) {
        const name = record[`embeds.0.fields.${index}.name`];
        const value = record[`embeds.0.fields.${index}.value`];
        if (!name || !value) continue;
        pairs.push({ name: String(name).trim(), value: String(value).trim() });
    }

    return pairs;
}

function parseDevice(value) {
    const text = String(value || '').trim();
    if (!text) return { device: null, browser: null, os: null };

    const parts = text.split(' on ');
    return {
        device: text.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop',
        browser: parts[0] || null,
        os: parts[1] || null
    };
}

function normalizeRecord(record, sourceFile) {
    const title = record['embeds.0.title'] || '';
    const fields = extractFields(record);
    const eventType = parseEventType(title);

    const output = {
        eventType,
        occurredAt: record.date || record.timestamp || new Date().toISOString(),
        username: record['author.username'] || 'Anonymous',
        page: null,
        location: null,
        browser: null,
        os: null,
        device: null,
        screenSize: null,
        language: null,
        metadata: {
            sourceFile,
            title,
            fields
        }
    };

    fields.forEach(({ name, value }) => {
        const label = toLower(name).replace(/[^a-z0-9\s]/g, '');

        if (label.includes('page')) {
            output.page = value;
            return;
        }

        if (label.includes('location')) {
            output.location = value;
            return;
        }

        if (label.includes('device')) {
            const deviceInfo = parseDevice(value);
            output.device = deviceInfo.device;
            output.browser = deviceInfo.browser;
            output.os = deviceInfo.os;
            return;
        }

        if (label.includes('screen')) {
            output.screenSize = value;
            return;
        }

        if (label.includes('language')) {
            output.language = value;
            return;
        }

        if (label === 'visitor' || label === 'user' || label === 'by') {
            output.username = value || output.username;
        }
    });

    return {
        discordMessageId: record.id || null,
        ...output
    };
}

function readCsvFiles(inputDir) {
    const files = fs.readdirSync(inputDir)
        .filter(file => file.endsWith('.csv'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (!files.length) {
        throw new Error(`No CSV files found in ${inputDir}`);
    }

    return files.map(file => ({
        file,
        fullPath: path.join(inputDir, file)
    }));
}

async function run() {
    const summary = {
        files: 0,
        rows: 0,
        normalized: 0,
        inserted: 0,
        duplicates: 0,
        unknownEvents: 0,
        byType: {}
    };

    const csvFiles = readCsvFiles(INPUT_DIR);
    summary.files = csvFiles.length;

    let logSiteActivity = null;
    if (!DRY_RUN) {
        ({ logSiteActivity } = require('../../lib/activity-logger'));
    }

    for (const fileInfo of csvFiles) {
        console.log(`\nProcessing ${fileInfo.file}...`);

        const raw = fs.readFileSync(fileInfo.fullPath, 'utf8');
        const records = parse(raw, {
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true,
            relax_column_count: true
        });

        let fileInserted = 0;
        let fileDuplicates = 0;

        for (const record of records) {
            summary.rows += 1;

            const normalized = normalizeRecord(record, fileInfo.file);
            if (!normalized.eventType) continue;

            summary.normalized += 1;
            summary.byType[normalized.eventType] = (summary.byType[normalized.eventType] || 0) + 1;

            if (normalized.eventType === 'unknown') {
                summary.unknownEvents += 1;
            }

            if (DRY_RUN) continue;

            try {
                const result = await logSiteActivity({
                    eventType: normalized.eventType,
                    data: {
                        username: normalized.username,
                        page: normalized.page,
                        location: normalized.location,
                        device: normalized.device,
                        browser: normalized.browser,
                        os: normalized.os,
                        screenSize: normalized.screenSize,
                        language: normalized.language,
                        source: 'csv',
                        metadata: normalized.metadata
                    },
                    occurredAt: normalized.occurredAt,
                    source: 'import',
                    discordMessageId: normalized.discordMessageId
                });

                if (result.duplicate) {
                    summary.duplicates += 1;
                    fileDuplicates += 1;
                } else if (result.inserted) {
                    summary.inserted += 1;
                    fileInserted += 1;
                }
            } catch (error) {
                const id = normalized.discordMessageId || '(no-id)';
                console.error(`Failed row ${id}: ${error.message}`);
             }
         }

        console.log(`Rows: ${records.length}, inserted: ${fileInserted}, duplicates: ${fileDuplicates}`);
    }

    console.log('\n=== Import Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
    console.log(`Input: ${INPUT_DIR}`);
    console.log(`Files: ${summary.files}`);
    console.log(`Rows: ${summary.rows}`);
    console.log(`Normalized: ${summary.normalized}`);
    console.log(`Inserted: ${summary.inserted}`);
    console.log(`Duplicates: ${summary.duplicates}`);
    console.log(`Unknown event rows: ${summary.unknownEvents}`);
    console.log('By event type:');

    Object.entries(summary.byType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
}

run().catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
});
