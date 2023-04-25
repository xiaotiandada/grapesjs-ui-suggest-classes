import {html, render} from 'lit-html';
import {styleMap} from 'lit-html/directives/style-map.js';

export default (editor, opts = {}) => {
  const sm = editor.SelectorManager;
  const listEl = document.createElement('div');
  const prefix =  editor.Config.selectorManager.pStylePrefix;
  const selIdAttr = 'data-sel-id';

  const options = { ...{
    // default options
    enablePerformance: false,
    enableCount: true,
    containerStyle: `
      .${prefix}suggest {
        position: absolute;
        z-index: 999;
        padding: 0;
        margin: 0;
        left: 0;
        right: 0;
        transition: opacity .25s ease;
        text-align: left;
        padding: 0 5px;
      }
    `,
    tagStyle: `
      div.${prefix}suggest__class {
        list-style: none;
        cursor: pointer;
        display: inline-block;
      }
      .${prefix}suggest__count {
        vertical-align: baseline;
        font-size: x-small;
      }
    `,
  },  ...opts };

  function update(show, filter = '') {
    options.enablePerformance ?? console.time('update')
    options.enablePerformance ?? console.time('all-comps')
    // Get all the website components
    // Or [] if !options.enableCount
    const allComps = []
    if(options.enableCount) {
      editor.Pages.getAll()
        .forEach(page => {
          page.getMainComponent()
            .onAll((comp => allComps.push(comp)))
        })
    }
    options.enablePerformance ?? console.timeEnd('all-comps')
    // Get all the selectors
    const selectors = sm.getAll()
      .filter(sel => !sel.private && !sm.getSelected().includes(sel) && sel.getLabel().includes(filter))
    // Add the usage count
    const tags = options.enableCount ? selectors
      // count the number of times each css class is used
      .map(sel => ({
        sel,
        count: allComps.reduce((num, comp) => comp.getClasses().includes(sel.id) ? num+1 : num, 0),
      }))
      .sort((first, second) => second.count - first.count)
      // Keep only classes which are in use
      .filter(({sel, count}) => count > 0)
      // No counting
      : selectors.map(sel => ({sel, count: 0}))
    // Render the UI
    render(html`
    <div
      class="${prefix}suggest ${prefix}one-bg"
      style=${styleMap({
        opacity: show ? '1' : '0',
        'pointer-events': show ? 'initial' : 'none',
      })}
    >
      ${ tags
        // same structure as the tags in the input field
        .map(({sel, count}) => html`
          <div
            data-sel-id=${sel.id}
            class="${prefix}clm-tag ${prefix}three-bg ${prefix}suggest__class"
            @mousedown=${() => select(sel.id)}
          >
            <span data-tag-name="">${sel.getLabel()}</span>
            ${ options.enableCount ? html`<span class="${prefix}clm-tag-status ${prefix}suggest__count" data-tag-status="">${count}</span>` : ''}
          </div>
        `) 
      }
    </div>
  `, listEl);
    options.enablePerformance ?? console.timeEnd('update')
  }

  function select(selId) {
    options.enablePerformance ?? console.time('select')
    const selector = sm.getAll().find(s => s.id === selId);
    sm.addSelected(selector);
    options.enablePerformance ?? console.timeEnd('select')
  }

  editor.on('load', () => {
    // build the UI
    const tags = editor.getContainer().querySelector(`#${prefix}clm-tags-field`);
    const input = tags.querySelector(`#${prefix}clm-new`);
    tags.parentNode.insertBefore(listEl, tags.nextSibling);
    const styleEl = document.createElement('style');
    styleEl.innerHTML = options.containerStyle + options.tagStyle;
    document.head.appendChild(styleEl);
    // bind to events
    input.addEventListener('blur', () => update(false));
    input.addEventListener('focus', () => update(true, input.value));
    editor.on('selector', () => update(false));
    input.addEventListener('keyup', () => update(true, input.value));
  })
};
