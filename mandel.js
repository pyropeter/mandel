function genX1(x, y, x0) {
  return Math.pow(x, 2) - Math.pow(y, 2) + x0
}

function genY1(x, y, y0) {
  return 2 * x * y + y0
}

function genC(x1, y1) {
  return Math.pow((Math.pow(x1, 2) + Math.pow(y1, 2)), 0.5)
}

function getDepth(x0, y0, iter) {
  x = x0
  y = y0
  c = 0

  for (co = 1 ; co <= iter; co++) {
    x1 = genX1(x, y, x0)
    y1 = genY1(x, y, y0)
    x = x1
    y = y1
    c = genC(x1, y1)
    if (c > 2) {
      return co
    }
  }
  return 0
}

function setPixelHsl(dataPos, hue) {
	hue = hue % 360;
	var section = (hue % 180) / 60;
	var comp = (hue % 60) / 60 * 255;
	var sign = (hue < 180) ? 1 : -1;
	var offset = (hue < 180) ? 0 : 255;

	if (section < 1) {
		image.data[dataPos+0] = offset + sign * 255;
		image.data[dataPos+1] = offset + sign * comp;
		image.data[dataPos+2] = offset + sign * 0;
	} else if (section < 2) {
		image.data[dataPos+0] = offset + sign * (255-comp);
		image.data[dataPos+1] = offset + sign * 255;
		image.data[dataPos+2] = offset + sign * 0;
	} else {
		image.data[dataPos+0] = offset + sign * 0;
		image.data[dataPos+1] = offset + sign * 255;
		image.data[dataPos+2] = offset + sign * comp;
	}
}

function paintMandel(offsetX, offsetY, scale, cMax) {
	var inSet = 0;
	var startTime = new Date().getTime();

	for (var x = 0; x < image.width; x++) {
		for (var y = 0; y < image.height; y++) {
			var mandelX = (x + offsetX) * scale;
			var mandelY = (y + offsetY) * scale;
			var c = getDepth(mandelX, mandelY, cMax);
			var dataPos = (image.width * y + x) * 4;
			if (c != 0) {
				setPixelHsl(dataPos, c * colorFac);
			} else {
				image.data[dataPos+0] = 0;
				image.data[dataPos+1] = 0;
				image.data[dataPos+2] = 0;
				inSet++;
			}
		}
	}

	//var startTime = new Date().getTime();
	ctx.putImageData(image, 0,0);

	var endTime = new Date().getTime();
	var deltaTime = endTime - startTime;
	var inSetRatio = inSet / image.width / image.height * 100;
	console.log("Render took " + deltaTime + "ms; " + inSetRatio.toFixed(2)
			+ "% of all pixels are part of the set.");

	dragTotalX = 0;
	dragTotalY = 0;
}

function refresh() {
	if (renderTimeout)
			clearTimeout(renderTimeout);

	var offsetX = centerX - canvas.width / 2;
	var offsetY = centerY - canvas.height / 2;
	//paintMandel(offsetX, offsetY, scale, 20);
	renderTimeout = setTimeout(paintMandel, 100,
			offsetX, offsetY, scale, maxIter);
}

function fastZoom(factor, offX, offY) {
	var subWidth = canvas.width / factor;
	var subHeight = canvas.height / factor;
	var subOffX = (canvas.width - subWidth) / 2 + offX;
	var subOffY = (canvas.height - subHeight) / 2 + offY;
	var subImage = ctx.getImageData(subOffX, subOffY, subWidth, subHeight);
	
	for (var x = 0; x < canvas.width; x++) {
		for (var y = 0; y < canvas.height; y++) {
			var subX = Math.floor(x / factor);
			var subY = Math.floor(y / factor);
			var dataPos = (image.width * y + x) * 4;
			var subPos = (subImage.width * subY + subX) * 4;
			image.data[dataPos+0] = subImage.data[subPos+0];
			image.data[dataPos+1] = subImage.data[subPos+1];
			image.data[dataPos+2] = subImage.data[subPos+2];
		}
	}

	ctx.putImageData(image, 0,0);
}

function zoom(factor) {
	scale /= factor;
	centerX *= factor;
	centerY *= factor;

	refresh();
}

$(function () {
	if (typeof console == "undefined")
		console = {
			log: function (foo) {}
		};

	canvas = document.getElementById("foo")
	ctx = canvas.getContext("2d")
	ctx.fillStyle = "black";

	image = ctx.createImageData(canvas.width, canvas.height);
	for (var x = 0; x < image.width; x++) {
		for (var y = 0; y < image.height; y++) {
			var dataPos = (image.width * y + x) * 4;
			setPixelHsl(dataPos, x);
			image.data[dataPos+3] = 255;
		}
	}

	centerX = 0;
	centerY = 0;
	scale = 0.004;
  maxIter = 50
  zoomFac = 1.5
  colorFac = 20

	renderTimeout = null;
	dragX = null;
	dragY = null;
	dragTotalX = 0;
	dragTotalY = 0;

  sliders = {
    "colorFac" : {name:"Choose color wisely", min:1, max:360, step:1}
  }
  
  for (var slid in sliders) {
    $('#slider').append(
      $('<div>')
        .addClass("slid")
        .text(sliders[slid].name+": ")
        .append(
          $('<input>')
            .attr("type", "range")
            .attr("min", sliders[slid].min)
            .attr("max", sliders[slid].max)
            .change(function() {colorFac = this.valueAsNumber; refresh(); $(this).next().text("(" + this.valueAsNumber + ")")})
            .attr("step", sliders[slid].step)
            .attr("value", window[slid])
        )
        .append(
          $('<span>')
            .attr("class", "desc")
            .attr("id", sliders[slid].name+"Font")
            .text("(" + window[slid] + ")")
        )
    )
  }
  
	$('#foo').dblclick(function (e) {
		var offX = e.offsetX - canvas.width / 2;
		var offY = e.offsetY - canvas.height / 2;
		centerX += offX;
		centerY += offY;
		fastZoom(zoomFac, offX,offY);
		zoom(zoomFac);
	}).mousedown(function (e) {
		dragX = e.offsetX;
		dragY = e.offsetY;
		clearTimeout(renderTimeout);
	}).mousemove(function (e) {
		if (dragX == null) return;
		var moveX = e.offsetX - dragX;
		var moveY = e.offsetY - dragY;
		ctx.fillRect(0,0, canvas.width, canvas.height);
		ctx.putImageData(image, dragTotalX + moveX, dragTotalY + moveY);
	}).mouseup(function (e) {
		if (dragX == null) return;
		var moveX = e.offsetX - dragX;
		var moveY = e.offsetY - dragY;
		dragTotalX += moveX;
		dragTotalY += moveY;
		dragX = null;
		if (Math.pow(moveX, 2) + Math.pow(moveY, 2) > 4) {
			centerX -= moveX;
			centerY -= moveY;
			refresh();
		}
	});

	refresh();
	//ctx.putImageData(image, 0,0)
});


