'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildMigrationPlan,
    buildTargets
} = require('../scripts/migrations/sync-active-animal-images');

test('active image targets come only from canonical matching records', () => {
    const registry = {
        entries: [
            { animal: 'Yak', status: 'active', asset: '/images/animals/yak.png?v=0123456789ab' },
            { animal: 'Bison', status: 'source-selected', asset: '/images/animals/bison.png' }
        ]
    };
    const targets = buildTargets(registry, [{ name: 'Yak', image: '/images/animals/yak.png?v=0123456789ab' }]);
    assert.deepEqual(targets, [{ name: 'Yak', image: '/images/animals/yak.png?v=0123456789ab' }]);
    assert.throws(() => buildTargets(registry, [{ name: 'Yak', image: '/images/animals/old-yak.png' }]), /does not match/);
});

test('database image synchronization is idempotent and reports missing records', () => {
    const targets = [
        { name: 'Piranha', image: '/images/animals/piranha.png' },
        { name: 'Yak', image: '/images/animals/yak.png' },
        { name: 'Bongo', image: '/images/animals/bongo.png' }
    ];
    const plan = buildMigrationPlan([
        { _id: '1', name: 'Piranha', image: '/images/animals/piranha.jpg' },
        { _id: '2', name: 'Yak', image: '/images/animals/yak.png' }
    ], targets);

    assert.deepEqual(plan.missing, ['Bongo']);
    assert.deepEqual(plan.unchanged, ['Yak']);
    assert.deepEqual(plan.changes, [{
        id: '1',
        name: 'Piranha',
        before: '/images/animals/piranha.jpg',
        after: '/images/animals/piranha.png'
    }]);

    const complete = buildMigrationPlan([
        { _id: '1', name: 'Piranha', image: '/images/animals/piranha.png' },
        { _id: '2', name: 'Yak', image: '/images/animals/yak.png' },
        { _id: '3', name: 'Bongo', image: '/images/animals/bongo.png' }
    ], targets);
    assert.equal(complete.changes.length, 0);
    assert.equal(complete.missing.length, 0);
    assert.equal(complete.unchanged.length, 3);
});

test('duplicate database records are rejected before synchronization', () => {
    assert.throws(() => buildMigrationPlan([
        { _id: '1', name: 'Yak', image: '/images/animals/yak.jpg' },
        { _id: '2', name: 'Yak', image: '/images/animals/yak.jpg' }
    ], [{ name: 'Yak', image: '/images/animals/yak.png' }]), /Duplicate database animal/);
});
