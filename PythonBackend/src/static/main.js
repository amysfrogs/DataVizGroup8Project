var width = Math.max(document.documentElement.clientWidth-200, window.innerWidth-200 || 0),
    height = Math.max(document.documentElement.clientHeight+200, window.innerHeight || 0);

$('#yearSelector').on('change', function (i) {
    selectedYear = $('#yearSelector').find(":selected").text();

    Promise.all([
        d3.json("./data/worldMap"),
        d3.csv("./data/facts/year/" + selectedYear)
    ]).then(d => {
        const world = d[0];
        const data = d[1];
        drawMap(world, data);
        d3.select('#dualAxisLC').html("");
        d3.select('#barChart').html("");
        d3.select('#singleAxisLC').html("");

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
        .scale(250)
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
                .style('opacity', 0.6)
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
                if(data[0].length !== 0) {
                populateSelectedCountryDiv(selectedCountry, data[1][0]['Happiness rank'])
                drawDualAxisLineChart(data[0], selectedCountry);
                drawBarChart(data[1], selectedCountry);
                drawSingleAxisLineChart(data[0], selectedCountry);
                drawLegend();
                }
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

function populateSelectedCountryDiv(selectedCountry, rank) {
    d3.select('#selCountry').html("<div class=\"selCon\">Selected Country: <strong>" + selectedCountry + 
    "</strong> Happiness Rank: <strong>" + rank + "</strong>" +
    "<div>");
}

function drawDualAxisLineChart(data, selectedCountry) {
    d3.select('#dualAxisLC').html("");

    var margin = { top: 50, right: 10, bottom: 5, left: 50 },
        svgWidth = 500, svgHeight = 270,
        dualAxisWidth = svgWidth - margin.left - margin.right,
        dualAxisHeight = svgHeight - margin.top - margin.bottom;

    //SVG for dualAxis graph
    const svg =  d3.select('#dualAxisLC')
    .append('svg')
    //.attr('width', dualAxisWidth)
    //.attr('height', dualAxisHeight)
    .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const dualAxis = svg
        .append('g')
        .attr('transform', 'translate(' + 0 + "," + 0 + ")")
        
        ;

    svg.append('text')
        .attr('x', svgWidth / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .text('Homicide Rate vs. Happiness Rank of ' + selectedCountry + ' across Years')

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

    const y2AxisTicks = y2Scale.ticks().filter(tick => Number.isInteger(tick));

    //add axis generators
    const xAxis = d3.axisTop().scale(xScale).ticks(5).tickFormat(d3.format("d"));
    const y1Axis = d3.axisLeft().scale(y1Scale);
    const y2Axis = d3.axisRight().scale(y2Scale).tickValues(y2AxisTicks).tickFormat(d3.format('d'));

    //append x axis
    dualAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', "translate(0," + y1Scale(0) + ")")
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '1em')
        .attr('dy', '2em')
        //.attr('transform', 'rotate(-65)')

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
        .attr('x', (dualAxisWidth+margin.left) / 2)
        .attr('y', dualAxisHeight+30)
        .text('Year')
        
    dualAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', -((dualAxisHeight - margin.bottom) / 2) + 5)
        .attr('y', 10)
        .text('Homicide Rate')

    dualAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', -((dualAxisHeight - margin.bottom) / 2) + 20)
        .attr('y', (margin.left + y2AxisShift) + 5)
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
        .attr('stroke', '#ee6666')
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
        .attr('stroke', '#5470c6')
        .attr('stroke-width', 2);

}

function drawBarChart(data, selectedCountry) {

    d3.select('#barChart').html("");

    const barColumns = ['GDP per capita', 'Social support Index', 'Healthy life expectancy', 
    'Freedom Index', 'Generosity Index', 'Corruption Index', 'RateOfHomicides']

    const barColors = ['#5470c6', '#91cc75', '#fac858', '#73c0de', '#fc8452', '#9a60b4', '#ee6666']

    const barChartData = [];
    let xMax = 0;
    
    for( idx in barColumns) {
        obj = {}
        obj[barColumns[idx]] = data[0][barColumns[idx]];
        obj['color'] = barColors[idx];
        barChartData.push(obj);

        if(data[0][barColumns[idx]] > xMax) {
            xMax = data[0][barColumns[idx]];
        }
    }

    var margin = { top: 40, right: 30, bottom: 20, left: 120 },
        svgWidth = 500, svgHeight = 150,
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#barChart")
        .append("svg")
        //.attr("width", width + margin.left + margin.right)
        //.attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, width]);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
    svg.append('text')
        .attr('x', svgWidth / 2-100)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .text('Various Indices of ' + selectedCountry + ' for Year: ' + selectedYear)

    /*svg.append('text')
        .attr('x', svgWidth / 2-100)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .text('Various Indices of ' + selectedCountry + ' with Happiness Rank of ' + data[0]['Happiness rank'] + ' for Year: ' + selectedYear)*/

    // Y axis
    var y = d3.scaleBand()
        .range([0, height])
        .domain(barColumns.map(d => d))
        .padding(.4);
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
        .attr("fill", d => d.color)
        .on('mouseenter', function (actual, i) {
            d3.select(this).attr('opacity', 0.5)
        })
        .on('mouseleave', function (actual, i) {
            d3.select(this).attr('opacity', 1)
        })

}

function drawSingleAxisLineChart(data, selectedCountry) {
    d3.select('#singleAxisLC').html("");

    var margin = { top: 50, right: 10, bottom: 5, left: 50 },
        svgWidth = 500, svgHeight = 270,
        singleAxisWidth = svgWidth - margin.left - margin.right,
        singleAxisHeight = svgHeight - margin.top - margin.bottom;

    //SVG for singleAxis graph
    const svg = d3.select('#singleAxisLC')
        .append('svg')
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const singleAxis = svg
        .append('g')
        .attr('transform', 'translate(' + 0 + "," + 0 + ")");

    svg.append('text')
        .attr('x', svgWidth / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .text('Various Indices of ' + selectedCountry + ' across Years')

    data.forEach(d => {
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

    //find min and max for use with scales
    const year_min_max = d3.extent(data, d => d.Year)
    const vals_max = d3.max(data, function (d) {
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
    const vals_min_max = [0, vals_max]

    //add scales
    const xScale = d3.scaleLinear()
        .domain(year_min_max)
        .range([margin.left, `${singleAxisWidth}` - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(vals_min_max)
        .range([`${singleAxisHeight}` - margin.bottom, margin.top]);

    //add axis generators
    const xAxis = d3.axisTop().scale(xScale).ticks(5).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft().scale(yScale);

    //append x axis
    singleAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', "translate(0," + yScale(0) + ")")
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '1em')
        .attr('dy', '2em')

    //append y axis
    singleAxis.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis)

    //add axis labels for x
    singleAxis.append('text')
        .attr('class', 'axisLabel')
        .attr('text-anchor', 'end')
        .attr('x', (singleAxisWidth+margin.left) / 2)
        .attr('y', singleAxisHeight+30)
        .text('Year')

    //line generators
    const lineGenGDP = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['GDP per capita']))
    const lineGenSocial = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['Social support Index']))
    const lineGenHealth = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['Healthy life expectancy']))
    const lineGenFree = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['Freedom Index']))
    const lineGenGen = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['Generosity Index']))
    const lineGenCorr = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['Corruption Index']))
    const lineGenCrime = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d['RateOfHomicides']))

    //Bind data and add path elements for each line
    const lineChartGDP = singleAxis.append('g')
        .attr('class', 'GDPLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenGDP(d))
        .attr('fill', 'none')
        .attr('stroke', '#5470c6')
        .attr('stroke-width', 2)
    const lineChartSocial = singleAxis.append('g')
        .attr('class', 'SocialLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenSocial(d))
        .attr('fill', 'none')
        .attr('stroke', '#91cc75')
        .attr('stroke-width', 2)
    const lineChartHealth = singleAxis.append('g')
        .attr('class', 'HealthLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenHealth(d))
        .attr('fill', 'none')
        .attr('stroke', '#fac858')
        .attr('stroke-width', 2)
    const lineChartFree = singleAxis.append('g')
        .attr('class', 'FreeLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenFree(d))
        .attr('fill', 'none')
        .attr('stroke', '#73c0de')
        .attr('stroke-width', 2)
    const lineChartGen = singleAxis.append('g')
        .attr('class', 'GenLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenGen(d))
        .attr('fill', 'none')
        .attr('stroke', '#fc8452')
        .attr('stroke-width', 2)
    const lineChartCorr = singleAxis.append('g')
        .attr('class', 'CorrLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenCorr(d))
        .attr('fill', 'none')
        .attr('stroke', '#9a60b4')
        .attr('stroke-width', 2)
    const lineChartCrime = singleAxis.append('g')
        .attr('class', 'CrimeLine')
        .selectAll('lines')
        .data([data])
        .enter()
        .append('path')
        .attr('d', d => lineGenCrime(d))
        .attr('fill', 'none')
        .attr('stroke', '#ee6666')
        .attr('stroke-width', 2)

}

function drawLegend() {
    d3.select('#legend').html("");

    var margin = { top: 10, right: 20, bottom: 10, left: 20 },
        svgWidth = 200, svgHeight = 150,
        legendWidth = svgWidth - margin.left - margin.right,
        legendHeight = svgHeight - margin.top - margin.bottom;

    let palette = ['#5470c6', '#91cc75', '#fac858', '#73c0de', '#fc8452', '#9a60b4', '#ee6666'];
    let varNames = ['GDP per capita', 'Social support Index', 'Healthy life expectancy',
    'Freedom Index', 'Generosity Index', 'Corruption Index', 'RateOfHomicides'];
    let color = d3.scaleOrdinal(palette).domain(varNames);

    //SVG for singleAxis graph
    const svg = d3.select('#legend')
        .append('svg')
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const legend = svg.append('g')
        .attr('transform', 'translate(20, 0)');

    const size = 10;
    const border_padding = 15;
    const item_padding = 5;
    const text_offset = 2;
    //border
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'none')
        .style('stroke-width', 1)
        .style('stroke', 'black');
    //boxes
    legend.selectAll('boxes')
        .data(varNames)
        .enter()
        .append('rect')
            .attr('x', border_padding)
            .attr('y', (d, i) => border_padding + (i * (size + item_padding)))
            .attr('width', size)
            .attr('height', size)
            .style('fill', (d) => color(d));
    //labels
    legend.selectAll('labels')
        .data(varNames)
        .enter()
        .append('text')
            .attr('x', border_padding + size + item_padding)
            .attr('y', (d, i) => border_padding + i * (size + item_padding) + (size / 2) + text_offset)
            .text((d) => d)
            .attr('text-anchor', 'left')
            .style('alignment-baseline', 'middle')
            .style('font-family', 'Roboto, RobotoDraft, Helvetica, Arial, sans-serif')
            .style('font-size', '7px');
}