const target = process.env["RENDER_TARGET"];
if (!target) throw 'Environment variable RENDER_TARGET not set.';

// Forked from utility.js
function formatDate(date) {
    return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + (date.getDay() + 1) + " " +
        date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

const MarkdownIt = require('markdown-it'), fs = require('fs'), path = require('path');
const Highlight = require('highlight.js'), Cheerio = require('cheerio2');
const MarkdownItVideo = require('@zhufucdev/markdown-it-video');
let md = MarkdownIt({
    highlight: function (str, lang) {
        if (lang && Highlight.getLanguage(lang)) {
            return Highlight.highlight(lang, str).value
        }
        return ''
    }
}).use(MarkdownItVideo, {
    bilibili: {width: 640, height: 390}
});
let src = fs.readFileSync(path.join(target, 'content.md')).toString();
let html = md.render(src).trim();
const model = Cheerio.load(fs.readFileSync(path.join('site', 'blogView.html')).toString());
const header = JSON.parse(fs.readFileSync(path.join(target, 'header.json')).toString());
html = '<div class="card"> ' +
    '<div class="card-content"> ' +
    '<span class="card-title">' + header.title + '</span> ' +
    '<p style="line-height: 24px">' +
    '<p><i class="material-icons">copyright</i> CC BY-NC-SA 4.0</p>' +
    '<p><i class="material-icons">account_circle</i> zhufucdev原作</p>' +
    '<p><i class="material-icons">publish</i> 上传于' + formatDate(new Date(header["upload_time"] * 1000)) + '</p>' +
    '<p><i class="material-icons">create</i> 最后一次修改于' + formatDate(new Date(header["last_modified"] * 1000)) + '</p>' +
    '</p>' +
    '</div> </div>' +
    html;
model('div#article').html(html);
model('title').html(header.title + '——zhufucdev')
console.log(model.html());