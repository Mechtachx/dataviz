const ctx = {
    MAP_W: 600,
    MAP_H: 600,
    YEAR: "2020",
};
let spotifydata, mapdata;
const lookuptable = {};


let col = 'popularity';
let time = '2023-10';


const timeRange = [
    "2023-11", "2023-12", "2024-01", "2024-02", "2024-03", "2024-04",
    "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11"
];



function createViz() {
    console.log("Using D3 v" + d3.version);
    // bind button onclick event
    initInteraction();
    addslider()

    Promise.all([
        d3.json("data/sbfix.geojson"),
        d3.json('data/monthly_map.json')
    ]).then(function(data) {
        mapdata = data[0];

        mapdata.features.forEach(feature => {
            if (feature.geometry.type === "Polygon") {
                feature.geometry.coordinates = feature.geometry.coordinates.map((ring, index) => {
                    // 外环（第一个环）逆时针，内环顺时针
                    const area = d3.geoArea({ type: "Polygon", coordinates: [ring] });
                    if ((index === 0 && area > 2 * Math.PI) || (index > 0 && area < 2 * Math.PI)) {
                        return ring.reverse(); // 反转方向
                    }
                    return ring; // 保留原方向
                });
            } else if (feature.geometry.type === "MultiPolygon") {
                feature.geometry.coordinates = feature.geometry.coordinates.map(polygon =>
                    polygon.map((ring, index) => {
                        // 同样处理外环和内环
                        const area = d3.geoArea({ type: "Polygon", coordinates: [ring] });
                        if ((index === 0 && area > 2 * Math.PI) || (index > 0 && area < 2 * Math.PI)) {
                            return ring.reverse(); // 反转方向
                        }
                        return ring; // 保留原方向
                    })
                );
            }
        });

        mapdata.features = mapdata.features.filter(feature => {
            const name = feature.properties.NAME || feature.properties.ADMIN || feature.properties.SOVEREIGNT;
            return name !== "Antarctica"; // 过滤掉名字是 Antarctica 的特征
        });
        
        spotifydata = data[1];
        //console.log(spotifydata['2023-10']);

        spotifydata['2023-10'].forEach(entry => {
            lookuptable[entry.country] = true; // 你可以存储其他信息，而不仅仅是 true
        });

        drawmap();
        drawLineChart();
    }).catch(function(error) { console.log(error) });
};

/* --------------------------------------------------------------------------------------*/
// bind button onclick event
function initInteraction() {
    const button = document.getElementById('load-btn');
    const select = document.getElementById('select-option');


    // 获取 select 元素
    const featureSelect = document.getElementById("feature");

    if (!featureSelect) {
        console.error("Element with ID 'feature' not found in DOM.");
        return;
    }

    // 添加 change 事件监听器
    featureSelect.addEventListener("change", function (event) {
        const selectedValue = event.target.value; // 获取选中的值
        console.log(`Selected feature: ${selectedValue}`);

        // 调用自定义函数处理逻辑
        onFeatureChange(selectedValue);
    });

    button.addEventListener('click', () => {
        const selectedValue = select.value;
        console.log(selectedValue);
        if (!selectedValue) {
            alert("Please select a valid option.");
            return;
        }

        loadPage(selectedValue);
    });

    
}

function loadPage(url) {
    console.log(url);
    const iframe = document.getElementById('iframeDisplay');
    iframe.src = url;
    
}




function addslider() {
    const months = [];
    const startYear = 2023;
    const startMonth = 11;
    const endYear = 2024;
    const endMonth = 11;
    
    // 生成月份刻度
    let currentYear = startYear;
    let currentMonth = startMonth;
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        months.push(`${currentYear}-${String(currentMonth).padStart(2, "0")}`);
        currentMonth++;
        if (currentMonth > 12) {
            currentYear++;
            currentMonth = 1;
        }
    }
    
    // 选择 timeline 容器
    const svgContainer = d3.select("#timeline")
        .attr("width", 600)
        .attr("height", 100);
    
    // 定义 margin 和绘图区域尺寸
    const margin = { top: 20, right: 20, bottom: 50, left: 20 };
    const width = 600 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;
    
    // 添加主 SVG group
    const svg = svgContainer
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // 创建时间刻度比例尺
    const xScale = d3.scalePoint()
        .domain(months)
        .range([0, width]);
    
    // 添加时间线
    svg.append("line")
        .attr("x1", xScale.range()[0])
        .attr("x2", xScale.range()[1])
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2);
    
    // 添加刻度
    svg.selectAll(".tick")
        .data(months)
        .enter()
        .append("line")
        .attr("class", "tick")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", height / 2 - 5)
        .attr("y2", height / 2 + 5)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1);
    
    
    // 添加滑块
    const slider = svg.append("circle")
    .attr("cx", xScale(months[0])) // 初始位置
    .attr("cy", height / 2)
    .attr("r", 8)
    .attr("fill", "orange")
    .call(
        d3.drag()
            .on("drag", function (event) {
                // 滑块实时跟随鼠标
                const xPos = Math.min(
                    Math.max(event.x, xScale.range()[0]), 
                    xScale.range()[1]
                );
                slider.attr("cx", xPos);
            })
            .on("end", function (event) {
                // 鼠标松开后对齐到最近的刻度
                const xPos = slider.attr("cx");
                const closestMonth = xScale.domain().reduce((prev, curr) =>
                    Math.abs(xScale(curr) - xPos) < Math.abs(xScale(prev) - xPos) ? curr : prev
                );

                // 对齐滑块位置
                slider.attr("cx", xScale(closestMonth));

                // 触发自定义事件
                onSliderMove(closestMonth);
            })
    );
}



