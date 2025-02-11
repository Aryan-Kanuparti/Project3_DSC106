// Define margins and SVG size
const margin = { top: 50, right: 50, bottom: 50, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#d3-graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// X and Y scales
const xScale = d3.scaleLinear().domain([0, 1440]).range([0, width]);  // 1440 minutes = 24 hours
const yScale = d3.scaleLinear().domain([35, 40]).range([height, 0]);  // Temperature range

// X and Y axes
const xAxis = d3.axisBottom(xScale).tickFormat(d => `${Math.floor(d / 60)}h`); // Convert to hours
const yAxis = d3.axisLeft(yScale);

// Append axes
svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);
svg.append("g").call(yAxis);

// Function to load and process data
async function loadData() {
    const femData = await d3.csv("data/Fem_Temp.csv", d3.autoType);
    const maleData = await d3.csv("data/Male_Temp.csv", d3.autoType);

    console.log("Raw Female Data:", femData);
    console.log("Raw Male Data:", maleData);

    // Ensure numeric conversion
    femData.forEach(d => d.temp = +d.temp);
    maleData.forEach(d => d.temp = +d.temp);

    const numMinutes = 1440;
    const ovulationDays = [2, 6, 10, 14];
    const nonOvulationDays = [1, 3, 4, 5, 7, 8, 9, 11, 12, 13];

    // function aggregateTemperature(data, selectedDays) {
    //     let avgTemp = new Array(numMinutes).fill(0);
    //     let count = new Array(numMinutes).fill(0);

    //     selectedDays.forEach(day => {
    //         let startIdx = (day - 1) * numMinutes;
    //         for (let i = 0; i < numMinutes; i++) {
    //             if (data[i + startIdx] && data[i + startIdx].temp !== undefined) {
    //                 avgTemp[i] += data[i + startIdx].temp;
    //                 count[i] += 1;
    //             }
    //         }
    //     });
    //     return avgTemp.map((sum, i) => (count[i] > 0 ? sum / count[i] : NaN));
    // }
    function aggregateTemperature(data, selectedDays) {
        let avgTemp = new Array(numMinutes).fill(0);
        let count = new Array(numMinutes).fill(0);
    
        selectedDays.forEach(day => {
            let startIdx = (day - 1) * numMinutes;
            for (let i = 0; i < numMinutes; i++) {
                if (!isNaN(data[i + startIdx])) { // Ensure valid number
                    avgTemp[i] += data[i + startIdx];
                    count[i] += 1;
                }
            }
        });
    
        return avgTemp.map((sum, i) => (count[i] > 0 ? sum / count[i] : NaN)); // Avoid division by 0
    }
    

    // Get averages for each condition
    const maleAvg = aggregateTemperature(maleData, Array.from({ length: 14 }, (_, i) => i + 1));
    const femaleOvulationAvg = aggregateTemperature(femData, ovulationDays);
    const femaleNonOvulationAvg = aggregateTemperature(femData, nonOvulationDays);

    console.log("Male Avg:", maleAvg);
    console.log("Female Ovulation Avg:", femaleOvulationAvg);
    console.log("Female Non-Ovulation Avg:", femaleNonOvulationAvg);

    // Convert to line chart format
    // const createLineData = (temps) => temps.map((temp, i) => ({ minute: i, temp }));
    const createLineData = (temps) => temps
    .map((temp, i) => ({ minute: i, temp }))
    .filter(d => !isNaN(d.temp)); // Remove NaN values

    // Line generator
    const line = d3.line()
        .x(d => xScale(d.minute))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);

    // Add lines
    svg.append("path")
        .datum(createLineData(maleAvg))
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("path")
        .datum(createLineData(femaleOvulationAvg))
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("path")
        .datum(createLineData(femaleNonOvulationAvg))
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", 2)
        .attr("d", line);

    console.log("Paths added to SVG");

    // Add legend
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, 20)`);

    const legendData = [
        { color: "blue", label: "Male Avg Temp" },
        { color: "red", label: "Female Ovulation Temp" },
        { color: "purple", label: "Female Non-Ovulation Temp" }
    ];

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (_, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 20)
        .attr("y", (_, i) => i * 20 + 12)
        .text(d => d.label)
        .attr("font-size", "14px");

    console.log("Legend added");
}

// Load and visualize data
loadData();
