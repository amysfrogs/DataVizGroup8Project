var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

var svg = d3.select("body")
    .append("svg")
    .style("cursor", "move");

svg.attr("viewBox", "50 10 " + width + " " + height)
    .attr("preserveAspectRatio", "xMinYMin");

var zoom = d3.zoom()
    .on("zoom", function () {
        var transform = d3.zoomTransform(this);
        map.attr("transform", transform);
    });

var selectedYear = "2018";  
var selectedTopN = 1000;    

svg.call(zoom);

var map = svg.append("g")
    .attr("class", "map");

d3.queue()
    .defer(d3.json, "./data/50m.json")
    .defer(d3.csv, "./data/ConsolidatedHappiness.csv")
    .await(function (error, world, data) {
        if (error) {
            console.error('Oh dear, something went wrong: ' + error);
        }
        else {
            drawMap(world, data);
        }
    });

function drawMap(world, data) {
    // geoMercator projection
    var projection = d3.geoMercator() //d3.geoOrthographic()
        .scale(130)
        .translate([width / 2, height / 1.5]);

    // geoPath projection
    var path = d3.geoPath().projection(projection);

    

    var features = topojson.feature(world, world.objects.countries).features;
    var details = {};
    var minRank = 0;
    var maxRank = 0;

    data.forEach(function (d) {
        if(d.Year === selectedYear) {

            if(d['Happiness rank'] <= selectedTopN) {
                details[d['Country or region']] = {
                    rank: +d['Happiness rank'],
                    score: +d['Score']
                }
            }
        
            if(minRank > d['Happiness rank'])
                minRank = d['Happiness rank'];

            if(maxRank < d['Happiness rank'])
                maxRank = d['Happiness rank'];
        }
    });

    topNSliderHtml = '<input id="topNSlider" data-slider-id="topNSlider" type="text" data-slider-min="' + minRank + '"' +
    'data-slider-max="' + maxRank + '" data-slider-step="1" data-slider-value="' + selectedTopN + '"/>';

    d3.select('.topNSlider').html(topNSliderHtml); 
    
    if(selectedTopN < maxRank)
        maxRank = selectedTopN;

    //colors for metrics
    var colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateRgb("darkgreen", "red"))
        .domain([minRank,maxRank]);

    features.forEach(function (d) {
        d.details = details[d.properties.name] ? details[d.properties.name] : {};
    });

    map.append("g")
        .selectAll("path")
        .data(features)
        .enter().append("path")
        .attr("name", function (d) {
            return d.properties.name;
        })
        .attr("id", function (d) {
            return d.id;
        })
        .attr("d", path)
        .style("fill", function (d) {
            return d.details && d.details.rank ? colorScale(d.details.rank) : undefined;
        })
        .text(function (d) {
            return d.details && d.details.rank ? d.details.rank : undefined;
        })
        .on('mouseover', function (d) {
            d3.select(this)
                .style("stroke", "darkgrey")
                .style("stroke-width", 1)
                .style("cursor", "pointer");

            d3.select(".country")
                .text(d.properties.name);

            d3.select(".rank")
                .text(d.details && d.details.rank && "Rank " + d.details.rank || "Rank: -");

            d3.select(".score")
                .text(d.details && d.details.score && "Score " + d.details.score || "Score: -");

            d3.select('.details')
                .style('visibility', "visible")
        })
        .on('mouseout', function (d) {
            d3.select(this)
                .style("stroke", null)
                .style("stroke-width", 0.25);

            d3.select('.details')
                .style('visibility', "hidden");
        });


    // With JQuery
    $('#topNSlider').slider({
        tooltip: 'always'
    });

    $('#topNSlider').on('change', function (d) {
        selectedTopN = d.value.newValue;
        drawMap(world, data);
    })

    $('#yearSelector').on('change', function (i) {
        selectedYear = $('#yearSelector').find(":selected").text();
        drawMap(world, data);
    })
}