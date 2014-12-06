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

    var imgdata = srcctx.getImageData(0, 0, src.width, src.height);

    var nrgimg = energyFunction(imgdata);
    wipctx.putImageData(nrgimg, 0, 0);

    var seam = findSeams(nrgimg);
    var seam_img = imgdata;
    for (var y = 0; y < seam.length; y++) {
        seam_img.data[pixelIndex(seam_img, seam[y], y)  ] = 255;
        seam_img.data[pixelIndex(seam_img, seam[y], y)+1] = 0;
        seam_img.data[pixelIndex(seam_img, seam[y], y)+2] = 0;
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
        return (px.r + px.g + px.b) / 3;
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
    var sum_nrg = [];
    for (var y = 0; y < nrgimg.height; y++) {
        var row = [];
        for (var x = 0; x < nrgimg.width; x++) {
            var pt = nrgimg.data[pixelIndex(nrgimg, x, y)];
            if (y > 1) {
                if (x == 0) {
                    pt += Math.min(sum_nrg[y-1][x], sum_nrg[y-1][x+1]);
                } else if (x == nrgimg.width - 1) {
                    pt += Math.min(sum_nrg[y-1][x-1], sum_nrg[y-1][x]);
                } else {
                    pt += Math.min(sum_nrg[y-1][x-1], sum_nrg[y-1][x], sum_nrg[y-1][x+1]);
                }
            }
            // focus that area
            if (100 < x && x < 200) {
                pt = 0;
            }
            row.push(pt);
        }
        sum_nrg.push(row);
    }
    function minIndex(row) {
        var index = 0;
        for (var i = 0; i < row.length; i++) {
            if (row[index] >= row[i])
                index = i;
        }
        return index;
    }
    var seam = [
        minIndex(sum_nrg[nrgimg.height-1])
    ];
    console.log(seam);
    for (var i = nrgimg.height-2; i >= 0; i--) {
        var prev_seam = seam[seam.length - 1];
        console.log(prev_seam);
        seam.push(prev_seam - 1 + minIndex(sum_nrg[i].slice(
                                            Math.max(0, prev_seam - 1),
                                            Math.min(seam.length - 1, prev_seam + 2)
                                           )
                          )
                );
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
