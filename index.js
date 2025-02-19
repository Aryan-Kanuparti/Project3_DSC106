// Debug process

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

// Add slider to the page
d3.select("#d3-graph").append("input")
    .attr("type", "range")
    .attr("id", "timeSlider")
    .attr("min", 0)
    .attr("max", 1440)
    .attr("value", 1440)
    .attr("step", 10)
    .style("width", "100%");


// X and Y scales
const xScale = d3.scaleLinear().domain([0, 1440]).range([0, width]);  // 1440 minutes = 24 hours
const yScale = d3.scaleLinear().domain([35, 39]).range([height, 0]);  // Temperature range

// X and Y axes
const xAxis = d3.axisBottom(xScale).tickFormat(d => `${Math.floor(d / 60)}h`); // Convert to hours
const yAxis = d3.axisLeft(yScale);

// Append axes
svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);
svg.append("g").call(yAxis);

// Add axis labels
svg.append("text") // X-axis label
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Time of Day (Hours)");

svg.append("text") // Y-axis label
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Body Temperature (°C)");



// Function to load and process data
async function loadData() {
    try {
        const femData = await d3.csv("data/Fem_Temp.csv", d3.autoType);
        const maleData = await d3.csv("data/Male_Temp.csv", d3.autoType);


        // Ensure numeric conversion
        femData.forEach(d => {
            Object.keys(d).forEach(key => {
                d[key] = +d[key]; // Convert all temperature values to numbers
            });
        });
        
        maleData.forEach(d => {
            Object.keys(d).forEach(key => {
                d[key] = +d[key]; // Convert all temperature values to numbers
            });
        });
        

        const numMinutes = 1440;
        const ovulationDays = [2, 6, 10, 14];
        const nonOvulationDays = [1, 3, 4, 5, 7, 8, 9, 11, 12, 13];

        // function aggregateTemperature(data, selectedDays) {
        //     let avgTemp = new Array(1440).fill(0);
        //     let count = new Array(1440).fill(0);
        
        //     selectedDays.forEach(day => {
        //         let startIdx = (day - 1) * 1440; // Start of the day
        
        //         for (let i = 0; i < 1440; i++) {
        //             let tempSum = 0;
        //             let tempCount = 0;
        
        //             // Sum across all temperature columns (e.g., f1, f2, ..., fN)
        //             Object.keys(data[i]).forEach(key => {
        //                 if (!isNaN(data[i][key])) {
        //                     tempSum += data[i][key];
        //                     tempCount += 1;
        //                 }
        //             });
        
        //             if (tempCount > 0) {
        //                 avgTemp[i] += tempSum / tempCount;
        //                 count[i] += 1;
        //             }
        //         }
        //     });
        
        //     return avgTemp.map((sum, i) => (count[i] > 0 ? sum / count[i] : NaN));
        // }


        function aggregateTemperature(data, selectedDays) {
            let avgTemp = new Array(1440).fill(0);
            let count = new Array(1440).fill(0);
        
            selectedDays.forEach(day => {
                let startIdx = (day - 1) * 1440; // Start of the day
        
                for (let i = 0; i < 1440; i++) {
                    let tempSum = 0;
                    let tempCount = 0;
        
                    // Make sure i is correctly offset
                    let dataIdx = startIdx + i;
                    if (dataIdx >= data.length) continue; // Avoid out-of-bounds access
        
                    Object.values(data[dataIdx]).forEach(value => {
                        if (typeof value === "number" && !isNaN(value)) {
                            tempSum += value;
                            tempCount += 1;
                        }
                    });
        
                    if (tempCount > 0) {
                        avgTemp[i] += tempSum / tempCount;
                        count[i] += 1;
                    }
                }
            });
        
            return avgTemp.map((sum, i) => (count[i] > 0 ? sum / count[i] : NaN));
        }
        
        

        // Get averages for each condition
        const maleAvg = aggregateTemperature(maleData, Array.from({ length: 14 }, (_, i) => i + 1));
        const femaleOvulationAvg = aggregateTemperature(femData, ovulationDays);
        const femaleNonOvulationAvg = aggregateTemperature(femData, nonOvulationDays);



        // Convert to line chart format
        const createLineData = (temps) => {
            const result = temps
                .map((temp, i) => ({ minute: i, temp }))
                .filter(d => d.temp !== undefined && d.temp !== null && !isNaN(d.temp)); 
        

            return result;
        };
        

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.minute))
            .y(d => yScale(d.temp))
            .curve(d3.curveMonotoneX);



        function updateGraph(maxMinute) {
                // Filter data based on slider position
                function filterData(temps) {
                    return temps
                        .map((temp, i) => ({ minute: i, temp }))
                        .filter(d => d.minute <= maxMinute && !isNaN(d.temp));
                }
            
                // Update paths dynamically
                d3.select("#maleLine").datum(filterData(maleAvg))
                    .attr("d", line);
                
                d3.select("#femaleNonOvLine").datum(filterData(femaleNonOvulationAvg))
                    .attr("d", line);
            
                d3.select("#femaleOvLine").datum(filterData(femaleOvulationAvg))
                    .attr("d", line);
            }



        // Add lines
        svg.append("path")
            .attr("id", "maleLine")
            .datum(createLineData(maleAvg))
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.append("path")
            .attr("id", "femaleNonOvLine")
            .datum(createLineData(femaleNonOvulationAvg))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.append("path") // Move ovulation line here (LAST)
            .attr("id", "femaleOvLine")
            .datum(createLineData(femaleOvulationAvg))
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", line)
            .raise(); // Ensures it's brought to the front


        console.log("Paths added to SVG");

        d3.select("#timeSlider").on("input", function() {
            updateGraph(+this.value);
        });
        updateGraph(numMinutes);

        // Add legend
        const legend = svg.append("g").attr("transform", `translate(${width - 200}, 20)`);

        const legendData = [
            { color: "blue", label: "Male Avg Temp", id: "maleLine" },
            { color: "purple", label: "Female Ovulation Temp",id: "femaleOvLine" },
            { color: "red", label: "Female Non-Ovulation Temp", id:"femaleNonOvLine" }
        ];
        //toggle legend
        const legendItems = legend.selectAll(".legendItem")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legendItem")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`) // Spaced out better
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            const line = d3.select(`#${d.id}`);
            const isHidden = line.style("display") === "none";
            line.style("display", isHidden ? "inline" : "none"); // Toggle visibility
        });
    
    // Color box
    legendItems.append("rect")
        .attr("x", 0)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => d.color);
    
    // Legend text
    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .text(d => d.label)
        .attr("font-size", "14px");

    legend.append("text")
        .attr("x", 0)
        .attr("y", -10) // Position above the legend
        .text("Click Legend to Toggle Data")
        .attr("class", "legendary")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "black");

        console.log("Legend added");
    } catch (error) {
        console.error("Error loading data:", error);
    }
}



