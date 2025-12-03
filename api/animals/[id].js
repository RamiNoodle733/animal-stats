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
const mongoose = require('mongoose');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const animal = await findAnimal(id);

    if (!animal) {
        return res.status(404).json({
            success: false,
            error: 'Animal not found'
        });
    }

    const updateData = req.body;

    // Prevent changing the _id
    delete updateData._id;

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

    // Update the animal
    Object.assign(animal, updateData);
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
