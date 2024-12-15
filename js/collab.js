const ctx = {
    WIDTH: 860,
    HEIGHT: 800,
    mapMode: false,
};


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
