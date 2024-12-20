let ctx = {
    WIDTH: 700,
    HEIGHT: 480,
};

const margin = { top: 20, right: 60, bottom: 60, left: 60 };

let pcaData, scaledData;

function initializeViz() {
    console.log("hi");
    d3.json('data/pca_data.json').then(data => {
        pcaData = data;
        drawScatterPlot(); 
        drawLoadingsPlot(); 
    });

    d3.json('data/data_rank_scaled.json').then(data => {
        scaledData = data;
        drawVarianceExplained(); 
    });

    d3.json('data/pc.json').then(data => {
        drawExplainedVarianceLineChart(data);
        drawPCABarChart(data);
    });
}

function drawScatterPlot() {
    const legendWidth = 20; 
    const legendHeight = 200;
    const width = ctx.WIDTH - margin.left - margin.right;
    const height = ctx.HEIGHT - margin.top - margin.bottom;

    console.log(d3.max(pcaData.scores, d => d["Daily Rank"])); 

    const svg = d3.select('#scatterPlotContainer').append('svg')
        .attr('width', ctx.WIDTH)
        .attr('height', ctx.HEIGHT)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(pcaData.scores, d => d.PC1))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(pcaData.scores, d => d.PC2))
        .range([height, 0]);

    const minRank = d3.min(pcaData.scores, d => d["Daily Rank"]);
    const maxRank = d3.max(pcaData.scores, d => d["Daily Rank"]);

    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([1, d3.max(pcaData.scores, d => d["Daily Rank"])]);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .call(d3.axisLeft(yScale));

    svg.selectAll('circle')
        .data(pcaData.scores)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.PC1))
        .attr('cy', d => yScale(d.PC2))
        .attr('r', 2)
        .attr('fill', d => colorScale(d["Daily Rank"]));

    svg.append("text")
        .attr("transform", "translate(" + (ctx.WIDTH / 2) + " ," + (ctx.HEIGHT - margin.bottom + 20) + ")")
        .style("text-anchor", "middle")
        .style("fill", "#888") 
        .text("1st Primary Component");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (ctx.HEIGHT / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "#888") 
        .text("2nd Primary Component");

    const legend = svg.append("g")
      .attr("transform", `translate(${ctx.WIDTH - 100}, ${height / 2 - legendHeight / 2})`);

    const numStops = 50;
    const legendRectHeight = legendHeight / numStops;
    Array.from({ length: numStops }, (_, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * legendRectHeight)
            .attr("width", legendWidth)
            .attr("height", legendRectHeight)
            .attr("fill", colorScale(minRank + (i / numStops) * (maxRank - minRank)));
    });

    const legendScale = d3.scaleLinear()
      .domain([minRank, maxRank])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(6)
      .tickValues([1, 10, 20, 30, 40, 50]);

    legend.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);
}

function drawVarianceExplained() {
    // 累积方差解释数据
}

function drawLoadingsPlot() {
    // 实现载荷图的绘制
}


function drawPCABarChart(data) {
    const features = Object.keys(data.loadings[0]);
    const width = ctx.WIDTH - margin.left - margin.right;
    const height = ctx.HEIGHT - margin.top - margin.bottom;

    const container = d3.select('#mainBarChart');
    const svg = container.append('svg')
        .attr('width', ctx.WIDTH)
        .attr('height', ctx.HEIGHT)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand()
    .domain(features)
    .range([0, width])
    .padding(0.1);

    const xSubScale = d3.scaleBand()
        .domain(data.loadings.slice(0, 3).map((_, i) => i))
        .range([0, 20])
        .padding(0.05);

    const yScale = d3.scaleLinear()
        .domain([-0.6, 0.6])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0, ${height + 10})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('dy', (d, i) => i % 2 === 0 ? '2em' : '0.5em')
        .attr('text-anchor', 'middle')
        .style('font-size', '10px');

    svg.append('g')
        .call(d3.axisLeft(yScale));
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (ctx.HEIGHT / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style("fill", "#888") 
        .text('Loadings'); 

    data.loadings.slice(0, 3).forEach((loading, index) => {
        const pcName = `${index + 1}st Primary Component`; 
        svg.selectAll('.bar' + index)
            .data(features)
            .enter()
            .append('rect')
            .attr('class', 'bar' + index)
            .attr('x', d => xScale(d) + xSubScale(index) + xSubScale.bandwidth() / 2 - 1)
            .attr('y', d => yScale(Math.max(0, loading[d])))
            .attr('width', 3)
            .attr('height', d => Math.abs(yScale(loading[d]) - yScale(0)))
            .attr('fill', d3.schemeObservable10[index % 10])
            .style('opacity', 0.7)
            .on('mouseover', function(event, d) {
                svg.append('text')
                    .attr('id', 'tooltip')
                    .attr('x', xScale(d) + xSubScale(index) + xSubScale.bandwidth() / 2)
                    .attr('y', yScale(loading[d]) - 10)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .text(pcName);
            })
            .on('mouseout', function() {
                d3.select('#tooltip').remove(); 
            });
    });
}

function drawExplainedVarianceLineChart(data) {
    const width = ctx.WIDTH - margin.left - margin.right;
    const height = ctx.HEIGHT - margin.top - margin.bottom;

    const container = d3.select('#varianceLineChart');
    const svg = container.append('svg')
        .attr('width', ctx.WIDTH)
        .attr('height', ctx.HEIGHT)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const variance = data.explained_variance_ratio; 
    const components = variance.map((_, i) => `PC${i + 1}`); 

    const xScale = d3.scaleBand()
        .domain(components)
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(variance)]) 
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .call(d3.axisLeft(yScale));

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Principal Components'); 

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style("fill", "#888") 
        .text('Explained Variance Ratio'); 

    const line = d3.line()
        .x((d, i) => xScale(components[i]) + xScale.bandwidth() / 2) 
        .y(d => yScale(d));

    svg.append('path')
        .datum(variance)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

    svg.selectAll('.dot')
        .data(variance)
        .enter()
        .append('circle')
        .attr('cx', (d, i) => xScale(components[i]) + xScale.bandwidth() / 2)
        .attr('cy', d => yScale(d))
        .attr('r', 4)
        .attr('fill', 'steelblue');
}