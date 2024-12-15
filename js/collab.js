const ctx = {
    WIDTH: 860,
    HEIGHT: 800,
    mapMode: false,
};

const ALBERS_PROJ = d3.geoAlbersUsa().translate([ctx.WIDTH/2, ctx.HEIGHT/2]).scale([1000]);

// https://github.com/d3/d3-force
const simulation = d3.forceSimulation()
                   .force("link", d3.forceLink()
                                    .id(function(d) { return d.id; })
                                    .distance(5).strength(0.08))
                   .force("charge", d3.forceManyBody())
                   .force("center", d3.forceCenter(ctx.WIDTH / 2, ctx.HEIGHT / 2));

function createGraphLayout3() {
    // Define dimensions for the visualization;
    const radius = Math.min(ctx.WIDTH, ctx.HEIGHT) / 2 - 50;

    // Get references to the route and airport groups
    const routeGroup = d3.select("#routeG");
    const airportGroup = d3.select("#airportG");

    // Center the groups in the SVG canvas
    routeGroup.attr("transform", `translate(${ctx.WIDTH / 2},${ctx.HEIGHT / 2})`);
    airportGroup.attr("transform", `translate(${ctx.WIDTH / 2},${ctx.HEIGHT / 2})`);

    // Create a hierarchical structure from the vertices (airports) data
    const root = d3.hierarchy({ children: ctx.airport_vertices })
        .sum(d => d.degree); // Aggregate values by degree

    // Use a cluster layout for hierarchical positioning
    const cluster = d3.cluster()
        .size([2 * Math.PI, radius]);

    cluster(root);

    // Create a map of nodes by name for quick lookup
    const nodesByName = {};
    root.leaves().forEach(d => {
        nodesByName[d.data.name] = d;
    });

    // Create links from the edges data
    const links = ctx.route_edges.map(edge => ({
        source: nodesByName[edge.source],
        target: nodesByName[edge.target]
    }));
    console.log(links);

    // Draw the edges (bundled arcs) in the route group
    const line = d3.lineRadial()
        .curve(d3.curveBundle.beta(0.85)) // Adjust bundling strength here
        .radius(d => d.y)
        .angle(d => d.x);

    routeGroup.selectAll("path")
        .data(links)
        .join("path")
        //.attr("d", d => line(d3.hierarchy({ children: [d.source, d.target] }).links()))
        .attr("d", d => line([
            { x: d.source.x, y: d.source.y },
            { x: d.target.x, y: d.target.y }
        ]))
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5)
        .attr("fill", "none");

    // Draw the nodes (airports) in the airport group
    airportGroup.selectAll("circle")
        .data(root.leaves())
        .join("circle")
        .attr("transform", d => `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`)
        .attr("r", 3)
        .attr("fill", "#1DB954");

    // Add labels to the nodes
    airportGroup.selectAll("text")
        .data(root.leaves())
        .join("text")
        .attr("transform", d => `
            rotate(${(d.x * 180 / Math.PI - 90)})
            translate(${d.y + 5},0)
            rotate(${d.x >= Math.PI ? 180 : 0})
        `)
        .attr("text-anchor", d => d.x >= Math.PI ? "end" : "start")
        .attr("font-size", 10)
        .attr("fill", "#FFFFFF")
        .text(d => d.data.name);
}

function createGraphLayout() {
    // Dimensions
    const diameter = 800; // Overall size of the SVG
    const radius = diameter / 2;
    const innerRadius = radius - 120; // Space for the nodes and edges

    // Groups for edges and nodes
    const linkGroup = d3.select("#routeG");
    const nodeGroup = d3.select("#airportG");

    const desiredX = 400; // New horizontal center
    const desiredY = 400; // New vertical center

    linkGroup.attr("transform", `translate(${desiredX},${desiredY})`);
    nodeGroup.attr("transform", `translate(${desiredX},${desiredY})`);

    // Cluster layout for radial positioning
    const cluster = d3.cluster()
        .size([360, innerRadius]);

    // Convert flat nodes into a hierarchy
    const root = d3.hierarchy({ children: ctx.airport_vertices })
        .sum(d => d.degree);

    // Apply the cluster layout to calculate positions
    cluster(root);

    // Create a mapping of node names to cluster layout nodes
    const nodesByName = {};
    root.leaves().forEach(node => {
        nodesByName[node.data.name] = node;
    });

    // Map the edges to their corresponding nodes
    const links = ctx.route_edges.map(edge => ({
        source: nodesByName[edge.source],
        target: nodesByName[edge.target]
    }));

    // Radial line generator with bundling curve
    const line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85)) // Adjust bundling strength
        .radius(d => d.y)
        .angle(d => (d.x / 180) * Math.PI);

    // Draw edges
    linkGroup.selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => line(d.source.path(d.target)))
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5)
        .attr("fill", "none")
        .attr("opacity", 1);

    // Draw nodes
    nodeGroup.selectAll("text")
        .data(root.leaves())
        .enter()
        .append("text")
        .attr("class", "node")
        .attr("dy", "0.31em")
        .attr("transform", d => `
            rotate(${(d.x - 90)})
            translate(${d.y + 8},0)
            ${d.x < 180 ? "" : "rotate(180)"}
        `)
        .attr("text-anchor", d => (d.x < 180 ? "start" : "end"))
        .attr("fill", "#1DB954")
        .text(d => d.data.name)
        .on("mouseover", function (event, d) {
            // Highlight edges connected to this node
            linkGroup.selectAll("path")
                .attr("opacity", e =>
                    e.source === d || e.target === d ? 1 : 0 // Highlight connected edges
                );
        })
        .on("mouseout", function () {
            // Reset all edges
            linkGroup.selectAll("path")
                .attr("opacity", 1);
        });
}



