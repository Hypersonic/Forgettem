function run() {
    var img = document.getElementById('imgsrc');
    // run this again soon if the image isn't loaded yet
    // HACK: !!!
    if (!img.complete) {
        setTimeout(run, 10);
        return;
    }
    var src = document.getElementById('src');
    var wip = document.getElementById('wip');
    var dst = document.getElementById('dst');
    src.width = img.width;
    src.height = img.height;
    wip.width = img.width;
    wip.height = img.height;
    dst.width = img.width;
    dst.height = img.height;
    console.log("width: " + src.width + " height: " + src.height);
    var srcctx = src.getContext('2d');
    var wipctx = wip.getContext('2d');
    var dstctx = dst.getContext('2d');

    // Draw image
    srcctx.drawImage(img, 0, 0);

    // Test filling with primary colors
    //srcctx.fillStyle = '#ff0000';
    //srcctx.fillRect(0, 0, 200, 200);
    //srcctx.fillStyle = '#00ff00';
    //srcctx.fillRect(200, 0, 200, 200);
    //srcctx.fillStyle = '#0000ff';
    //srcctx.fillRect(0, 200, 200, 200);
    //srcctx.fillStyle = '#000000';
    //srcctx.fillRect(200, 200, 200, 200);

}

function shrink() {
    var src = document.getElementById('src');
    var wip = document.getElementById('wip');
    var dst = document.getElementById('dst');
    var srcctx = src.getContext('2d');
    var wipctx = wip.getContext('2d');
    var dstctx = dst.getContext('2d');
    var imgdata = srcctx.getImageData(0, 0, src.width, src.height);

    var seam;
    var seam_img;
    src.width-=1;
    wip.width-=1;
    dst.width-=1;
    var nrgimg = energyFunction(imgdata);
    wipctx.putImageData(nrgimg, 0, 0);

    seam = findSeams(nrgimg);
    seam_img = dstctx.createImageData(dst.width, dst.height);
    console.log(seam_img);
    for (var y = 0; y < seam_img.height; y++) {
        var hitSeam = false;
        for (var x = 0; x < seam_img.width; x++) {
            if (seam[y] === x) hitSeam = true;
            seam_img.data[pixelIndex(seam_img, x, y)  ] = imgdata.data[pixelIndex(imgdata, hitSeam ? x + 1 : x, y)  ];
            seam_img.data[pixelIndex(seam_img, x, y)+1] = imgdata.data[pixelIndex(imgdata, hitSeam ? x + 1 : x, y)+1];
            seam_img.data[pixelIndex(seam_img, x, y)+2] = imgdata.data[pixelIndex(imgdata, hitSeam ? x + 1 : x, y)+2];
            seam_img.data[pixelIndex(seam_img, x, y)+3] = imgdata.data[pixelIndex(imgdata, hitSeam ? x + 1 : x, y)+3];
        }
    }
    srcctx.putImageData(seam_img, 0, 0);
    // draw seam
    for (var y = 0; y < seam.length; y++) {
        seam_img.data[pixelIndex(seam_img, seam[y], y)  ] = 255;
        seam_img.data[pixelIndex(seam_img, seam[y], y)+1] = 0;
        seam_img.data[pixelIndex(seam_img, seam[y], y)+2] = 0;
        seam_img.data[pixelIndex(seam_img, seam[y], y)+3] = 255;
    }
    dstctx.putImageData(seam_img, 0, 0);

}

