const { Client } = require('@notionhq/client');
const notion = new Client({ auth: 'fake' });
console.log('Object.keys(notion.databases):', Object.keys(notion.databases));
console.log('Object.keys(notion):', Object.keys(notion));
