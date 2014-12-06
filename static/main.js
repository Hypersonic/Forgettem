function run() {
    var img = document.getElementById('imgsrc');
    // run this again soon if the image isn't loaded yet
    // HACK: !!!
    if (!img.complete) {
        setTimeout(run, 10);
        return;
    }
    var src = document.getElementById('src');
    var dst = document.getElementById('dst');
    src.width = img.width;
    src.height = img.height;
    dst.width = img.width;
    dst.height = img.height;
    console.log("width: " + src.width + " height: " + src.height);
    var srcctx = src.getContext('2d');
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

    console.log(imgdata);
    var nrgimg = energyFunction(imgdata);
    dstctx.putImageData(nrgimg, 0, 0);
    console.log(nrgimg);
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
            for (var k = 0; k < 3; k++) {
                nrgimg.data[pixelIndex(nrgimg, ix, iy) + k] = getSobelEnergy(imgdata, ix, iy);
            }
            nrgimg.data[pixelIndex(nrgimg, ix, iy) + 3] = 255;//getSobelEnergy(imgdata, ix, iy);
        }
    }

    return nrgimg;
}

function pixelIndex(imgdata, x, y) {
    return 4 * ((imgdata.width * y) + x);
}

function findSeam(imgdata) {
    // First we take the energy of the image
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
