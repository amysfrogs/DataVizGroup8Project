var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height = Math.max(document.documentElement.clientHeight - 130, window.innerHeight - 130 || 0);

$('#yearSelector').on('change', function (i) {
    selectedYear = $('#yearSelector').find(":selected").text();

    Promise.all([
        d3.json("./data/worldMap"),
        d3.csv("./data/facts/year/" + selectedYear)
    ]).then(d => {
        const world = d[0];
        const data = d[1];
        drawMap(world, data);
    })
})


var svg = d3.select("#worldMap")
    .append("svg")
    .style("cursor", "move");

svg.attr("viewBox", "50 10 " + width + " " + height)
    .attr("preserveAspectRatio", "xMinYMin");

var zoom = d3.zoom()
    .on("zoom", function () {
        var transform = d3.zoomTransform(this);
        map.attr("transform", transform);
    });

var selectedYear = $('#yearSelector').find(":selected").text();
var selectedTopN = 1000;

svg.call(zoom);

var map = svg.append("g")
    .attr("class", "map");

Promise.all([
    d3.json("./data/worldMap"),
    d3.csv("./data/facts/year/" + selectedYear)
]).then(d => {
    const world = d[0];
    const data = d[1];
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
        if (d.Year === selectedYear) {

            if (d['Happiness rank'] <= selectedTopN) {
                details[d['Country']] = {
                    rank: +d['Happiness rank'],
                    score: +d['Score']
                }
            }

            if (minRank > d['Happiness rank'])
                minRank = +d['Happiness rank'];

            if (maxRank < d['Happiness rank'])
                maxRank = +d['Happiness rank'];
        }
    });

    topNSliderHtml = '<input id="topNSlider" data-slider-id="topNSlider" type="text" data-slider-min="' + minRank + '"' +
        'data-slider-max="' + maxRank + '" data-slider-step="1" data-slider-value="' + selectedTopN + '"/>';

    d3.select('.topNSlider').html(topNSliderHtml);

    //colors for metrics
    var colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateRgb("gold", "steelblue"))
        .domain([minRank, maxRank]);

    features.forEach(function (d) {
        d.details = details[d.properties.name] ? details[d.properties.name] : {};
    });

    map.append("g")
        .attr('class', 'basemap')
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
        })
        .on('mouseout', function (d) {
            d3.select(this)
                .style("stroke", null)
                .style("stroke-width", 0.25)
                .style("opacity", 1);

        })
        .on('click', function (d, e) {

            const selectedCountry = e.properties.name;
            //file path for data
            const HappinessUrl = "./data/facts/country/" + selectedCountry
            const HappinessCurrentYearUrl = "./data/facts/year/" + selectedYear + "/country/" + selectedCountry
            //open files
            Promise.all([
                d3.csv(HappinessUrl),
                d3.csv(HappinessCurrentYearUrl)
            ]).then(data => {
                drawDualAxisLineChart(data[0], selectedCountry);
                //drawBarChart(data[1], selectedCountry);
                drawBarChart2(data[1], selectedCountry);
            })
        });

    // With JQuery
    $('#topNSlider').slider({
        tooltip: 'always'
    });

    $('#topNSlider').on('change', function (d) {
        selectedTopN = d.value.newValue;
        drawMap(world, data);
    })
}

