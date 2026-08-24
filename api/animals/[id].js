/**
 * API Route: /api/animals/[id]
 * 
 * Handles individual animal operations:
 * - GET: Fetch a single animal by ID or name
 * - PUT: Update an animal
 * - DELETE: Delete an animal
 */

const { connectToDatabase } = require('../../lib/mongodb');
const Animal = require('../../lib/models/Animal');
const { authorizeRequest } = require('../../lib/auth');
const mongoose = require('mongoose');
const { setCorsHeaders } = require('../../lib/cors');

module.exports = async function handler(req, res) {
    setCorsHeaders(req, res, {
        methods: 'GET, PUT, DELETE, OPTIONS',
        credentials: true
    });

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'Animal ID or name is required'
        });
    }

    try {
        await connectToDatabase();

        switch (req.method) {
            case 'GET':
                return await handleGet(req, res, id);
            case 'PUT':
                return await handlePut(req, res, id);
            case 'DELETE':
                return await handleDelete(req, res, id);
            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return res.status(405).json({
                    success: false,
                    error: `Method ${req.method} Not Allowed`
                });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Find animal by ID or name
 */
async function findAnimal(id) {
    // Check if id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
        const animal = await Animal.findById(id);
        if (animal) return animal;
    }

    // Try to find by name (case-insensitive)
    // eslint-disable-next-line no-return-await
    return await Animal.findByName(id);
}

/**
 * GET /api/animals/[id]
 */
async function handleGet(req, res, id) {
    const animal = await findAnimal(id);

    if (!animal) {
        return res.status(404).json({
            success: false,
            error: 'Animal not found'
        });
    }

    return res.status(200).json({
        success: true,
        data: animal
    });
}

/**
 * PUT /api/animals/[id]
 */
async function handlePut(req, res, id) {
    const authorization = await authorizeRequest(req, ['admin']);
    if (!authorization.ok) {
        return res.status(authorization.status).json({ success: false, error: authorization.error });
    }

    const animal = await findAnimal(id);

    if (!animal) {
        return res.status(404).json({
            success: false,
            error: 'Animal not found'
        });
    }

    const updateData = req.body || {};

    // Check for name conflict if name is being changed
    if (updateData.name && updateData.name !== animal.name) {
        const existing = await Animal.findByName(updateData.name);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Another animal with this name already exists'
            });
        }
    }

    // Only allow known schema fields to be updated (prevent mass assignment)
    const allowedFields = [
        'name', 'scientific_name', 'description', 'type', 'class', 'habitat', 'size',
        'weight_kg', 'height_cm', 'length_cm', 'speed_mps', 'lifespan_years', 'bite_force_psi',
        'size_score', 'isNocturnal', 'isSocial', 'diet', 'attack', 'defense', 'agility',
        'stamina', 'intelligence', 'special_attack', 'substats', 'battle_profile',
        'unique_traits', 'special_abilities', 'image'
    ];
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            animal[field] = updateData[field];
        }
    }
    await animal.save();

    return res.status(200).json({
        success: true,
        data: animal
    });
}

/**
 * DELETE /api/animals/[id]
 */
async function handleDelete(req, res, id) {
    const authorization = await authorizeRequest(req, ['admin']);
    if (!authorization.ok) {
        return res.status(authorization.status).json({ success: false, error: authorization.error });
    }

    const animal = await findAnimal(id);

    if (!animal) {
        return res.status(404).json({
            success: false,
            error: 'Animal not found'
        });
    }

    await Animal.findByIdAndDelete(animal._id);

    return res.status(200).json({
        success: true,
        message: `Animal "${animal.name}" deleted successfully`
    });
}
