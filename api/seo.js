'use strict';

const { renderHtml, normalizePath } = require('../lib/seo-renderer');

module.exports = function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).send('Method Not Allowed');
    }

    const pathFromQuery = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
    const pathname = normalizePath(pathFromQuery || req.url || '/');
    const html = renderHtml(pathname);

    if (!html) {
        return res.status(404).send('Not Found');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    return res.status(200).send(html);
};