// 空的滑动事件处理函数
function onSliderMove(selectedMonth) {
    console.log(`当前选择的月份: ${selectedMonth}`);
    // 这里可以填入你的逻辑
    time = selectedMonth;

    
    drawmap();
    drawLineChart()
}

function onFeatureChange(selectedFeature) {
    console.log(`Feature changed to: ${selectedFeature}`);
    // 在这里添加你的逻辑
    col = selectedFeature;

    drawmap();
    drawLineChart()
}


/* ------------ PART END ------------*/
/* --------------------------------------------------------------------------------------*/
// process map

function drawmap() {
    const spotify = spotifydata[time];
    const entries = spotify.map(d => d[col]);
    const lookup = spotify.reduce((acc, item) => {
        acc[item['country']] = item[col]; // 将 country 作为键，col 作为值
        return acc;
    }, {});
    //console.log(lookup);
    //console.log(spotify, entries);
    //console.log(mapdata.features[0].geometry.coordinates)
                
    const projection = d3.geoMercator()
    .scale(100)  // 根据需要调整缩放比例
    .translate([ctx.MAP_W / 2, ctx.MAP_H / 2])
    
    const path = d3.geoPath().projection(projection);

    const minDensity = d3.min(entries);
    const maxDensity = d3.max(entries);
    console.log(minDensity);
    const colorScale = d3.scaleSequential(d3.interpolateRgb('rgb(54, 162, 235)', 'rgb(255, 99, 132)'))
        .domain([minDensity, maxDensity]); 

    const strokeColor = "#ccc";

    const singleFeature = [mapdata.features[0]];
    
    d3.select("svg")
      .append("g")
      .selectAll("path")
      .data(mapdata.features)
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", d => {
        const isoa2 = d.properties.ISO_A2; // 使用 GeoJSON 中的国家代码
        //if (lookuptable[isoa2]) console.log(lookup[isoa2]);
        return lookuptable[isoa2] ? colorScale(lookup[isoa2]) : "#000"; // 匹配时填充特定颜色，否则填充默认颜色
       })
      .style("fill-rule", "evenodd")  
      .style("stroke", strokeColor)
      .style("stroke-width", "1px")  // 增加边界宽度
      .attr("class", "countryArea");
    }


/* ------------ PART END ------------*/
/* --------------------------------------------------------------------------------------*/


function drawLineChart() {
    d3.select('#svgTime').selectAll("*").remove();
    const globalData = timeRange.map(time => ({
        time, // 当前时间
        col: spotifydata[time].find(entry => entry.country === "Global")[col] // 直接取出 col 值
    }));

    // 打印结果以供调试
    //console.log("Global Data:", globalData);

    // 设置 SVG 尺寸和边距
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // 选择 SVG 容器
    const svg = d3.select('#svgTime')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 定义比例尺
    const xScale = d3.scalePoint()
        .domain(globalData.map(d => d.time)) // 使用时间范围作为 X 轴
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(globalData, d => d.col), d3.max(globalData, d => d.col)]) // 动态设置 Y 轴范围
        .range([height, 0]);

    // 定义 X 和 Y 轴
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // 添加 X 轴
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis)
        .selectAll("text") // 旋转 X 轴刻度标签以便显示
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // 添加 Y 轴
    svg.append("g")
        .call(yAxis);

    // 定义折线生成器
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.col))
        .curve(d3.curveMonotoneX); // 平滑曲线

    // 绘制折线
    svg.append("path")
        .datum(globalData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    // 添加数据点
    const dots = svg.selectAll(".dot")
        .data(globalData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale(d.col))
        .attr("r", 6)
        .attr("fill", d => {
            //console.log(time);
            return d.time === time ? "orange" : "lightgray"})
        .attr("opacity", d => (d.time === time ? 1 : 0.7));
}