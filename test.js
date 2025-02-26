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
    const miniPugCode = await fs.readFile('./index.mjs', 'utf8');
    const result = await page.evaluate(async (code) => {
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      const MiniPugModule = await import(url);
      const MiniPug = MiniPugModule.default;
      
      const minipug = new MiniPug(document);
      return minipug.convert();
    }, miniPugCode);
    
    const expectedOutput = `h1 Hello World\nsection\n  p This is an example.\n  button(aria-label="Next page") Next page`;
    
    console.log('\nValidation:');
    if (result.trim() === expectedOutput.trim()) {
      console.log('✅ Test passed! Output matches expected result.');
    } else {
      console.log('❌ Test failed! Output does not match expected result.');
      console.log('\nExpected:');
      console.log(expectedOutput);
      console.log(expectedOutput.length);
      console.log('\nActual:');
      console.log(result);
      console.log(result.length);
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
