let ctx = {
    WIDTH: 760,
    HEIGHT: 480,
};

const globalmargin = { top: 20, right: 60, bottom: 60, left: 0 };

function initializeViz() {
    console.log("hi");
    d3.json('data/shap_and_normalized_data_full.json').then(data => {
        createSummaryPlotDistribution(data, "dis-plot")
        createSummaryPlot(data, "summary-plot");
        createForcePlot(data, "force-plot");
        createWaterfallPlot(data, "waterfall-plot");
        showShapForFeature(data, "tempo", "shap-feature-plot");
    });
}

function createSummaryPlotDistribution(data, divId, colorscale = [[0, 'rgb(54, 162, 235)'], [1, 'rgb(255, 99, 132)']]) {
    const features = data.features; // 特征名
    const shapValues = data.shap_values; // SHAP 值
    const normalizedData = data.normalized_data; // 归一化特征值
    const sampleSize = 100;

    const sampleIndices = Array.from({ length: shapValues.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize); // 随机采样
    const sampledShapValues = sampleIndices.map(i => shapValues[i]);
    const sampledNormalizedData = sampleIndices.map(i => normalizedData[i]);

    // 准备绘图数据
    const plotData = features.map((feature, index) => {
        // 筛选掉 SHAP 值小于 -40 的样本点
        const filteredShapForFeature = [];
        const filteredFeatureValues = [];

        sampledShapValues.forEach((row, rowIndex) => {
            const shapValue = row[feature];
            if (shapValue >= -10) { // 筛选条件
                filteredShapForFeature.push(shapValue);
                filteredFeatureValues.push(sampledNormalizedData[rowIndex][feature]);
            }
        });

        return {
            x: filteredShapForFeature, // 过滤后的 SHAP 值
            y: Array(filteredShapForFeature.length).fill(feature), // 特征名
            mode: 'markers',
            type: 'scatter',
            showlegend: false, // 去掉特征图例
            name: feature,
            marker: {
                size: 6, // 缩小点的大小
                opacity: 0.6, // 设置点的透明度
                color: filteredFeatureValues, // 颜色映射特征值
                colorscale: colorscale, // 两色线性渐变
                showscale: index === 0, // 只显示一次颜色条
                colorbar: index === 0 ? {
                    title: 'Feature Value',
                    tickfont: { color: '#888' },
                    titlefont: { color: '#aaa' }
                } : undefined
            }
        };
    });

    // 配置布局
    const layout = {
        title: {
            text: 'SHAP Summary Plot (Distribution)',
            font: { size: 16, color: '#e0e0e0', family: 'Arial, sans-serif' }
        },
        paper_bgcolor: 'black',
        plot_bgcolor: 'black',
        hoverlabel: {
            font: {
                family: 'Arial, sans-serif',
                size: 12,
                color: 'white'
            },
            bgcolor: 'rgba(50,50,50,0.9)',
            bordercolor: 'white'
        },
        xaxis: {
            title: { text: 'SHAP Value', font: { size: 14, color: '#aaa' } }, // 添加 X 轴标识
            tickfont: { size: 12, color: '#bbb' },
        },
        yaxis: {
            title: { text: 'Features', font: { size: 14, color: '#aaa' } },
            tickfont: { size: 12, color: '#bbb' },
            automargin: true,
            type: 'category', // 按类别排列特征
        },
        width: ctx.WIDTH,
        height: ctx.HEIGHT + 100,
        margin: { t: 0, l: 150, r: 50, b: 50 }
    };

    // 绘制图表
    Plotly.newPlot(divId, plotData, layout);
}

function createSummaryPlot(data, divId) {
    const features = data.features; // 特征名
    const shapValues = data.shap_values; // SHAP 值

    // 计算每个特征的平均绝对 SHAP 值（重要性）
    const featureImportance = features.map((feature) => {
        const shapForFeature = shapValues.map(row => Math.abs(row[feature])); // 获取每个样本的绝对值
        return {
            feature: feature,
            importance: shapForFeature.reduce((sum, value) => sum + value, 0) / shapForFeature.length // 平均值
        };
    });

    // 按重要性降序排序
    featureImportance.sort((a, b) => b.importance - a.importance);

    // 使用 d3.interpolate 生成颜色映射
    const colorScale = d3.scaleSequential(d3.interpolateCool) // 使用暗色调的插值
        .domain([0, featureImportance.length - 1]);

    const plotData = [
        {
            x: featureImportance.map(d => d.feature),
            y: featureImportance.map(d => d.importance),
            type: 'bar',
            orientation: 'v',
            marker: {
                color: featureImportance.map((_, i) => colorScale(i)),
                line: {
                    color: 'rgba(255,255,255,0.2)', // 添加边框
                    width: 1 // 边框宽度
                }
            },
            width: 0.5 // 条形宽度调整
        }
    ];

    const layout = {
        title: {
            text: 'Feature Importance (SHAP Values)',
            font: { color: '#ccc' }
        },
        paper_bgcolor: 'black', // 背景色
        plot_bgcolor: 'black', // 图表背景色
        xaxis: {
            title: { text: 'Features', font: { color: '#888' } },
            tickfont: { color: '#888' },
            automargin: true
        },
        yaxis: {
            title: { text: 'Average |SHAP Value|', font: { color: '#888' } },
            tickfont: { color: '#888' },
            automargin: true
        },
        width: ctx.WIDTH, // 动态调整宽度
        height: ctx.HEIGHT, // 动态调整高度
        margin: globalmargin
    };

    // 绘制图表
    Plotly.newPlot(divId, plotData, layout);
}

function createForcePlot(data, divId) {
    const features = data.features; // 特征名
    const shapValues = data.shap_values; // SHAP 值
    const expectedValue = data.expected_value; // 全局期望值

    // 选择样本
    const sampleIndex = 0; // 选择第一个样本
    const sampleShapValues = shapValues[sampleIndex]; // 当前样本的 SHAP 值
    const sampleFeatures = data.normalized_data[sampleIndex]; // 当前样本的特征值

    // 计算 SHAP 累积贡献
    const cumulativeContributions = [];
    let cumulativeValue = expectedValue; // 起点是全局期望值
    Object.values(sampleShapValues).forEach((shapValue) => {
        cumulativeValue += shapValue;
        cumulativeContributions.push(cumulativeValue);
    });

    // 绘制 Force Plot 数据
    const positiveContributions = Object.values(sampleShapValues).map((val) => (val > 0 ? val : 0));
    const negativeContributions = Object.values(sampleShapValues).map((val) => (val < 0 ? val : 0));

    const plotData = [
        {
            x: Object.keys(sampleShapValues), // 特征名
            y: positiveContributions, // 正贡献
            type: 'bar',
            name: 'Positive Contribution',
            marker: { color: 'rgb(255, 99, 132)' }, // 红色
            orientation: 'v',
        },
        {
            x: Object.keys(sampleShapValues), // 特征名
            y: negativeContributions, // 负贡献
            type: 'bar',
            name: 'Negative Contribution',
            marker: { color: 'rgb(54, 162, 235)' }, // 蓝色
            orientation: 'v',
        },
    ];

    // 配置布局
    const layout = {
        title: {
            text: 'Force Plot for Sample ' + sampleIndex,
            font: { size: 16, color: '#e0e0e0', family: 'Arial, sans-serif' },
        },
        paper_bgcolor: 'black',
        plot_bgcolor: 'black',
        hoverlabel: {
            font: {
                family: 'Arial, sans-serif',
                size: 12,
                color: 'white',
            },
            bgcolor: 'rgba(50,50,50,0.9)',
            bordercolor: 'white',
        },
        xaxis: {
            title: { text: 'Features', font: { size: 14, color: '#aaa' } },
            tickfont: { size: 12, color: '#bbb' },
        },
        yaxis: {
            title: { text: 'SHAP Contribution', font: { size: 14, color: '#aaa' } },
            tickfont: { size: 12, color: '#bbb' },
        },
        barmode: 'relative', // 叠加条形图
        width: ctx.WIDTH,
        height: ctx.HEIGHT,
        margin: { t: 0, l: 50, r: 50, b: 100 },
    };

    // 绘制图表
    Plotly.newPlot(divId, plotData, layout);
}

function createWaterfallPlot(data, divId, sampleIndex = 1200) {
//this is tooooooooo ugly
}

function showShapForFeature(data, col, divId, groupCount = 20) {
    const shapValues = data.shap_values; // SHAP 值数组
    const testData = data.normalized_data; // 测试数据（归一化）

    // 初始化组
    const binSize = 1 / groupCount; // 每组的宽度
    const groups = Array.from({ length: groupCount }, (_, i) => ({
        bin: `${(i * binSize).toFixed(2)} - ${((i + 1) * binSize).toFixed(2)}`,
        shap: []
    }));

    // 遍历样本数据，将 SHAP 值分配到对应的组
    testData.forEach((row, index) => {
        const featureValue = row[col]; // 当前样本的特征值
        const shapValue = shapValues[index][col]; // 当前样本的 SHAP 值

        const binIndex = Math.min(
            Math.floor(featureValue / binSize),
            groupCount - 1
        ); // 确保值落在正确的组范围内
        groups[binIndex].shap.push(shapValue);
    });

    // 计算每组的均值和标准差
    const processedData = groups.map((group, index) => {
        const mean =
            group.shap.reduce((sum, v) => sum + v, 0) / group.shap.length || 0;
        const variance =
            group.shap.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
                group.shap.length || 0;
        return {
            bin: group.bin, // 显示的范围
            upperBound: ((index + 1) * binSize).toFixed(2), // 每组的上界
            mean,
            std: Math.sqrt(variance), // 标准差
            count: group.shap.length
        };
    });

    // 使用 ctx.WIDTH 和 ctx.HEIGHT
    const margin = { top: 40, right: 20, bottom: 60, left: 0 };
    const width = ctx.WIDTH - margin.left - margin.right;
    const height = ctx.HEIGHT - margin.top - margin.bottom;

    // 创建 SVG 容器
    const svg = d3.select(`#${divId}`)
        .append("svg")
        .attr("width", ctx.WIDTH) // 使用全局宽度
        .attr("height", ctx.HEIGHT) // 使用全局高度
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 横轴和纵轴缩放
    const x = d3.scaleBand()
        .domain(processedData.map(d => d.upperBound)) // 横轴显示每组的上界
        .range([0, width])
        .padding(0.1); // 调整紧凑度

    const y = d3.scaleLinear()
        .domain([
            d3.min(processedData, d => d.mean - d.std),
            d3.max(processedData, d => d.mean + d.std)
        ])
        .nice()
        .range([height, 0]);

    // 绘制网格线
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(y.ticks())
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#ccc") // 浅色实线
        .attr("stroke-opacity", 0.5); // 透明度

    // 横轴
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

    // 纵轴
    svg.append("g")
        .call(d3.axisLeft(y));

    // 添加误差条
    svg.selectAll(".error-bar")
        .data(processedData)
        .enter()
        .append("line")
        .attr("class", "error-bar")
        .attr("x1", d => x(d.upperBound) + x.bandwidth() / 2)
        .attr("x2", d => x(d.upperBound) + x.bandwidth() / 2)
        .attr("y1", d => y(d.mean - d.std))
        .attr("y2", d => y(d.mean + d.std))
        .attr("stroke", "rgba(255, 99, 132, 0.8)")
        .attr("stroke-width", 2);

    // 添加均值线
    svg.selectAll(".mean-line")
        .data(processedData)
        .enter()
        .append("line")
        .attr("class", "mean-line")
        .attr("x1", d => x(d.upperBound) + x.bandwidth() / 4) // 起始位置
        .attr("x2", d => x(d.upperBound) + (3 * x.bandwidth()) / 4) // 结束位置
        .attr("y1", d => y(d.mean))
        .attr("y2", d => y(d.mean))
        .attr("stroke", "rgba(255, 99, 132, 0.8)") // 蓝色横线
        .attr("stroke-width", 2);

    // 添加标题
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#e0e0e0")
        .text(`SHAP values grouped by ${col}`);

    // 添加横轴标题
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom / 1.5)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#aaa")
        .text(col);

    // 添加纵轴标题
    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -margin.left / 1.5)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-size", "14px")
        .style("fill", "#aaa")
        .text("SHAP Value");
}