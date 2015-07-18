var WIDTH = HEIGHT = 300;
var BUFFER = 20
var LINE_WIDTH = 3;
var DATA_DIR = 'data/';

var containers = [];
var levels;

d3.text('./fileList.txt', function(err, data) {
  var names = _.compact(data.split('\n'));
  var groups = _.groupBy(names, function(x) {
    return x.match(/tri\.(\d+)\.csv/)[1];
  });
  levelsNames = _.sortBy(Object.keys(groups), function(g) {
    return Number(g);
  });
  levels = _.map(levelsNames, Number);
  for (var i = 0; i < levelsNames.length; i++) {
    var level = levelsNames[i];
    var name_set = groups[level];

    (function getFiles(j) {
      var q = queue();
      _.each(name_set, function(name) {
        q = q.defer(d3.text, DATA_DIR + name);
      });
      q.awaitAll(function(err, datas) {
        if (err) {
          console.log(err);
          return;
        }
        datas = _.map(datas, convertToEdgeList);
        datas = _.flatten(datas);
        containers.push(plotLines(datas, j));
      });
    })(i);
  }
});

function plotLines(lines, thresholdIndex) {
  var numberOfLines = _.filter(lines, function(x) {
    return x.type == 'real'
  }).length;
  var cleanLines = convertStringFieldsToNumbers(lines);
  var extents = getExtents(cleanLines);

  var xScale = d3.scale.linear()
    .domain(extents.x)
    .range([BUFFER, WIDTH - BUFFER]);
  var yScale = d3.scale.linear()
    .domain(extents.y)
    .range([HEIGHT - BUFFER, BUFFER]);

  var unitsPerPixel = (extents.x[1] - extents.x[0]) / (WIDTH - 2 * BUFFER);

  var thresholdFraction = levels[thresholdIndex] / unitsPerPixel;

  var zoom = d3.behavior.zoom()
    .x(xScale).y(yScale).scaleExtent([1, 10000])
    .on('zoom', zoomed);

  var svg = d3.select('body').append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .call(zoom);

  var container = svg.append('g');

  container.selectAll('line')
    .data(cleanLines)
    .enter()
    .append('line')
    .attr('x1', function(line) {
      return xScale(line.x1);
    })
    .attr('y1', function(line) {
      return yScale(line.y1);
    })
    .attr('x2', function(line) {
      return xScale(line.x2);
    })
    .attr('y2', function(line) {
      return yScale(line.y2);
    })
    .attr('class', function(line) {
      return line.type;
    });

  var message = numberOfLines + ' lines ';
  message += '(' + (levels[thresholdIndex] / unitsPerPixel) + ')';
  svg.append('text')
    .attr('transform', 'translate(5,20)')
    .text(message);

  function zoomed() {
    _.each(containers, function(cont) {
      cont.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
      cont.selectAll('.virtual').style('stroke-width', LINE_WIDTH / d3.event.scale);
      cont.selectAll('.real').style('stroke-width', LINE_WIDTH / d3.event.scale);
    })
  }

  return container;
}

function convertStringFieldsToNumbers(lines) {
  return _.map(lines, function(line) {
    var converted = {
      x1: Number(line.x1),
      x2: Number(line.x2),
      y1: Number(line.y1),
      y2: Number(line.y2),
      type: line.type
    };
    return converted;
  });
}

function getExtents(lines) {
  var xMax = d3.max(lines, function(line) {
    return Math.max(line.x1, line.x2);
  });
  var yMax = d3.max(lines, function(line) {
    return Math.max(line.y1, line.y2);
  });
  var xMin = d3.min(lines, function(line) {
    return Math.min(line.x1, line.x2);
  });
  var yMin = d3.min(lines, function(line) {
    return Math.min(line.y1, line.y2);
  });
  return {
    x: [xMin, xMax],
    y: [yMin, yMax]
  };
}

