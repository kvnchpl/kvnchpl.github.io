// Shared shell for newly added works. Existing authored pages keep their markup.
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function workPage(type, key, body = '') {
    const content = type === 'project'
        ? '<div id="content-page-container" class="project-content">\n        <!-- generated:project:start -->\n        <!-- generated:project:end -->\n        </div>'
        : `<pre class="writing-content">${escape(body)}</pre>`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <!-- generated:seo:start -->
    <!-- generated:seo:end -->
    <link rel="stylesheet" href="/css/fonts.css" />
    <link rel="stylesheet" href="/css/main.css?v=build" />
    <link rel="stylesheet" href="/css/field.css" />
    <link rel="icon" href="/favicon.ico" />
    <script defer src="/js/main.js?v=build"></script>
    <script defer src="/js/field.js"></script>
</head>
<body data-page="${key}" class="field-work">
    <!-- generated:nav:start -->
    <!-- generated:nav:end -->
    <main class="${type === 'project' ? 'project' : 'writing'}-layout">
        <!-- generated:page-header:start -->
        <!-- generated:page-header:end -->
        ${content}
        <!-- generated:return:start -->
        <!-- generated:return:end -->
    </main>
</body>
</html>
`;
}
