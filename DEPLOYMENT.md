# Deployment Guide

This document provides instructions for deploying the Animal Battle Stats application to different environments.

## Local Deployment

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/animal-stats.git
   cd animal-stats
   ```

2. Open `index.html` in your web browser.

## Web Server Deployment

### Apache Server

1. Copy all project files to your web server's document root (e.g., `/var/www/html/` or `htdocs/`).

2. Ensure your server has proper MIME types configured for serving JSON files. Add the following to your `.htaccess` file if needed:
   ```
   AddType application/json .json
   ```

### Nginx Server

1. Copy all project files to your web server's document root (e.g., `/usr/share/nginx/html/`).

2. Ensure your Nginx configuration includes the correct MIME type for JSON:
   ```
   types {
     application/json json;
   }
   ```

## Static Site Hosting

The application can be easily deployed to static site hosting services:

### GitHub Pages

1. Push your code to a GitHub repository.
2. Go to repository Settings > Pages.
3. Select the branch you want to deploy (usually `main` or `master`).
4. Your site will be available at `https://yourusername.github.io/animal-stats/`.

### Netlify

1. Sign up for a Netlify account.
2. Create a new site from Git.
3. Connect to your GitHub repository.
4. Configure build settings (not required for this project as it's static).
5. Deploy.

### Vercel

1. Sign up for a Vercel account.
2. Import your GitHub repository.
3. Configure project settings (not required for this static site).
4. Deploy.

## CORS Considerations

If you're hosting the JSON file separately from the HTML/JS files, you may need to configure CORS headers on the server hosting the JSON file.

## Performance Optimization

For production deployment, consider:

1. Minifying CSS and JavaScript files
2. Optimizing images
3. Adding cache headers
4. Using a CDN for static assets

## Troubleshooting

- If images don't load, check that the image URLs are accessible from your deployment environment.
- If JSON data doesn't load, check network requests for CORS issues or incorrect file paths.
- For local development with fetch API, you may need to run a local server (e.g., using Python's `http.server` or Node's `http-server`).
