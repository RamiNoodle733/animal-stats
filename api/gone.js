'use strict';

module.exports = function goneHandler(_req, res) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(410).json({
        success: false,
        error: 'Gone'
    });
};
