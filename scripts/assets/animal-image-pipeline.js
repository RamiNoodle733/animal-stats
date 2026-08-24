#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const COMMANDS = Object.freeze({
    audit: path.join(__dirname, 'audit-animal-images.js'),
    source: path.join(__dirname, 'source-animal-images.js'),
    promote: path.join(__dirname, 'promote-animal-cutouts.js'),
    sync: path.join(__dirname, '..', 'migrations', 'sync-active-animal-images.js')
});

const HELP = `Animal image pipeline

Usage:
  npm run assets:pipeline -- <command> [options]

Commands:
  audit     Inspect assets, transparency, duplicates, and source provenance
  source    Download reusable Commons candidates into ignored .cache review folders
  promote   Validate reviewed transparent cutouts (dry run unless --apply)
  sync      Synchronize active image paths to MongoDB (dry run unless --apply)

The pipeline never promotes sourced candidates automatically. Visual review and an
explicit --apply are required before a replacement can become active.`;

function resolvePipelineCommand(command) {
    const script = COMMANDS[command];
    if (!script) {
        throw new Error(`Unknown image-pipeline command: ${command || '(missing)'}`);
    }
    return script;
}

function main(argv = process.argv.slice(2)) {
    const [command, ...commandArgs] = argv;
    if (!command || command === '--help' || command === '-h' || command === 'help') {
        console.log(HELP);
        return 0;
    }

    const script = resolvePipelineCommand(command);
    const result = spawnSync(process.execPath, [script, ...commandArgs], {
        cwd: ROOT,
        stdio: 'inherit'
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
}

if (require.main === module) {
    try {
        process.exitCode = main();
    } catch (error) {
        console.error(error.message);
        console.error('\nRun `npm run assets:pipeline -- --help` for usage.');
        process.exitCode = 1;
    }
}

module.exports = {
    COMMANDS,
    HELP,
    main,
    resolvePipelineCommand
};