function createGraphLayout2(){
    var lines = d3.select("#routeG").append("g").attr("id", "edges");
    var circles = d3.select("#airportG").append("g").attr("id", "nodes");
    let degreeExtent = d3.extent(ctx.airport_vertices, (d) => (d.degree));
    const degreeLogScale = d3.scaleLog().domain(degreeExtent);
    const colorScale = d3.scaleSequential((d) => d3.interpolateViridis(degreeLogScale(d)));

    lines.selectAll("line")
      .data(ctx.route_edges)
      .enter()
      .append("line")
      .style('stroke', 'black')
      .style('stroke-width', '1px')
      .style('opacity', 0.2);

    circles.selectAll("circle")
      .data(ctx.airport_vertices)
      .enter()
      .append("circle")
      .attr('r', 5)
      .style('stroke', 'black')
      .style('fill', (d) => (colorScale(d.degree)))
      .append("title") 
      .text((d) => `${d.name}`);

    circles.call(d3.drag().on("start", (event, d) => startDragging(event, d))
                          .on("drag", (event, d) => dragging(event, d))
                          .on("end", (event, d) => endDragging(event, d)));

    // input data structure created earlier is in ctx.airport_vertices + ctx.route_edges:
    simulation.nodes(ctx.airport_vertices)
                //.on("tick", simStep);
    simulation.force("link")
                .links(ctx.route_edges);
};

function simStep(){// code run at each iteration of the simulation
    // updating the position of nodes and links
    d3.selectAll("#routeG line").attr("x1", (d) => (d.source.x))
                                .attr("y1", (d) => (d.source.y))
                                .attr("x2", (d) => (d.target.x))
                                .attr("y2", (d) => (d.target.y));
    d3.selectAll("#airportG circle").attr("cx", (d) => (d.x))
                                    .attr("cy", (d) => (d.y));
};

function switchVis(showMap){
    if (showMap){
        // show network on map
        //...
    }
    else {
        // show NL diagram
        //...
    }
};

function addVerticesAndEdges(airports, flights){
    ctx.airport_vertices = airports.map((airport) => ({
        name: airport.artists,
        degree: 0
    }));
    console.log(ctx.airport_vertices);
    console.log(flights[0].collab);

    ctx.route_edges = flights.map(flight => {
        const source = ctx.airport_vertices.find((airport) => airport.name === flight.artists);
        const target = ctx.airport_vertices.find((airport) => airport.name === flight.collab);
        if (!source) {
            console.log(`Missing vertex: ${flight.artists}`);
          }
          
        if (!target) {
            console.log(`Missing target: ${flight.collab}`);
          }
        //console.log(source);
        source.degree++; 
        target.degree++; 
        return {
            source: flight.artists,
            target: flight.collab,
            //value: flight.count //weight
        };
    });
    console.log(ctx.route_edges);
    console.log(ctx.airport_vertices);
};

function createViz(){
    console.log("Using D3 v" + d3.version);
    d3.select("body")
      .on("keydown", function(event, d){handleKeyEvent(event);});
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.WIDTH);
    svgEl.attr("height", ctx.HEIGHT);
    loadData();
};

function populateSVGcanvas(){
    //append two groups to the <svg> element: <g id=“routeG”> and <g id=“airportG”>
    let svgEl = d3.select("svg");
    svgEl.append("g")
            .attr("id", "routeG");
    svgEl.append("g")
            .attr("id", "airportG");
    createGraphLayout();
};

function loadData(){
    let promises = [d3.csv("data/artist_nodes.csv"),
                    d3.json("data/collabs.json")];
    Promise.all(promises).then(function(data){
        if (data.length < 2) {
            console.error("Invalid data");
            return;
        }
        console.log(data[1]);
        addVerticesAndEdges(data[0],data[1]);
        ctx.data = data;
        populateSVGcanvas();
    }).catch(function(error){console.log(error)});
};

function startDragging(event, node){
    if (ctx.mapMode){return;}
    if (!event.active){
        simulation.alphaTarget(0.3).restart();
    }
    node.fx = node.x;
    node.fy = node.y;
}

function dragging(event, node){
    if (ctx.mapMode){return;}
    node.fx = event.x;
    node.fy = event.y;
}

function endDragging(event, node){
    if (ctx.mapMode){return;}
    if (!event.active){
        simulation.alphaTarget(0);
    }
    // commenting the following lines out will keep the
    // dragged node at its current location, permanently
    // unless moved again manually
    node.fx = null;
    node.fy = null;
}

function handleKeyEvent(e){
    if (e.keyCode === 84){
        // hit T
        toggleMap();
    }
};

function toggleMap(){
    ctx.mapMode = !ctx.mapMode;
    //switchVis(ctx.mapMode);
};