// Return an ImageData where each pixel has an energy value (R, G, B are all set the same)
function energyFunction(imgdata) {
    // Effectively get the pixel, clamped into range, for the Sobel operator
    function getSobelPixel(imgdata, x, y) {
        if (x < 0) {
            x = 0;
        } else if (x >= imgdata.width) {
            x = imgdata.width - 1;
        }

        if (y < 0) {
            y = 0;
        } else if (y >= imgdata.height) {
            y = imgdata.height - 1;
        }
        var px = getPixel(imgdata, x, y);
        return (px.r + px.g + px.b) / 4;
    }

    function getSobelEnergy(imgdata, x, y) {
        var pixels = [];

        pixels.push(getSobelPixel(imgdata, x - 1, y - 1));
        pixels.push(getSobelPixel(imgdata, x, y - 1));
        pixels.push(getSobelPixel(imgdata, x + 1, y - 1));
        pixels.push(getSobelPixel(imgdata, x + 1, y));
        pixels.push(getSobelPixel(imgdata, x, y));
        pixels.push(getSobelPixel(imgdata, x + 1, y));
        pixels.push(getSobelPixel(imgdata, x - 1, y + 1));
        pixels.push(getSobelPixel(imgdata, x, y + 1));
        pixels.push(getSobelPixel(imgdata, x + 1, y + 1));

        var xSobel = pixels[0] + (pixels[1] + pixels[1]) + pixels[2] - pixels[6] - (pixels[7] + pixels[7]) - pixels[8];
        var ySobel = pixels[2] + (pixels[5] + pixels[5]) + pixels[8] - pixels[0] - (pixels[3] + pixels[3]) - pixels[6];

        var sobel = Math.sqrt((xSobel * xSobel) + (ySobel * ySobel));

        if (sobel > 255)
        {
            sobel = 255;
        }

        return sobel;
    }

    var nrgimg = document.createElement('canvas').getContext('2d').createImageData(imgdata.width, imgdata.height);

    for (var ix = 0; ix < imgdata.width; ix++) {
        for (var iy = 0; iy < imgdata.height; iy++) {
            // R, G, B channels
            for (var k = 0; k < 3; k++) {
                nrgimg.data[pixelIndex(nrgimg, ix, iy) + k] = getSobelEnergy(imgdata, ix, iy);
            }
            nrgimg.data[pixelIndex(nrgimg, ix, iy) + 3] = 255; // alpha channel
        }
    }

    return nrgimg;
}

function findSeams(nrgimg) {
    function minIndex(row) {
        var index = 0;
        for (var i = 0; i < row.length; i++) {
            if (row[index] > row[i])
                index = i;
        }
        return index;
    }
    var idxes = [];
    var sum_nrg = [];
    for (var y = 0; y < nrgimg.height; y++) {
        var idxrow = [];
        var row = [];
        for (var x = 0; x < nrgimg.width; x++) {
            var pt = nrgimg.data[pixelIndex(nrgimg, x, y)];
            var idx = 0;
            if (y > 1) {
                var choices = [];
                if (x == 0) {
                    choices = [Math.INT_MAX, sum_nrg[y-1][x], sum_nrg[y-1][x+1]];
                } else if (x == nrgimg.width - 1) {
                    choices = [sum_nrg[y-1][x-1], sum_nrg[y-1][x], Math.INT_MAX];
                } else {
                    choices = [sum_nrg[y-1][x-1], sum_nrg[y-1][x], sum_nrg[y-1][x+1]];
                }
                var idx = minIndex(choices) - 1;
            }
            idxrow.push(idx)
            row.push(pt);
        }
        idxes.push(idxrow);
        sum_nrg.push(row);
    }
    var wipsum = document.getElementById('wipsum');
    var ctx = wipsum.getContext('2d');
    var img = ctx.createImageData(sum_nrg.length, sum_nrg[0].length);
    for (var y = 0; y < nrgimg.height; y++) {
        for (var x = 0; x < nrgimg.width; x++) {
            img.data[pixelIndex(img, x, y)    ] = sum_nrg[y][x] * (idxes[y][x] == -1) ? 1 : 0;
            img.data[pixelIndex(img, x, y) + 1] = sum_nrg[y][x] * (idxes[y][x] ==  0) ? 1 : 0;
            img.data[pixelIndex(img, x, y) + 2] = sum_nrg[y][x] * (idxes[y][x] ==  1) ? 1 : 0;
            img.data[pixelIndex(img, x, y) + 3] = 255;
        }
    }
    wipsum.width = nrgimg.width;
    wipsum.height = nrgimg.height;
    ctx.putImageData(img, 0, 0);
    var seam = [
        minIndex(sum_nrg[nrgimg.height-1])
    ];
    console.log(seam[0]);
    for (var i = nrgimg.height-2; i >= 0; i--) {
        var prev_seam = seam[seam.length - 1];

        var slicemin = Math.max(0, prev_seam - 1);
        var slicemax = Math.min(seam.length - 1, prev_seam + 2);
        var dx = idxes[i][prev_seam];

        seam.push(prev_seam + dx);
    }
    return seam.reverse();
}

function pixelIndex(imgdata, x, y) {
    return 4 * ((imgdata.width * y) + x);
}

function getPixel(imgdata, x, y) {
    var index = pixelIndex(imgdata, x, y);
    return {
        x: x,
        y: y,
        r: imgdata.data[index],
        g: imgdata.data[index+1],
        b: imgdata.data[index+2],
        a: imgdata.data[index+3],
    };
}
