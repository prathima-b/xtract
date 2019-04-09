const path = require('path');
const fs = require('fs');

let fileURL = path.resolve(__dirname, './assets/DefaultScreen.pdf'); // Local URL to the file to be rendered or processed
let pageNum = 1;    // Page number of the rendered page
let totalPages = 1; // Total page in the file
let pageIsRendering = false; // Flag fo pages currently rendering\
let pageNumPending = null;
let boxes = [];

const scale = 1.5;  // Scale of the dispalyed PDF
const canvas = document.querySelector('#pdf-display');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('draw-overlay');


// validateUrl: (path2file) => bool
// path2file: Contains an absolute path to othe file that is required to be validated
// Takes in file path and validates it as valid or nor
const validateUrl = (path2file) => {
    if(fs.existsSync(path2file)){
        if(path2file.endsWith('.pdf')){
            return 1
        }
    }
    return 0;
};
// console.log(validateUrl(fileURL));

// renderPage: (num) => void
// num: Takes in the page number of the page to be rendered
// Render page sketches the page on the canvas to display on the frontend
const renderPage = (num) => {
    pageIsRendering = true;
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({scale});
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        overlay.style.height = canvas.height + 'px';
        overlay.style.width = canvas.width + 'px';

        const renderCtx = {
            canvasContext: ctx,
            viewport
        }

        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            if(pageNumPending != null){
                setTimeout(renderPage(pageNumPending), 1000); // Fixes rendering glitch if pages change very fast
                pageNumPending = null;
            }
        });
        pageNum = num;
        document.querySelector('#current-page').textContent = ' ' + pageNum + ' '; 
    });
    // console.log(cumulativeOffset(canvas))
    initDraw(overlay);
};

// displayDoc: () => void
// Function to extract the PDF metadata and call render method
const displayDoc = () => {
    if(validateUrl(fileURL)){
        pdfjsLib.getDocument(fileURL).then(pdfDoc_ => {
            pdfDoc = pdfDoc_;
            totalPages = pdfDoc.numPages;
            document.querySelector('#total-pages').textContent = ' ' + totalPages + ' ';
            pageNum = 1;
            renderPage(pageNum);
        });
    }
};

// Event listener for previous-page button
document.querySelector('#prev-page').addEventListener('click', () => {
    if(pageNum == 1){
        window.alert('You have reached the first page! \n Please wait a few seconds if your page hasn\'t rendered yet');
    }
    else{
        --pageNum;
        renderPage(pageNum);
    }
});

// Event listener for next-page button
document.querySelector('#next-page').addEventListener('click', () => {
    if(pageNum == totalPages){
        window.alert('You have reached the last page! \n Please wait a few seconds if your page hasn\'t rendered yet');
    }
    else{
        ++pageNum;
        renderPage(pageNum);
    }
});

document.querySelector('#dld-canvas').addEventListener('click', () => {
    console.log('here');
    var link = document.getElementById('hidden-download');
    link.setAttribute('download', 'MintyPaper.png');
    link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
    link.click();
    console.log('here');
});

// clearOverlay: () => void
// Clears all the existing boxes on the overlay
const clearOverlay = () => {
    boxes = [];
    const drawing = document.getElementById('draw-overlay');
    while(drawing.firstChild){
        drawing.removeChild(drawing.firstChild);
    }
};

// This function was stolen form: http://jsfiddle.net/d9BPz/546/ - slightly modified to enable rectangle resizing even during scoll action
// initdraw: (canvass) => void
// canvass: HTLM div element over which drawing is initialized
// Function to draw overlay rectangle on top of the dispalyed PDF file
function initDraw(canvass) {
    
    // setMousePosition: (e) => void
    // e: mouse event
    // Adjusts the cursor position
    function setMousePosition(e) {
        var ev = e || window.event; //Moz || IE
        if (ev.pageX) { //Moz
            mouse.x = ev.pageX + window.pageXOffset;
            mouse.y = ev.pageY + window.pageYOffset;
        } else if (ev.clientX) { //IE
            mouse.x = ev.clientX + document.body.scrollLeft;
            mouse.y = ev.clientY + document.body.scrollTop;
        }
    };

    var mouse = {
        x: 0,
        y: 0,
        startX: 0,
        startY: 0
    };
    var element = null;
    var initialOffset = 0

    canvass.onmousemove = function (e) {
        setMousePosition(e);
        if (element !== null) {
            element.style.width = Math.abs(mouse.x - mouse.startX) + 'px';
            element.style.height = Math.abs(mouse.y - window.pageYOffset + initialOffset - mouse.startY) + 'px';
            element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x + 'px' : mouse.startX + 'px';
            element.style.top = (mouse.y - mouse.startY < 0) ? mouse.y - window.pageYOffset + 'px' : mouse.startY - initialOffset + 'px';
        }
    }

    canvass.onclick = function (e) {
        if (element !== null) {
            element = null;
            canvass.style.cursor = "default";
            boxes.push([mouse.x/canvas.width * 100, (mouse.y - window.pageYOffset)/canvas.height * 100, mouse.startX/canvas.width * 100, (mouse.startY - initialOffset)/canvas.height * 100]);
            console.log(boxes);
            console.log(mouse);
        } else {
            mouse.startX = mouse.x;
            mouse.startY = mouse.y;
            initialOffset = window.pageYOffset;
            element = document.createElement('div');
            element.className = 'rectangle';
            element.style.left = mouse.x + 'px';
            element.style.top = (mouse.y - window.pageYOffset) + 'px';
            if(canvass.firstChild){
                canvass.removeChild(canvass.firstChild);
            }
            canvass.appendChild(element)
            canvass.style.cursor = "crosshair";
        }
    }
}

displayDoc();

const allowDrop = (e) => {
    e.preventDefault();
}

const dropHandler = (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer.items) {
        for (var i = 0; i < ev.dataTransfer.items.length; i++) {
            if (ev.dataTransfer.items[i].kind === 'file') {
                var file = ev.dataTransfer.items[i].getAsFile();
                var url_ = file.path;
                if(url_.endsWith('.pdf')){
                    fileURL = url_;
                    displayDoc();
                    break;
                }
                else {
                    window,alert('Only PDF files are supported as on now! If you haven\'t updated your software in a long time, update now');
                }
            }
        }
    }
}