'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Animal = require('../lib/models/Animal');
const User = require('../lib/models/User');
const RankHistory = require('../lib/models/RankHistory');

test('model save hooks use promise-compatible middleware', async () => {
    assert.equal(Number(mongoose.version.split('.')[0]) >= 9, true);

    const animal = new Animal({
        name: 'Hook Test',
        diet: [],
        unique_traits: [],
        special_abilities: []
    });
    animal._doc.diet = 'invalid';
    animal._doc.unique_traits = 'invalid';
    animal._doc.special_abilities = 'invalid';
    await Animal.schema.s.hooks.execPre('save', animal);

    assert.deepEqual(animal.diet, ['Varied']);
    assert.deepEqual(animal.unique_traits, []);
    assert.deepEqual(animal.special_abilities, []);

    const user = new User({
        username: 'HookUser',
        email: 'hook@example.com',
        password: 'password123'
    });
    await User.schema.s.hooks.execPre('save', user);

    assert.equal(user.displayName, 'HookUser');
    assert.notEqual(user.password, 'password123');
    assert.equal(await user.comparePassword('password123'), true);
});

test('rank history declares one unique date index', () => {
    const dateIndexes = RankHistory.schema.indexes()
        .filter(([spec]) => spec.date === 1 && Object.keys(spec).length === 1);

    assert.equal(dateIndexes.length, 1);
    assert.equal(dateIndexes[0][1].unique, true);
});
