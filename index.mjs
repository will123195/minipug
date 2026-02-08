export default class MiniPug {
  constructor(document) {
      this.document = document;
      this.ignoreTags = new Set(['html', 'body']);
      this.skipDescendantsTags = new Set(['noscript']);
      this.whitelistedTags = new Set([
          'nav', 'main', 'header', 'footer', 'aside',
          'article', 'section',
          'a', 'form', 'input', 'textarea', 'button', 'select', 'option',
          'h1', 'h2', 'h3', 'h4', 'h5',
          'ul', 'ol', 'li', 'dl', 'dt', 'dd',
          'caption',
          'pre', 'code',
          'fieldset', 'legend',
          'dialog', 'details', 'summary',
          'iframe', 'br', 'hr'
      ]);

      this.tableTags = new Set(['table', 'tr', 'th', 'td']);

      this.whitelistedClassSubstrings = new Set([
          'up', 'down', 'left', 'right', 'arrow', 'caret', 'chevron', 'star',
          'increase', 'decrease', 'plus', 'minus', 'expand', 'collapse', 'open', 'close',
          'success', 'error', 'warning', 'valid', 'invalid',
          'active', 'inactive', 'enabled', 'disabled', 'next', 'prev', 'previous', 'first', 'last'
      ]);

      this.whitelistedAttributes = new Set([
          'href', 'target', 'download',
          'action', 'method', 'type', 'name', 'value', 'placeholder', 'required', 'checked', 'selected',
          'aria-label', 'aria-expanded', 'aria-hidden', 'aria-controls', 'aria-current',
          'aria-describedby', 'aria-disabled', 'aria-haspopup', 'aria-invalid', 
          'aria-labelledby', 'aria-live', 'aria-pressed', 'aria-required', 'aria-selected',
          'aria-checked', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'role', 'title', 'alt',
          'disabled', 'readonly', 'focused',
          'data-testid'
      ]);

      this.booleanAttributes = new Set([
          'checked', 'selected', 'disabled', 'readonly', 'required', 'focused'
      ]);
  }

  isVisible(element) {
      if (!(element instanceof Element)) return true;
      if (element.tagName.toLowerCase() === 'body') return true; // Always consider body visible
      
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      // If element has zero dimensions, check if it has visible absolutely positioned children
      if (rect.width === 0 && rect.height === 0) {
          for (const child of element.children) {
              const childStyle = window.getComputedStyle(child);
              if ((childStyle.position === 'absolute' || childStyle.position === 'fixed') && 
                  this.isVisible(child)) {
                  return true;
              }
          }
      }

      return !(
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          element.getAttribute('aria-hidden') === 'true' ||
          (rect.width === 0 && rect.height === 0) ||
          style.opacity === '0' ||
          (
              (style.position === 'absolute' || style.position === 'fixed') &&
              (
                  rect.left + rect.width < 0 ||
                  rect.top + rect.height < 0 ||
                  rect.left > window.innerWidth ||
                  rect.top > window.innerHeight
              )
          )
      );
  }

  // hasWhitelistedClass(element) {
  //     const classAttr = element.getAttribute('class');
  //     if (!classAttr) return false;

  //     const normalizedClasses = classAttr.toLowerCase();
  //     for (const substring of this.whitelistedClassSubstrings) {
  //         if (normalizedClasses.includes(substring)) {
  //             return true;
  //         }
  //     }
  //     return false;
  // }

  findWhitelistedClasses(element, firstMatchOnly = false) {
    const classAttr = element.getAttribute('class');
    if (!classAttr) return [];

    const matches = [];
    const classes = classAttr.split(/\s+/);
    const normalizedClasses = classes.map(c => c.toLowerCase());
    
    for (const className of classes) {
      const normalizedClass = className.toLowerCase();
      for (const substring of this.whitelistedClassSubstrings) {
        if (normalizedClass.includes(substring)) {
          if (firstMatchOnly) return [className];
          matches.push(className);
          break; // Move to next className after finding a match
        }
      }
    }

    return matches;
  }

  hasWhitelistedClass(element) {
      return this.findWhitelistedClasses(element, true).length > 0;
  }

  hasWhitelistedAttribute(element) {
      for (const attr of element.attributes) {
          if (this.whitelistedAttributes.has(attr.name)) {
              if (this.booleanAttributes.has(attr.name)) {
                  return true; // Boolean attributes are valid just by existing
              }
              if (attr.value.trim() !== '') {
                  return true; // Non-boolean attributes need non-empty values
              }
          }
      }
      return false;
  }

  hasDirectTextNode(element) {
      for (const child of element.childNodes) {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
              return true;
          }
      }
      return false;
  }

  hasIncludedDescendant(element) {
      for (const child of element.children) {
          if (this.shouldIncludeElement(child)) {
              return true;
          }
          if (this.hasIncludedDescendant(child)) {
              return true;
          }
      }
      return false;
  }

  shouldIncludeElement(element) {
      if (this.ignoreTags.has(element.tagName.toLowerCase())) {
          return false;
      }

      // TODO: revisit tables
      // const tagName = element.tagName.toLowerCase();
      // if (this.tableTags.has(tagName)) {
      //     // For table elements, check if they have any included descendants
      //     return this.hasIncludedDescendant(element);
      // }
      const isWhitelistedTag = this.whitelistedTags.has(element.tagName.toLowerCase());
      if (isWhitelistedTag) return true;

      // For non-whitelisted tags, check if element has any meaningful content
      const hasText = this.hasDirectTextNode(element);
      if (hasText) return true;

      const hasWhitelistedClass = this.hasWhitelistedClass(element);
      if (hasWhitelistedClass) return true;

      const hasWhitelistedAttribute = this.hasWhitelistedAttribute(element);
      if (hasWhitelistedAttribute) return true;

      // const hasIncludedChildren = this.hasIncludedDescendant(element);
      // if (hasIncludedChildren) return true;

      return false;
  }

  getCapturedValue(element) {
      const tagName = element.tagName.toLowerCase();
      const type = element.type?.toLowerCase();

      if (tagName === 'input') {
          if (type === 'checkbox' || type === 'radio') {
              return element.checked;
          }
          return element.value;
      }
      if (tagName === 'textarea' || tagName === 'select') {
          return element.value;
      }
      return null;
  }

  getAttributes(element) {
      const attributes = {};
      const tagName = element.tagName.toLowerCase();
      
      for (const attr of element.attributes) {
          if (!this.whitelistedAttributes.has(attr.name)) continue;
          
          // Skip href attribute for img tags
          if (['img', 'image'].includes(tagName) && attr.name === 'href') continue;

          if (this.booleanAttributes.has(attr.name)) {
              // For boolean attributes, include them only if they exist
              attributes[attr.name] = true;
          } else if (attr.value.trim() !== '' && attr.value.length <= 150
              && !attr.value.startsWith('data:')
              && !attr.value.trimStart().toLowerCase().startsWith('javascript:')) {
              attributes[attr.name] = attr.value;
          }
      }

      // Capture live DOM values
      const capturedValue = this.getCapturedValue(element);
      if (capturedValue !== null) {
          if (typeof capturedValue === 'boolean') {
              if (capturedValue) {
                  attributes['checked'] = true;
              }
          } else if (capturedValue.trim() !== '') {
              attributes['value'] = capturedValue;
          }
      }
      
      // Check if element has focus
      if (element === this.document.activeElement) {
          attributes['focused'] = true;
      }

      return attributes;
  }

  onlyHasTextNodes(node) {
      for (const child of node.childNodes) {
          if (child.nodeType !== Node.TEXT_NODE) {
              return false;
          }
      }
      return true;
  }

  convertNode(node, depth = 0) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      if (!this.isVisible(node)) {
        return '';
      }

      const tagName = node.tagName.toLowerCase();

      if (this.skipDescendantsTags.has(tagName)) {
        return '';
      }

      let output = '';
      const shouldInclude = this.shouldIncludeElement(node);

      if (shouldInclude) {
          output += `${' '.repeat(depth * 2)}${tagName}`;
          
          const attributes = this.getAttributes(node);
          if (Object.keys(attributes).length > 0) {
              const attrStrings = [];
              for (const [key, value] of Object.entries(attributes)) {
                  if (value === true) {
                      attrStrings.push(key);
                  } else {
                      attrStrings.push(`${key}="${value}"`);
                  }
              }
              output += `(${attrStrings.join(' ')})`;
          }
          
          // Only output whitelisted classes
          const relevantClasses = this.findWhitelistedClasses(node);
          
          if (relevantClasses.length > 0) {
              output += `.${relevantClasses.join('.')}`;
          }

          // Handle text-only nodes differently
          if (this.onlyHasTextNodes(node)) {
              const text = Array.from(node.childNodes)
                  .map(child => child.textContent.trim())
                  .filter(Boolean)
                  .join(' ');
              if (text) {
                  output += ` ${text}`;
              }
              output += '\n';
          } else {
              output += '\n';
              // Process mixed content nodes in order
              let pendingText = '';
              for (const child of node.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE) {
                      const text = child.textContent.trim();
                      if (text) {
                          pendingText += (pendingText ? ' ' : '') + text;
                      }
                  } else if (child.nodeType === Node.ELEMENT_NODE) {
                      // Output any pending text before the element
                      if (pendingText) {
                          output += `${' '.repeat((depth + 1) * 2)}| ${pendingText}\n`;
                          pendingText = '';
                      }
                      output += this.convertNode(child, depth + 1);
                  }
              }
              // Output any remaining text
              if (pendingText) {
                  output += `${' '.repeat((depth + 1) * 2)}| ${pendingText}\n`;
              }
          }
      } else {
          // Even if we don't include this element, we still need to process its children
          for (const child of node.childNodes) {
              if (child.nodeType === Node.ELEMENT_NODE) {
                  output += this.convertNode(child, depth);
              }
          }
      }

      return output;
  }

  convert() {
      return this.convertNode(this.document.body).trim();
  }
}
