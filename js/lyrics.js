const ctx = {
    WIDTH: 860,
    HEIGHT: 800
}

function populateSVGcanvas() {
  const width = ctx.WIDTH;
  const height = ctx.HEIGHT;
  const margin = 10; // Prevent clipping
  const color = d3.scaleOrdinal(d3.schemeTableau10); // Color scale

  // Convert the flat data into a hierarchy for the pack layout
  const root = d3.pack()
      .size([width - margin * 2, height - margin * 2])
      .padding(3)(d3.hierarchy({children: ctx.data})
      .sum(d => +d.count)); // Use `count` as the value

  const svg = d3.select("#main svg"); // Use the existing SVG

  // Add a group for each node (bubble)
  const node = svg.append("g")
      .attr("transform", `translate(${margin},${margin})`) // Apply margin
      .selectAll("g")
      .data(root.leaves())
      .enter().append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`); // Position each bubble

  // Add circles
  node.append("circle")
      .attr("r", d => d.r) // Radius from the pack layout
      .attr("fill", (d, i) => color(i)) // Use the color scale
      .attr("fill-opacity", 0.7);

  // Add titles (tooltip effect)
  node.append("title")
      .text(d => `${d.data.word}: ${d.data.count}`);

  // Add labels
  node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em") // Center vertically
      .text(d => d.data.word) // Use the `word` field
      .style("font-size", d => `${Math.min(2 * d.r / d.data.word.length, 12)}px`) // Scale font size
      .style("fill", "white");
}


function createViz(){
    console.log("Using D3 v" + d3.version);
    d3.select("body")
      .on("keydown", function(event, d){handleKeyEvent(event);});
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.WIDTH);
    svgEl.attr("height", ctx.HEIGHT);
    loadData();
}

function loadData(){
    let data = d3.csv("data/spotify_top10_lyrics_50common_words.csv");
    data.then(function(data){
        ctx.data = data;
        console.log(ctx.data);
        populateSVGcanvas();
    }).catch(function(error){console.log(error)});
}