function drawDualAxisLineChart(data, selectedCountry) {
    d3.select('#dualAxisLC').html("");
    d3.select('#dualAxisLC').html("<h5>Selected Country: <strong>" + selectedCountry + "</strong><h5>");

    const margin = { top: 20, left: 30, right: 30, bottom: 30 }
    const dualAxisWidth = (width / 2) - (margin.left + margin.right);
    const dualAxisHeight = (height / 2) - (margin.top + margin.bottom);

    //SVG for dualAxis graph
    const dualAxis = d3.select('#dualAxisLC')
        .append('svg')
        .attr('width', dualAxisWidth + margin.left + margin.right)
        .attr('height', dualAxisHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + "," + margin.top + ")");

    const happiness_data = data;
    //convert column formats for happiness data
    happiness_data.forEach(d => {
        d['Country'] = d['Country']
        d.Year = +d.Year;
        d['HappinessRank'] = +d['Happiness rank']
        d.Score = +d.Score
        d['GDP per capita'] = +d['GDP per capita']
        d['Social support Index'] = +d['Social support Index']
        d['Healthy life expectancy'] = +d['Healthy life expectancy']
        d['Freedom Index'] = +d['Freedom Index']
        d['Generosity Index'] = +d['Generosity Index']
        d['Corruption Index'] = +d['Corruption Index']
        d['NumberOfHomicides'] = +d['NumberOfHomicides']
        d['RateOfHomicides'] = +d['RateOfHomicides']
    })

    let selectedHappinessData = happiness_data.filter(function (a) { return a['Country'] === selectedCountry; });

    //find min and max for use with scales
    const year_min_max = d3.extent(happiness_data, d => +d.Year)
    const crime_max = d3.max(happiness_data, d => +d.RateOfHomicides)
    const crime_min_max = [0, +crime_max]
    const happiness_min_max = d3.extent(happiness_data, d => +d.HappinessRank)

    //add scales
    const xScale = d3.scaleLinear()
        .domain(year_min_max)
        .range([margin.left, `${dualAxisWidth}` - margin.right]);
    const y1Scale = d3.scaleLinear()
        .domain(crime_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    const y2Scale = d3.scaleLinear()
        .domain(happiness_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    //add axis generators
    const xAxis = d3.axisBottom().scale(xScale).ticks(5).tickFormat(d3.format("d"));
    const y1Axis = d3.axisLeft().scale(y1Scale);
    const y2Axis = d3.axisRight().scale(y2Scale);
    //append x axis
    dualAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', "translate(0," + y2Scale(0) + ")")
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
    //add axis labels
    dualAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('x', dualAxisWidth / 2)
        .attr('y', dualAxisHeight + margin.top + 10)
        .text('Year')
    dualAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', -((dualAxisHeight - margin.bottom) / 2))
        .attr('y', -margin.left + 20)
        .text('Crime Rate')
    dualAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', -((dualAxisHeight - margin.bottom - margin.top) / 2) + 20)
        .attr('y', (margin.left + y2AxisShift) + 25)
        .text('Happiness Rank')
    //line generator for crime
    const lineGenCrime = d3.line()
        .x(d => xScale(d.Year))
        .y(d => y1Scale(d.RateOfHomicides))
    //line generator for happiness
    const lineGenHappy = d3.line()
        .x(d => xScale(d.Year))
        .y(d => y2Scale(d.HappinessRank))
    //Bind data and add path elements for crime data
    const lineChartCrime = dualAxis.append('g')
        .attr('class', 'CrimeLine')
        .selectAll('lines')
        .data([selectedHappinessData])
        .enter()
        .append('path')
        .attr('d', d => lineGenCrime(d))
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
    //Bind data and add path elements for happiness data
    const lineChartHappy = dualAxis.append('g')
        .attr('class', 'HappyLine')
        .selectAll('lines')
        .data([selectedHappinessData])
        .enter()
        .append('path')
        .attr('d', d => lineGenHappy(d))
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2);

}

function drawBarChart(data, selectedCountry) {
    d3.select('#barChart').html("");
    //Charts for Happiness Score vs Crime Data for selected Country
    //constants for margins and widths for different charts
    const margin = { top: 20, left: 30, right: 30, bottom: 30 }
    const dualAxisWidth = (width / 2) - (margin.left + margin.right);
    const dualAxisHeight = (height / 2) - (margin.top + margin.bottom);
    const chartWidth = (width / 2) - (margin.left + margin.right);
    const chartHeight = (height / 2) - (margin.top + margin.bottom);

    //SVG for bar chart
    const barChart = d3.select('#barChart')
        .append('svg')
        .attr('width', chartWidth + margin.left + margin.right)
        .attr('height', chartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + "," + margin.top + ")");

    const happiness_data = data;
    //convert column formats for happiness data
    happiness_data.forEach(d => {
        d['Country'] = d['Country']
        d.Year = +d.Year;
        d['HappinessRank'] = +d['Happiness rank']
        d.Score = +d.Score
        d['GDP per capita'] = +d['GDP per capita']
        d['Social support Index'] = +d['Social support Index']
        d['Healthy life expectancy'] = +d['Healthy life expectancy']
        d['Freedom Index'] = +d['Freedom Index']
        d['Generosity Index'] = +d['Generosity Index']
        d['Corruption Index'] = +d['Corruption Index']
        d['NumberOfHomicides'] = +d['NumberOfHomicides']
        d['RateOfHomicides'] = +d['RateOfHomicides']
    })


    let selectedHappinessDataYear = happiness_data.filter(function (a) { return (a['Year'] === +selectedYear && a['Country'] === selectedCountry) });

    const barColumns = ['GDP per Capita', 'Social Suport Index', 'Healthy Life Expectancy', 'Freedom Index', 'Generosity Index', 'Corruption Index', 'Crime Rate per 100K']
    barData = {}
    for (var i = 0; i < selectedHappinessDataYear.length; i++) {

    }
    //find min and max for use with scales
    const year_min_max = d3.extent(happiness_data, d => +d.Year)
    const crime_max = d3.max(happiness_data, d => +d.RateOfHomicides)
    const crime_min_max = [0, +crime_max]
    const happiness_min_max = d3.extent(happiness_data, d => +d.HappinessRank)

    //add scales
    const xScale = d3.scaleLinear()
        .domain(year_min_max)
        .range([margin.left, `${dualAxisWidth}` - margin.right]);
    const y1Scale = d3.scaleLinear()
        .domain(crime_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    const y2Scale = d3.scaleLinear()
        .domain(happiness_min_max)
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    //add axis generators
    const xAxis = d3.axisBottom().scale(xScale).ticks(5).tickFormat(d3.format("d"));
    const y1Axis = d3.axisLeft().scale(y1Scale);
    const y2Axis = d3.axisRight().scale(y2Scale);

    //bar chart
    //find min and max vals for use in scales
    const xMax = d3.max(happiness_data, function (d) {
        return (Math.max(
            d['GDP per capita'],
            d['Social support Index'],
            d['Healthy life expectancy'],
            d['Freedom Index'],
            d['Generosity Index'],
            d['Corruption Index'],
            d['RateOfHomicides']
        ))
    })
    const xMin = d3.min(happiness_data, function (d) {
        return (Math.min(
            d['GDP per capita'],
            d['Social support Index'],
            d['Healthy life expectancy'],
            d['Freedom Index'],
            d['Generosity Index'],
            d['Corruption Index'],
            d['RateOfHomicides']
        ))
    })
    const xMinMax = [xMin, xMax]

    //create scales
    const xBarScale = d3.scaleLinear()
        .domain(xMinMax)
        .range([margin.left, `${dualAxisWidth}` - margin.right]);
    const yBarScale = d3.scaleLinear()
        .range([`${dualAxisHeight}` - margin.bottom, margin.top]);
    //add axis generators
    const xBarAxis = d3.axisBottom().scale(xBarScale);
    const yBarAxis = d3.axisLeft().scale(yBarScale).tickFormat('').tickSize(0);
    //add x axis
    barChart.append('g')
        .attr('class', 'axis')
        .attr('transform', "translate(0," + yBarScale(0) + ")")
        .call(xBarAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-65)')
    //append y axis
    barChart.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yBarAxis)
    //add x axis label
    barChart.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('x', dualAxisWidth / 2)
        .attr('y', dualAxisHeight + margin.top + 10)
        .text('Value')

    //bars
    barChart.selectAll('myRect')
        .data([barData])
        .enter()
        .append('rect')
        .attr('x', xBarScale(0))
        .attr('y', function (d) { return selectedHappinessDataYear.keys.length })
        .attr('width')
}

function drawBarChart2(data, selectedCountry) {

    d3.select('#barChart').html("");

    const barColumns = ['GDP per capita', 'Social support Index', 'Healthy life expectancy', 
    'Freedom Index', 'Generosity Index', 'Corruption Index', 'RateOfHomicides']

    const barChartData = [];
    
    for( idx in barColumns) {
        obj = {}
        obj[barColumns[idx]] = data[0][barColumns[idx]];
        barChartData.push(obj);
    }

    //console.log(barChartData)

    var margin = { top: 20, right: 30, bottom: 40, left: 90 },
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#barChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
        .domain([0, 2])
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    var y = d3.scaleBand()
        .range([0, height])
        .domain(barColumns.map(d => d))
        .padding(.1);
    svg.append("g")
        .call(d3.axisLeft(y))

    //Bars
    svg.selectAll("myRect")
        .data(barChartData)
        .enter()
        .append("rect")
        .attr("x", x(0))
        .attr("y", d => y(Object.keys(d)[0]))
        .attr("width", d => x(d[Object.keys(d)[0]]))
        .attr("height", y.bandwidth())
        .attr("fill", "#69b3a2")

}