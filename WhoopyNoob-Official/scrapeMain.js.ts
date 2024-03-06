// Import the 'fs' module using named import syntax
import * as fs from 'fs';
// Ensure 'url' and 'path' modules are imported correctly
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid'; // Assuming the 'uuid' package is installed
import puppeteer from 'puppeteer'; // Assuming 'puppeteer' is installed and types are recognized

// Adjustments for __dirname to work with ES modules
const __filename = fileURLToPath(new URL(import.meta.url));
const __dirname = dirname(__filename);

// Inputs
const productsPerPage = 100;

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        // Navigate to the first page to get the total number of products
        await page.goto('https://www.getfpv.com/ready-to-fly-quadcopters/micro-ready-to-fly.html?p=1', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.product-item-link', { timeout: 3000 });

        const numberOfProducts = await page.evaluate(() => {
            const element = document.querySelector('.toolbar-number');
            return element ? parseInt(element.textContent, 10) : 0;
        });

        const pagesToParse = Math.ceil(numberOfProducts / productsPerPage);
        let allProductTitleLinks = [];

        for (let currentPage = 1; currentPage <= pagesToParse; currentPage++) {
            // Navigate to each page based on currentPage
            await page.goto(`https://www.getfpv.com/ready-to-fly-quadcopters/micro-ready-to-fly.html?product_list_limit=${productsPerPage}&p=${currentPage}`, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('.product-item-link', { timeout: 3000 });

            // Extract the product elements for the current page
            const productTitleLink = await page.evaluate(() => {
                const elements = document.querySelectorAll('.product-item-link');
                return Array.from(elements).map(element => ({
                    name: element.textContent.trim(),
                    url: (element as HTMLAnchorElement).href // Assert element as HTMLAnchorElement to access 'href'
                }));
            });

            // Assign a UUID to each product here, in the Node.js context
            const productsWithIds = productTitleLink.map(product => ({
                id: uuidv4(), // Generate UUID for each product
                name: product.name,
                url: product.url
            }));

            // Append the current page's products to the overall list
            allProductTitleLinks = allProductTitleLinks.concat(productsWithIds);
        }

        // Write the array to a JSON file in the root folder
        fs.writeFileSync(`${__dirname}/products.json`, JSON.stringify(allProductTitleLinks, null, 2), 'utf-8');
        console.log('Products saved to products.json');
    } catch (error) {
        console.error('Error during the scraping process:', error);
    } finally {
        await browser.close();
    }
})();
