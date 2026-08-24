#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const TITLE_TO_EVENT = new Map([
    ['New Vote', 'vote'],
    ['Vote Removed', 'vote_removed'],
    ['Vote Changed', 'vote_changed'],
    ['New Comment', 'comment'],
    ['Comment Reply', 'comment_reply'],
    ['Comment Upvoted', 'comment_upvote'],
    ['Comment Downvoted', 'comment_downvote'],
    ['Comment Deleted', 'comment_deleted'],
    ['Battle Comparison', 'fight'],
    ['New User Signup!', 'signup'],
    ['User Login', 'login'],
    ['Site Visit', 'site_visit'],
    ['User Logout', 'logout'],
    ['User Left Site', 'site_leave'],
    ['Community Chat', 'chat_message'],
    ['Chat Reply', 'chat_reply'],
    ['Tournament Completed!', 'tournament_complete'],
    ['Tournament Quit', 'tournament_quit'],
    ['User Prestiged!', 'prestige'],
    ['Level Up!', 'level_up']
]);

function getArg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1];
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quoted) {
            if (character === '"' && text[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                field += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ',') {
            row.push(field);
            field = '';
        } else if (character === '\n') {
            row.push(field.replace(/\r$/, ''));
            if (row.some((value) => value !== '')) rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }

    if (field || row.length) {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
    }
    return rows;
}

function normalizeHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '.');
}

function recordsFromFile(filePath) {
    const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
    if (rows.length < 2) return [];
    const headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
}

function collectFiles(inputPath) {
    const resolved = path.resolve(inputPath);
    if (!fs.existsSync(resolved)) throw new Error(`Input does not exist: ${resolved}`);
    const stats = fs.statSync(resolved);
    if (stats.isFile()) return [resolved];
    if (!stats.isDirectory()) throw new Error('Input must be a CSV file or directory.');
    return fs.readdirSync(resolved)
        .filter((name) => name.toLowerCase().endsWith('.csv'))
        .sort()
        .map((name) => path.join(resolved, name));
}

function getColumn(record, candidates) {
    for (const candidate of candidates) {
        const value = record[normalizeHeader(candidate)];
        if (value !== undefined && value !== '') return String(value).trim();
    }
    return '';
}

function stripTitleEmoji(value) {
    const text = String(value || '').trim();
    for (const title of TITLE_TO_EVENT.keys()) {
        if (text.endsWith(title)) return title;
    }
    return text;
}

function extractEmbedFields(record) {
    const fields = {};
    for (let index = 0; index < 30; index += 1) {
        const name = getColumn(record, [`embeds.0.fields.${index}.name`, `embed.0.fields.${index}.name`]);
        const value = getColumn(record, [`embeds.0.fields.${index}.value`, `embed.0.fields.${index}.value`]);
        if (name && value) fields[name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase()] = value;
    }
    return fields;
}

function field(fields, ...names) {
    for (const name of names) {
        const value = fields[name.toLowerCase()];
        if (value) return value.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return null;
}

function parseLocation(raw) {
    const parts = String(raw || '').split(',').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return null;
    if (parts.length === 1) return { city: null, region: null, country: parts[0] };
    if (parts.length === 2) return { city: parts[0], region: null, country: parts[1] };
    return { city: parts[0], region: parts[1], country: parts.slice(2).join(', ') };
}

function toActivity(record) {
    const discordMessageId = getColumn(record, ['id', 'message.id', 'messageid']);
    const occurredAtRaw = getColumn(record, ['timestamp', 'date', 'created.at']);
    const title = stripTitleEmoji(getColumn(record, ['embeds.0.title', 'embed.0.title']));
    const eventType = TITLE_TO_EVENT.get(title) || null;
    const fields = extractEmbedFields(record);
    const occurredAt = new Date(occurredAtRaw);

    return {
        discordMessageId,
        occurredAt,
        eventType,
        hasEmbedDetails: Boolean(title && Object.keys(fields).length),
        data: {
            username: field(fields, 'username', 'user', 'visitor', 'by') || 'Anonymous',
            user: field(fields, 'user', 'visitor', 'by') || 'Anonymous',
            page: field(fields, 'page'),
            location: parseLocation(field(fields, 'location')),
            device: field(fields, 'device'),
            animal: field(fields, 'animal'),
            target: field(fields, 'target', 'on'),
            content: field(fields, 'comment', 'reply', 'message'),
            animal1: field(fields, 'animal 1'),
            animal2: field(fields, 'animal 2')
        }
    };
}

async function reconcile(records) {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in .env.local for reconciliation.');
    const { connectToDatabase } = require('../../lib/mongodb');
    const SiteActivity = require('../../lib/models/SiteActivity');
    await connectToDatabase();
    const ids = [...new Set(records.map((item) => item.discordMessageId).filter(Boolean))];
    const existing = await SiteActivity.distinct('discordMessageId', { discordMessageId: { $in: ids } });
    const existingSet = new Set(existing);
    const missing = ids.filter((id) => !existingSet.has(id));
    console.log(JSON.stringify({ exportedIds: ids.length, matchedIds: existing.length, missingIds: missing.length, missingSample: missing.slice(0, 25) }, null, 2));
}

async function main() {
    const input = getArg('--input');
    const apply = process.argv.includes('--apply');
    const reconcileOnly = process.argv.includes('--reconcile');
    if (!input) throw new Error('An explicit --input <CSV file or directory> is required.');

    const files = collectFiles(input);
    if (!files.length) throw new Error('No CSV files were found in the input.');
    const records = files.flatMap(recordsFromFile).map(toActivity);
    const validIds = records.filter((item) => item.discordMessageId && !Number.isNaN(item.occurredAt.getTime()));

    if (reconcileOnly) {
        await reconcile(validIds);
        return;
    }

    const importable = validIds.filter((item) => item.hasEmbedDetails && item.eventType);
    if (!importable.length) {
        throw new Error('This export has IDs and timestamps but no flattened Discord embed details. Use --reconcile; it cannot rebuild map records.');
    }

    console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        files: files.length,
        rows: records.length,
        validIds: validIds.length,
        importableRows: importable.length,
        skippedRows: records.length - importable.length,
        eventTypes: Object.fromEntries(importable.reduce((counts, item) => counts.set(item.eventType, (counts.get(item.eventType) || 0) + 1), new Map()))
    }, null, 2));

    if (!apply) {
        console.log('Dry run complete. Add --apply only after reviewing these counts.');
        return;
    }
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in .env.local.');

    const { logSiteActivity } = require('../../lib/activity-logger');
    let inserted = 0;
    let duplicates = 0;
    for (const item of importable) {
        const result = await logSiteActivity({
            eventType: item.eventType,
            data: item.data,
            source: 'import',
            occurredAt: item.occurredAt,
            discordMessageId: item.discordMessageId
        });
        if (result.inserted) inserted += 1;
        if (result.duplicate) duplicates += 1;
    }
    console.log(JSON.stringify({ inserted, duplicates }, null, 2));
}

main()
    .catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