document.addEventListener("DOMContentLoaded", async function () {
    const graphSelector = document.getElementById("graph-selector");
    const daySelector = document.getElementById("extra-dropdown")

    graphSelector.addEventListener("change", async function () {

        if (graphSelector.value === "graph1") {
            daySelector.style.display = "none";
            daySelector.style.display = "none";
            d3.select("#maleLine").remove();
            d3.select("#femaleNonOvLine").remove();
            d3.select("#femaleOvLine").remove();
            d3.select("#femaleLine").remove();
            await loadData()
        } else if (graphSelector.value === "graph2") {
            d3.selectAll(".legendItem").remove();
            d3.select("g").select(".legendary").remove();


            const femData = await d3.csv("data/Fem_Temp.csv", d3.autoType);
            const maleData = await d3.csv("data/Male_Temp.csv", d3.autoType);
            
            const femAverages = [];
            const maleAverages = [];
    
            femData.forEach(row => {
                const values = Object.values(row); // Extract values
                const sum = values.reduce((acc, val) => acc + val, 0); // Sum values
                 const avg = sum / values.length; // Compute average
                femAverages.push(avg);
            });
    
            maleData.forEach(row => {
                const values = Object.values(row); // Extract values
                const sum = values.reduce((acc, val) => acc + val, 0); // Sum values
                const avg = sum / values.length; // Compute average
                maleAverages.push(avg);
            })
    
    
            const numMinutes = 1440;

            daySelector.style.display = "block";
            daySelector.style.display = "block";

            d3.select("#maleLine").remove();
            d3.select("#femaleNonOvLine").remove();
            d3.select("#femaleOvLine").remove();
            d3.select("#femaleLine").remove();

            let maleFilter = maleAverages.slice(numMinutes * (1 -1), numMinutes * 1);
            console.log(maleFilter)
            let femaleFilter = femAverages.slice(numMinutes * (1 -1), numMinutes * 1);
            console.log(femaleFilter)


            daySelector.addEventListener("change", function(){
                const number = parseInt(daySelector.value.slice(6), 10)
                console.log(number)
                maleFilter = maleAverages.slice(numMinutes * (number -1), numMinutes * number);
                femaleFilter = femAverages.slice(numMinutes * (number -1), numMinutes * number);
                d3.select("#maleLine").remove();
                d3.select("#femaleNonOvLine").remove();
                d3.select("#femaleOvLine").remove();
                d3.select("#femaleLine").remove();
                const line = d3.line()
                .x(d => xScale(d.minute))
                .y(d => yScale(d.temp))
                .curve(d3.curveMonotoneX);
    
                const createLineData = (temps) => {
                    const result = temps
                        .map((temp, i) => ({ minute: i, temp }))
                        .filter(d => d.temp !== undefined && d.temp !== null && !isNaN(d.temp)); 
                
        
                    return result;
                };
    
                svg.append("path")
                .attr("id", "maleLine")
                .datum(createLineData(maleFilter))
                .attr("fill", "none")
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("d", line);
    
                svg.append("path")
                .attr("id", "femaleLine")
                .datum(createLineData(femaleFilter))
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);

            })

            const line = d3.line()
            .x(d => xScale(d.minute))
            .y(d => yScale(d.temp))
            .curve(d3.curveMonotoneX);

            const createLineData = (temps) => {
                const result = temps
                    .map((temp, i) => ({ minute: i, temp }))
                    .filter(d => d.temp !== undefined && d.temp !== null && !isNaN(d.temp)); 
            
    
                return result;
            };

            svg.append("path")
            .attr("id", "maleLine")
            .datum(createLineData(maleFilter))
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", line);

            svg.append("path")
            .attr("id", "femaleLine")
            .datum(createLineData(femaleFilter))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);


            

    
    

        }


    });

    await loadData();

});

