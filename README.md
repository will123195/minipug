# minipug

Extract LLM-friendly representation of the DOM in [Pug](https://pugjs.org/) format.

## Install

```sh
npm i -s minipug
```

## Usage

```js
import MiniPug from 'minipug'
const minipug = new MiniPug(document)
const pug = minipug.convert()
```

## Example

Input:
```html
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

```

Output:
```pug
h1 Hello World
section 
  p This is an example.
  button(aria-label="Next page") Next page
```