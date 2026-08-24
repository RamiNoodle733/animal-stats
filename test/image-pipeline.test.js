'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
    COMMANDS,
    HELP,
    main,
    resolvePipelineCommand
} = require('../scripts/assets/animal-image-pipeline');

test('image pipeline exposes one explicit route for every supported stage', () => {
    assert.deepEqual(Object.keys(COMMANDS), ['audit', 'source', 'promote', 'sync']);
    for (const command of Object.keys(COMMANDS)) {
        assert.equal(resolvePipelineCommand(command), COMMANDS[command]);
        assert.equal(path.isAbsolute(COMMANDS[command]), true);
    }
});

test('image pipeline help is non-mutating and unknown commands fail closed', () => {
    assert.match(HELP, /dry run unless --apply/);
    assert.equal(main(['--help']), 0);
    assert.throws(() => resolvePipelineCommand('download-random-image'), /Unknown image-pipeline command/);
});
