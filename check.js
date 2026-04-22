const { Client } = require('@notionhq/client');
const notion = new Client({ auth: 'fake' });
console.log('notion.databases:', notion.databases ? 'exists' : 'undefined');
if (notion.databases) {
  console.log('typeof notion.databases.query:', typeof notion.databases.query);
}
