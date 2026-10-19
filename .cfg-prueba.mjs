const { default: config } = await import('./astro.config.mjs');
const r = await config.markdown.processor.createRenderer({ smartypants: true });
console.log((await r.render('Hola <img src=x onerror="alert(1)">\n\n[clic](javascript:alert(3)) y "comillas"\n\n## Un título', {})).code);
