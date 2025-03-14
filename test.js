import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createTestHtml = async () => {
  const htmlContent = `
<html>
  <head>
    <title>Example Domain</title>
    <meta charset="utf-8">
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      body {
        background-color: #f0f0f2;
        margin: 0;
        padding: 0;
      }
    </style>    
  </head>
  <body>
    <h1>Hello World</h1>
    <section class="example-section">
      <p>This is an example.</p>
      <button aria-label="Next page" class="z2iX5wAef9nHv">Next page</button>
      <form>
        <input type="text" id="searchInput" placeholder="Search...">
        <input type="email" id="emailInput" placeholder="Email...">
      </form>
    </section>
  </body>
</html>
  `;
  
  const testFilePath = path.join(__dirname, 'test.html');
  await fs.writeFile(testFilePath, htmlContent);
  return testFilePath;
};

const runTest = async () => {
  console.log('Running MiniPug test with Puppeteer...');
  const testFilePath = await createTestHtml();
  const testFileUrl = `file://${testFilePath}`;
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto(testFileUrl);
    
    // Test 1: Basic conversion without focus
    console.log('\nTest 1: Basic conversion without focus');
    const miniPugCode = await fs.readFile('./index.mjs', 'utf8');
    let result = await page.evaluate(async (code) => {
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      const MiniPugModule = await import(url);
      const MiniPug = MiniPugModule.default;
      
      const minipug = new MiniPug(document);
      return minipug.convert();
    }, miniPugCode);
    
    const expectedOutput = `h1 Hello World\nsection\n  p This is an example.\n  button(aria-label="Next page") Next page\n  form\n    input(type="text" placeholder="Search...")\n    input(type="email" placeholder="Email...")`;
    
    console.log('\nValidation for basic conversion:');
    if (result.trim() === expectedOutput.trim()) {
      console.log('✅ Test passed! Output matches expected result.');
    } else {
      console.log('❌ Test failed! Output does not match expected result.');
      console.log('\nExpected:');
      console.log(expectedOutput);
      console.log('\nActual:');
      console.log(result);
      process.exitCode = 1;
    }
    
    // Test 2: Conversion with focus
    console.log('\nTest 2: Conversion with focus');
    result = await page.evaluate(async (code) => {
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      const MiniPugModule = await import(url);
      const MiniPug = MiniPugModule.default;
      
      // Focus the search input
      document.getElementById('searchInput').focus();
      
      const minipug = new MiniPug(document);
      return minipug.convert();
    }, miniPugCode);
    
    // Check if the focused attribute is present in the output
    console.log('\nValidation for focus detection:');
    if (result.includes('input(type="text" placeholder="Search..." focused)')) {
      console.log('✅ Focus detection test passed! The focused attribute is correctly applied.');
    } else {
      console.log('❌ Focus detection test failed! The focused attribute is missing.');
      console.log('\nActual output:');
      console.log(result);
      process.exitCode = 1;
    }
  } finally {
    // Always close the browser and clean up, regardless of success or failure
    await browser.close();
    await fs.unlink(testFilePath).catch(() => {});
  }
};

// This will catch any errors that occur during the test execution
runTest().catch(error => {
  console.error('Test error:', error);
  process.exitCode = 1;
});
