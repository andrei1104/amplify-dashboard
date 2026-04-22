const { Client } = require('@notionhq/client');
const notion = new Client({ auth: 'fake' });
console.log('notion.databases keys:', Object.keys(notion.databases));
let obj = notion.databases;
let props = [];
do {
  props = props.concat(Object.getOwnPropertyNames(obj));
} while (obj = Object.getPrototypeOf(obj));
console.log('All properties of notion.databases:', props);
