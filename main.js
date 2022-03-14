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

Promise.all([
        d3.json("./data/50m.json"),
        d3.csv("./data/ConsolidatedHappiness.csv")
    ]).then(d => {
        const world = d[0]
        const data = d[1]
        drawMap(world, data);      
    })

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
                minRank = +d['Happiness rank'];

            if(maxRank < d['Happiness rank'])
                maxRank = +d['Happiness rank'];
        }
    });

    topNSliderHtml = '<input id="topNSlider" data-slider-id="topNSlider" type="text" data-slider-min="' + minRank + '"' +
    'data-slider-max="' + maxRank + '" data-slider-step="1" data-slider-value="' + selectedTopN + '"/>';

    d3.select('.topNSlider').html(topNSliderHtml); 

    //colors for metrics
    var colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateRgb("gold", "steelblue"))
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
//line chart of Happiness Score vs Crime Data for selected Country
const margin = {top: 10, left: 10, right: 20, bottom: 25}
const dualAxisWidth = (width / 2) - (margin.left + margin.right) ;
const dualAxisHeight = (height / 2) - (margin.top + margin.bottom);


/*var dualAxis = svg.append("g")
    .attr("class", "dualAxis")
    .attr('width', dualAxisWidth + margin.left + margin.right)
    .attr('height', dualAxisHeight + margin.top + margin.bottom)
    .append('g')
        .attr('transform', 'translate(' + (width * 0.75) + "," + margin.top + ")");
*/
const dualAxis = d3.select('body')
    .append('svg')
    .attr('width', dualAxisWidth + margin.left + margin.right)
    .attr('height', dualAxisHeight + margin.top + margin.bottom)
    //.attr("viewBox", (width/2) + " 10 " + dualAxisWidth + " " + dualAxisHeight)
    .append('g')
        .attr('transform', 'translate(' + margin.left + "," + margin.top + ")");

//file paths for data
const Happiness = "../data/ConsolidatedHappiness.csv"
const Crime = "../data/IntentionalHomicidesFormatted.csv"
//open files
Promise.all([
    d3.csv(Happiness),
    d3.csv(Crime)
]).then(data => {
    const happiness_data = data[0];
    const crime_data = data[1];
    //find min and max for use with scales
    const year_min_max = d3.extent(crime_data, d => new Date(d.Year))
    const crime_max = d3.max(crime_data, d => d.RateOfHomicides)
    const crime_min_max = [0, +crime_max]
    const happiness_min = d3.min(happiness_data, d => +d['Happiness rank'])
    const happiness_max = d3.max(happiness_data, d => +d['Happiness rank'])
    const happiness_min_max = [happiness_min, happiness_max]
    //add scales
    const xScale = d3.scaleTime()
        .domain(year_min_max)
        .range([margin.left, `${dualAxisWidth}` - margin.right]);
    const y1Scale = d3.scaleLinear()
        .domain(crime_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    const y2Scale = d3.scaleLinear()
        .domain(happiness_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    //add axis generators
    const xAxis = d3.axisBottom().scale(xScale);
    const y1Axis = d3.axisLeft().scale(y1Scale);
    const y2Axis = d3.axisRight().scale(y2Scale);
    //append x axis
    dualAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', "translate(0," + y1Scale(0) + ")")
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-65)')
    //append y1 axis
    dualAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(y1Axis)
    //append y2 axis
    const y2AxisShift = dualAxisWidth - margin.right
    dualAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + y2AxisShift + ', 0)')
        .call(y2Axis)


    

})