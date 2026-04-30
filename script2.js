let Data = {
    numberStats: {},
    cooccurrence: {}
};

// Initialize 1~49
for (let i = 1; i <= 49; i++) {
    Data.numberStats[i] = { appearances: 0, mainNumber: 0, lastSeen: "1970-01-01" };
    Data.cooccurrence[i] = {};
    for (let j = 1; j <= 49; j++) {
        Data.cooccurrence[i][j] = 0;
    }
}

// Load CSV data
d3.csv("Mark_Six.csv").then(data => {
    let drawCount = data.length;
    data.forEach(draw => {
        let mainNums = [
            +draw['Winning Number 1'],
            +draw['2'],
            +draw['3'],
            +draw['4'],
            +draw['5'],
            +draw['6']
        ];
        let extraNum = +draw['Extra Number'] || 0;
        let currentDate = draw.Date;

        // Main number statistics
        mainNums.forEach(n => {
            Data.numberStats[n].mainNumber++;
            Data.numberStats[n].appearances++;
            if (currentDate > Data.numberStats[n].lastSeen) {
                Data.numberStats[n].lastSeen = currentDate;
            }
        });

        // extra number statistics
        if (extraNum >= 1 && extraNum <= 49) {
            Data.numberStats[extraNum].appearances++;
            if (currentDate > Data.numberStats[extraNum].lastSeen) {
                Data.numberStats[extraNum].lastSeen = currentDate;
            }
        }

        // Co-occurrence
        for (let i = 0; i < 6; i++) {
            for (let j = i + 1; j < 6; j++) {
                let a = mainNums[i];
                let b = mainNums[j];
                Data.cooccurrence[a][b]++;
                Data.cooccurrence[b][a]++;
            }
        }
    });
});

// Co-occurring color configuration (low white, high red)
let colorScale;

function updateColorScale(maxCount) {
    colorScale = d3.scaleQuantize()
        .domain([0, maxCount])
        .range(["#ffffff", "#ffcccc", "#ff9999", "#ff6666", "#ff0000"]);
}

let selectedNumbers = new Set();
const maxSelections = 6;

// Number ball color
function getMarkSixColor(num) {
    const red = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
    const blue = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
    const green = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];
    if (red.includes(num)) return "#ff3131";
    if (blue.includes(num)) return "#0070ff";
    return "#28a745";
}

// Generate Numbered Balls (Preserving Image Style) 
const grid = document.getElementById("number-grid");
for (let i = 1; i <= 49; i++) {
    const ball = document.createElement('div');
    ball.className = 'num-ball';
    ball.style.borderColor = getMarkSixColor(i);

    const img = document.createElement('div');
    img.className = 'ball-img';
    img.style.backgroundImage = `url('images/ball-${i}.svg')`;

    const text = document.createElement('span');
    text.className = 'num-text';
    text.innerText = i;

    ball.appendChild(img);
    ball.appendChild(text);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("ball-ring");
    svg.setAttribute("viewBox", "0 0 100 100");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "47");
    circle.setAttribute("stroke", getMarkSixColor(i));
    circle.setAttribute("stroke-dasharray", "295 295");

    svg.appendChild(circle);
    ball.prepend(svg);

    ball.onmouseenter = () => {
        if (!ball.classList.contains('selected')) {
            text.style.color = getMarkSixColor(i);
        }
    };

    ball.onmouseleave = () => {
        if (!ball.classList.contains('selected')) {
            text.style.color = '';
        }
    };

    // Click to select
    ball.onclick = async () => {
        const num = i;
        const isSelected = ball.classList.contains('selected');

        if (isSelected) {
            selectedNumbers.delete(num);
            ball.classList.remove('selected');
            text.style.display = 'flex';
        } else {
            if (selectedNumbers.size >= maxSelections) {
                alert("You can only choose a maximum of 6 numbers!");
                return;
            }
            selectedNumbers.add(num);
            ball.classList.add('selected');
            text.style.display = 'none';
        }

        // Refresh co-occurrence colors + statistics
        await updateNumberVisualization();
        updateAllStats();
    };

    grid.appendChild(ball);
}

// Probability is represented by the completeness of the outer ring of the sphere.
async function updateNumberVisualization() {
    const selectedArr = Array.from(selectedNumbers);
    const circumference = 295; // Total length of the circle

    // No number selected then restore all circles
    if (selectedArr.length === 0) {
        document.querySelectorAll('.num-ball').forEach(ball => {
            const circle = ball.querySelector('circle');
            circle.style.display = "block";
            circle.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
            ball.style.opacity = "1";
            ball.style.backgroundColor = "transparent";
        });
        return;
    }

    let scoreMap = {};
    let allScores = [];

    // Calculate the score for each number.
    for (let ball of document.querySelectorAll('.num-ball')) {
        const num = parseInt(ball.querySelector('.num-text').innerText);
        if (selectedNumbers.has(num)) continue;

        let score = 0;
        if (selectedArr.length === 1) {
            const s = selectedArr[0];
            score = Data.cooccurrence[s][num];
        } else {
            const testCombo = [...selectedArr, num].sort((a, b) => a - b);
            score = await countComboAppearance(testCombo);
        }

        scoreMap[num] = score;
        allScores.push(score);
    }

    const maxScore = Math.max(...allScores, 1);

    // Updating circle length
    document.querySelectorAll('.num-ball').forEach(ball => {
        const num = parseInt(ball.querySelector('.num-text').innerText);
        const circle = ball.querySelector('circle');
        const color = getMarkSixColor(num);

        // Selected ball: Hidden outer ring, solid color
        if (selectedNumbers.has(num)) {
            circle.style.display = "none";
            ball.style.opacity = "1";
            ball.style.backgroundColor = "transparent";
            return;
        }

        // Unselected ball: Variations in both outer ring length and transparency
        circle.style.display = "block";
        const score = scoreMap[num] || 0;
        const percent = score / maxScore;

        // Outer ring length
        const visibleLength = percent * circumference;
        circle.setAttribute("stroke-dasharray", `${visibleLength} ${circumference}`);
        circle.setAttribute("stroke", color);

        // Fading transparency: Minimum 0.2 ~ Maximum 1
        const opacity = 0.2 + (percent * 0.8);
        ball.style.opacity = opacity;

        ball.style.backgroundColor = "transparent";
    });
}

// Dynamically updated legend
function updateLegend() {
    const legend = document.getElementById("dynamicLegend");
    if(!legend) return;
    legend.innerHTML = "";

    const range = colorScale.range();
    // Calculate the segmented threshold of scaleQuantize
    const thresholds = colorScale.thresholds();

    // Generate tags for each segment
    range.forEach((color, i) => {
        let start, end;
        if (i === 0) {
            start = colorScale.domain()[0];
            end = thresholds[0];
        } else if (i === range.length - 1) {
            start = thresholds[thresholds.length - 1];
            end = colorScale.domain()[1];
        } else {
            start = thresholds[i - 1];
            end = thresholds[i];
        }

        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `
            <span class="legend-color" style="background-color: ${color}; ${color === '#ffffff' ? 'border:1px solid #ddd;' : ''}"></span>
            <span class="legend-text">${start}-${end} ${i === 0 ? '(Low)' : i === range.length-1 ? '(High)' : ''}</span>
        `;
        legend.appendChild(item);
    });
}

// Number of times the combination appears
function countComboAppearance(combo) {
    return new Promise(resolve => {
        d3.csv("Mark_Six.csv").then(draws => {
            let count = 0;
            draws.forEach(draw => {
                const nums = [
                    +draw['Winning Number 1'],
                    +draw['2'],
                    +draw['3'],
                    +draw['4'],
                    +draw['5'],
                    +draw['6']
                ];
                const containsAll = combo.every(n => nums.includes(n));
                if (containsAll) count++;
            });
            resolve(count);
        });
    });
}

// Statistical Area Update 
async function updateAllStats() {
    const container = document.getElementById("statsContainer");
    const emptyState = document.getElementById("emptyState");
    const rightPanel = document.querySelector(".sidebar-right");
    
    if (selectedNumbers.size === 0) {
        container.style.display = "none";
        emptyState.style.display = "block";
        rightPanel.classList.remove("active");
        return;
    }
    
    container.style.display = "block";
    emptyState.style.display = "none";
    rightPanel.classList.add("active");

    const sorted = Array.from(selectedNumbers).sort((a, b) => a - b);
    d3.select("#statsIcons").html("");

    sorted.forEach(n => {
        d3.select("#statsIcons")
            .append("div")
            .attr("class", "stats-icon")
            .style("background-color", "transparent")
            .style("background-image", `url('images/ball-${n}.svg')`)
            .style("background-size", "cover")
            .style("background-position", "center")
            .style("width", "80px")
            .style("height", "80px")
            .style("border-radius", "50%")
            .style("margin-right", "4px")
            .text("");
    });

    d3.select("#selectedNumbersText").text(sorted.join(", "));

    if (selectedNumbers.size === 1) {
        updateStatsCard(sorted[0]);
    } else {
        await getCombinationStats(sorted);
    }

    await renderCompanionChart(sorted);
}

// Single number statistics
function updateStatsCard(num) {
    const stats = Data.numberStats[num];
    d3.select("#appearances").text(stats.appearances);
    d3.select("#frequency").text(((stats.appearances / 2522) * 100).toFixed(2) + "%");
    d3.select("#mainNumber").text(stats.mainNumber);
    d3.select("#lastSeen").text(stats.lastSeen);
}

// Combinatorial statistics
async function getCombinationStats(sortedNumbers) {
    const draws = await d3.csv("Mark_Six.csv");
        let comboCount = 0;
        let mainComboCount = 0;
        let lastDrawDate = "N/A";

        draws.forEach(draw => {
            const main = [
                +draw['Winning Number 1'], 
                +draw['2'], 
                +draw['3'],
                +draw['4'], 
                +draw['5'], 
                +draw['6']
            ];
            const extra = +draw['Extra Number'] || 0;
            const all = [...main, extra];
            const date = draw.Date;

            const inAll = sortedNumbers.every(n => all.includes(n));
            if (inAll) {
                comboCount++;
                if (lastDrawDate === "N/A" || date > lastDrawDate) {
                    lastDrawDate = date;
                }
            }

            const inMain = sortedNumbers.every(n => main.includes(n));
            if (inMain) mainComboCount++;
        });

        d3.select("#appearances").text(comboCount);
        d3.select("#frequency").text(((comboCount / draws.length) * 100).toFixed(2) + "%");
        d3.select("#mainNumber").text(mainComboCount);
        d3.select("#lastSeen").text(lastDrawDate);
}


// Co-occurrence bar chart
async function renderCompanionChart(selectedList) {
    const chartWrapper = document.getElementById("chartWrapper");
    const chartContainer = document.getElementById("companionChart");

    chartWrapper.style.display = "block";
    chartContainer.innerHTML = "";

    // Load data
    const draws = await d3.csv("Mark_Six.csv");

    const result = [];

    // For each unselected number n
    for (let n = 1; n <= 49; n++) {
        if (selectedList.includes(n)) continue;

        // Combination = All numbers you selected + n
        const combo = [...selectedList, n].sort((a, b) => a - b);

        // Calculate how many times this set of numbers actually appeared together
        let count = 0;
        for (const draw of draws) {
            const nums = [
                +draw['Winning Number 1'],
                +draw['2'],
                +draw['3'],
                +draw['4'],
                +draw['5'],
                +draw['6']
            ];

            // Check that every single one in the combo is in the winning numbers.
            const allIn = combo.every(x => nums.includes(x));
            if (allIn) count++;
        }

        result.push({ number: n, count: count });
    }

    // Take the top 10 with the most occurrences
    const top10 = result
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Drawing chart
    const margin = { top: 15, right: 20, bottom: 45, left: 40 };
    const width = chartContainer.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(chartContainer)
        .append("div")
        .style("position", "relative")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "chart-tooltip")
        .style("position", "fixed")
        .style("background", "#ffffff")
        .style("border", "1px solid #9333ea")
        .style("border-radius", "8px")
        .style("padding", "10px 14px")
        .style("box-shadow", "0 3px 10px rgba(0,0,0,0.2)")
        .style("pointer-events", "none")
        .style("z-index", "9999")
        .style("opacity", 0)
        .style("font-size", "14px");

    const x = d3.scaleBand()
        .domain(top10.map(d => d.number))
        .range([0, width - margin.left - margin.right])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    const maxY = d3.max(top10, d => d.count) || 1;

    const y = d3.scaleLinear()
        .domain([0, maxY])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll("rect")
        .data(top10)
        .enter()
        .append("rect")
        .attr("fill", "#9333ea")
        .attr("x", d => x(d.number))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count))

        // Mouse hover
        .on("mouseover", function(e, d) {
            d3.select(this).attr("fill", "#c084fc");
            
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Number ${d.number}</strong><br/>
                    Co-occurrence: ${d.count} times
                `)
                .style("left", (e.clientX + 15) + "px")
                .style("top", (e.clientY - 28) + "px");
        })
        
        // Mouse leave
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#9333ea");
            tooltip.style("opacity", 0);
        });

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#4a5568")
        .text("Companion Number");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#4a5568")
        .text("Co-occurrence Count");
}

// Pop-up control
const modalOverlay = document.getElementById("modalOverlay");
const infoBtn = document.getElementById("infoBtn");
const closeModal = document.getElementById("closeModal");

infoBtn.addEventListener("click", () => {
    modalOverlay.style.display = "flex";
});

closeModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
});

// Can also turn it off by clicking the background.
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
    }
});

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", async () => {
    // Clear selected numbers
    selectedNumbers.clear();

    // Restore all balls to an unselected state.
    document.querySelectorAll(".num-ball").forEach(ball => {
        ball.classList.remove("selected");
        ball.querySelector(".num-text").style.display = "flex";
        ball.style.backgroundColor = ""; // Clear heatmap colors
    });

    await updateNumberVisualization();
    updateAllStats();
});

// Download CSV file
document.getElementById('downloadBtn').addEventListener('click', () => {
    // File path
    const fileUrl = 'Mark_Six.csv';
    const fileName = 'Mark_Six.csv';
  
    // Create a temporary <a> tag to automatically click and download.
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
});

// ========== Left navigation buttons + page switching ==========
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

const pageIds = [
    "page-pick",
    "page-frequency",
    "page-hotcold",
    "page-cooccur",
    "page-random",
    "page-colour",
    "page-distribution",
    "page-prize",
    "page-trend"
];

const rightPanel = document.querySelector(".sidebar-right");
const panelStats = document.getElementById("panel-stats");
const panelFreq = document.getElementById("panel-frequency");
const panelCooccur = document.getElementById("panel-cooccur");

navBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
        // Button Style switching
        navBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // Pages switching
        pages.forEach(p => p.classList.remove("active-page"));
        document.getElementById(pageIds[idx]).classList.add("active-page");

        // Smart switching on the right panel
        if (pageIds[idx] === "page-pick") {
            rightPanel.style.display = "block";
            rightPanel.style.backgroundColor = ""; 
            panelStats.style.display = "block";
            panelFreq.style.display = "none";
            panelCooccur.style.display = "none";
        }
        else if (pageIds[idx] === "page-frequency") {
            rightPanel.style.display = "block";
            rightPanel.style.backgroundColor = "#ffe6e6";
            panelStats.style.display = "none";
            panelFreq.style.display = "block";
            panelCooccur.style.display = "none";

            resetAllBalls();
            startFrequencyPage();
        }
        else if (pageIds[idx] === "page-hotcold") {
            rightPanel.style.display = "none";
            rightPanel.classList.remove("active");

            startHotColdPage();
        }
        else if (pageIds[idx] === "page-cooccur") {
            rightPanel.style.display = "block";
            rightPanel.style.backgroundColor = "#e6f0ff";
            panelStats.style.display = "none"; 
            panelFreq.style.display = "none";
            panelCooccur.style.display = "block";
        
            startCooccurPage();
        }
        else if (pageIds[idx] === "page-random") {
            rightPanel.style.display = "none";
            rightPanel.style.backgroundColor = "#e6f0ff";
            panelStats.style.display = "none"; 
            panelFreq.style.display = "none";
            panelCooccur.style.display = "none";
        
            startRandomnessPage();
        }
        else {
            rightPanel.style.display = "none";
            rightPanel.classList.remove("active");

            resetAllBalls();
        }
    });
});

function resetAllBalls() {
    selectedNumbers.clear();

    document.querySelectorAll(".num-ball").forEach(ball => {
        ball.classList.remove("selected");
        const text = ball.querySelector(".num-text");
        if (text) text.style.display = "flex";

        ball.style.opacity = "1";
        ball.style.backgroundColor = "transparent";

        const circle = ball.querySelector("circle");
        if (circle) {
            circle.style.display = "block";
            circle.setAttribute("stroke-dasharray", "295 295");
        }
    });

    updateAllStats();
}

// ==============================
// Page 2: Frequency
// ==============================
let freqData = {};
let freqPositionData = [];

// Fixed layout parameters
const freqRows = 7;
const freqCols = 7;
const freqSpacing = 83.15;
const offsetX = -26;
const offsetY = 20;

// Generate coordinates 1–49
function generateFreqPositionData() {
    let arr = [];
    for (let i = 0; i < freqRows; i++) {
        for (let j = 0; j < freqCols; j++) {
            const n = i * freqCols + j + 1;
            arr.push({
                n: n,
                x: j * freqSpacing + offsetX,
                y: i * freqSpacing + offsetY
            });
        }
    }
    freqPositionData = arr;
}

// Create a dedicated DIV ball for Page 2
function generateFreqDivBalls() {
    const wrap = d3.select("#freq-ball-wrap");
    wrap.selectAll(".num-ball").remove();
    generateFreqPositionData();

    const balls = wrap.selectAll(".num-ball")
        .data(freqPositionData, d => d.n)
        .enter()
        .append("div")
        .attr("class", "num-ball")
        .style("left", d => d.x + "px")
        .style("top", d => d.y + "px");

    balls.append("div")
        .attr("class", "ball-img")
        .style("background-image", d => `url('images/ball-${d.n}.svg')`);

    balls.append("span")
        .attr("class", "num-text")
        .text(d => d.n);

    balls.each(function(d) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("ball-ring");
        svg.setAttribute("viewBox", "0 0 100 100");
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", "50");
        c.setAttribute("cy", "50");
        c.setAttribute("r", "47");
        c.setAttribute("stroke", getMarkSixColor(d.n));
        c.setAttribute("stroke-dasharray", "295 295");
        svg.appendChild(c);
        this.prepend(svg);
    });
}

// Load frequency
async function loadFrequencyData() {
    const data = await d3.csv("Mark_Six.csv");
    freqData = {};
  
    data.forEach(draw => {
        const allNumbers = [
            +draw['Winning Number 1'],
            +draw['2'],
            +draw['3'],
            +draw['4'],
            +draw['5'],
            +draw['6'],
            +draw['Extra Number']
        ];

        allNumbers.forEach(n => {
            if (n >= 1 && n <= 49) { 
            freqData[n] = (freqData[n] || 0) + 1;
            }
        });
    });
}

// Execute when entering Page 2
async function startFrequencyPage() {
    generateFreqPositionData();
    generateFreqDivBalls();
    await loadFrequencyData();

    sortByFreq();
}

// Sort By Frequency function
function sortByFreq() {
    const minCount = d3.min(Object.values(freqData));
    const maxCount = d3.max(Object.values(freqData));
    const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

    const sortedNums = Object.keys(freqData).map(Number).sort((a, b) => freqData[b] - freqData[a]);

    const newPosition = sortedNums.map((n, i) => ({
        n: n,
        x: freqPositionData[i].x,
        y: freqPositionData[i].y
    }));

    d3.select("#freq-ball-wrap")
        .selectAll(".num-ball")
        .data(newPosition, d => d.n)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
        .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
        .style("width", d => sizeScale(freqData[d.n]) + "px")
        .style("height", d => sizeScale(freqData[d.n]) + "px")
        .on("start", function() {
            d3.select(this).classed("selected", true);
            d3.select(this).select(".num-text").style("display", "none");
            d3.select(this).select(".ball-img").style("opacity", "1");
        });
}

// Size By Frequency function
function sizeByFreq() {
    const minCount = d3.min(Object.values(freqData));
    const maxCount = d3.max(Object.values(freqData));
    const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

    d3.select("#freq-ball-wrap")
        .selectAll(".num-ball")
        .data(freqPositionData, d => d.n)
        .transition()
        .duration(500)
        .delay((d, i) => i * 50)
        .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
        .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
        .style("width", d => sizeScale(freqData[d.n]) + "px")
        .style("height", d => sizeScale(freqData[d.n]) + "px")
        .on("start", function() {
            d3.select(this).classed("selected", true);
            d3.select(this).select(".num-text").style("display", "none");
            d3.select(this).select(".ball-img").style("opacity", "1");
        });
}

// Reset function
function resetFreqBalls() {
    d3.select("#freq-ball-wrap")
        .selectAll(".num-ball")
        .data(freqPositionData, d => d.n)
        .transition()
        .duration(500)
        .delay((d, i) => i * 10)
        .style("left", d => d.x + "px")
        .style("top", d => d.y + "px")
        .style("width", "70px")
        .style("height", "70px")
        .on("end", function() {
            d3.select(this).select(".num-text").style("display", "flex");
            d3.select(this).select(".ball-img").style("opacity", "0");
            d3.select(this).classed("selected", false);
        });
}

// Button binding
document.getElementById("btnSortFreq").onclick = sortByFreq;
document.getElementById("btnSizeFreq").onclick = sizeByFreq;
document.getElementById("btnResetFreq").onclick = resetFreqBalls;

// ==============================
// Page 3: Hot & Cold
// ==============================
async function startHotColdPage() {
    await loadFrequencyData();
  
    const freqArray = Object.entries(freqData)
      .map(([n, count]) => ({ n: +n, count }));
  
    const sortedHot = [...freqArray].sort((a, b) => b.count - a.count).slice(0, 10);
    const sortedCold = [...freqArray].sort((a, b) => a.count - b.count).slice(0, 10);
  
    const maxCount = d3.max(freqArray, d => d.count);
  
    // Hot list
    const hotList = d3.select("#hot-list");
    hotList.html("");
  
    sortedHot.forEach((item, i) => {
        const row = hotList.append("div").attr("class", "hc-item");
        row.append("span").attr("class", "hc-rank").text(`#${i + 1}`);
  
        // Top 1-3 = 你原本的 SVG 球
        if (i < 3) {
            const svgWrap = row.append("div").attr("class", "hc-ball-svg");
            svgWrap.append("img")
                .attr("src", `images/ball-${item.n}.svg`)
                .attr("alt", item.n)
                .style("width", "100%")
                .style("height", "100%");
        } else {
            row.append("div")
                .attr("class", "hc-ball")
                .style("border-color", getMarkSixColor(item.n))
                .text(item.n);
        }
  
        const bar = row.append("div").attr("class", "hot-bar");
        bar.append("div")
            .attr("class", "hot-bar-fill")
            .style("width", `${(item.count / maxCount) * 100}%`);
  
        row.append("span").attr("class", "hc-count").text(item.count);
    });
  
    // Cold list
    const coldList = d3.select("#cold-list");
    coldList.html("");
  
    sortedCold.forEach((item, i) => {
        const row = coldList.append("div").attr("class", "hc-item");
        row.append("span").attr("class", "hc-rank").text(`#${i + 1}`);
  
        if (i < 3) {
            const svgWrap = row.append("div").attr("class", "hc-ball-svg");
            svgWrap.append("img")
                .attr("src", `images/ball-${item.n}.svg`)
                .attr("alt", item.n);
        } else {
            row.append("div")
                .attr("class", "hc-ball")
                .style("border-color", getMarkSixColor(item.n))
                .text(item.n);
        }
  
        const bar = row.append("div").attr("class", "cold-bar");
        bar.append("div")
            .attr("class", "cold-bar-fill")
            .style("width", `${(item.count / maxCount) * 100}%`);
  
        row.append("span").attr("class", "hc-count").text(item.count);
    });
}

// ==============================
// Page 4: Co-occurrence
// ==============================
let markSixData = [];
let matrix;
let minRange = 0;
let maxRange = 0;
let mid = 0;
let allValues;
let strokeScale;
let opacityScale;
let selectedIndex = -1;
let activePair = null;

async function startCooccurPage() {
	markSixData = await loadCSVData();
	countPairwiseNumbers();

    maxRange = Math.max(...matrix.flat()); 
	minRange = Math.min(...matrix.flat().filter(v => v > 0));
	mid = Math.floor((maxRange + minRange) / 2);
	
	strokeScale = d3.scaleLinear()
		.domain([minRange, maxRange])
		.range([0.1, 10]);
	
	opacityScale = d3.scaleLinear()
		.domain([minRange, maxRange])
		.range([0.1, 1.0])
		.clamp(true);

	document.getElementById('thresholdSlider').setAttribute('min', minRange);
	document.getElementById('thresholdSlider').setAttribute('max', maxRange);
	document.getElementById('thresholdSlider').setAttribute('value', mid);
	document.getElementById('range-value').innerText = mid;
	document.getElementById('min-range').innerText = minRange;
	document.getElementById('max-range').innerText = maxRange;
		
    drawChordDiagram(mid);

	const slider = document.getElementById('thresholdSlider');
	slider.addEventListener('input', function() {
		const threshold = +this.value;
		drawChordDiagram(threshold);

		document.getElementById('thresholdSlider').setAttribute('value', threshold);
        document.getElementById('range-value').value = threshold;
		resetDiagram(threshold);
	});
	
	const box = document.getElementById('clickable-box');
	box.addEventListener('click', () => resetDiagram(mid));
	
	renderTopPairs();
}

function updateRangeValue(val) {
	rangeValue = val;
	document.getElementById('range-value').textContent = val;
}
	
function handleNodeClick(event, d) {
	selectedIndex = d.index;
	const threshold = +document.getElementById('thresholdSlider').value;

	let tempMax = Math.max(...matrix[selectedIndex]);
	strokeScale = d3.scaleLinear()
		.domain([threshold, tempMax])
		.range([1, 10]);
		
	opacityScale = d3.scaleLinear()
		.domain([threshold, tempMax])
		.range([0.5, 1])
		.clamp(true);
		
	let connectedIndices = new Set([selectedIndex]);

	d3.selectAll(".ribbon")
//		.transition()
//		.duration(200)
		.style("stroke-width", d => strokeScale(d.source.value) + "px")
		.style("opacity", ribbon => {
			const isConnected = ribbon.source.index === selectedIndex || ribbon.target.index === selectedIndex;
			const isAboveThreshold = ribbon.source.value >= threshold;
						
			if (isConnected && isAboveThreshold) {
				connectedIndices.add(ribbon.source.index);
				connectedIndices.add(ribbon.target.index);
			}
						
			return (isConnected && isAboveThreshold)
				? opacityScale(ribbon.source.value) : 0.02; // 0.9
		});
					
	d3.selectAll(".labels")
		.select("circle")
		.style("fill", function(group) {
			return connectedIndices.has(group.index) ? getMarkSixColor(group.index) : "white";
		});
		
	d3.selectAll(".labels")
		.filter(group => connectedIndices.has(group.index))
		.select("text")
		.style("opacity", 1);

	event.stopPropagation();
}

function drawChordDiagram(threshold) {
	const width = 800; //400
	const height = 800; //400
	const outerRadius = Math.min(width, height) * 0.5 - 80; // 40
	const innerRadius = outerRadius - 40; // 20
	const labelRadius = outerRadius + 30; // 15

	strokeScale = d3.scaleLinear()
		.domain([threshold, maxRange])
		.range([1, 10])
		.clamp(true);

	opacityScale = d3.scaleLinear()
		.domain([threshold, maxRange])
		.range([0.3, 1.0]);
		
	const chord = d3.chord()
		.padAngle(0.02) // 0.05
		.sortSubgroups(d3.descending);

	const chords = chord(matrix);
		
    const container = d3.select("#cooccur-svg-container");
    container.html("");
    svg = container.append("svg")
	   .attr("viewBox", [-width / 2, -height / 2, width, height]);
		
	const ribbonGroup = svg.append("g").attr("id", "ribbon-container");
	const arcGroup = svg.append("g").attr("id", "arc-container");
	const labelGroup = svg.append("g").attr("id", "label-container");
		
	const group = arcGroup.selectAll("g")
		.data(chords.groups)
		.join("g")
		.attr("class", "group")
		.style("cursor", "pointer")
		.on("click", handleNodeClick);
			
	group.append("path")
		.attr("fill", d => getMarkSixColor(d.index))
		.attr("stroke", d => d3.rgb(getMarkSixColor(d.index)).darker())
		.attr("d", d3.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius)
		);

	ribbonGroup.style("fill-opacity", 0.67)
		.selectAll("path")
		.data(chords.map(d => {
				const sourceGroup = chords.groups[d.source.index];
				const targetGroup = chords.groups[d.target.index];
				const sourceMid = (sourceGroup.startAngle + sourceGroup.endAngle) / 2;
				const targetMid = (targetGroup.startAngle + targetGroup.endAngle) / 2;
				return {
					...d, 
					source: {
						...d.source,
						startAngle: sourceMid,
						endAngle: sourceMid
					},
					target: {
						...d.target,
						startAngle: targetMid,
						endAngle: targetMid
					}
				};
		}))
		.join("path")
			.attr("class", "ribbon")
			.attr("d", d3.ribbon().radius(innerRadius))
			.attr("fill", "none")
			.attr("stroke", d => d3.rgb(getMarkSixColor(d.source.index)).darker())
			.style("vector-effect", "non-scaling-stroke")
			.attr("stroke-width", d => strokeScale(d.source.value) + "px")
			.style("stroke-opacity", d => opacityScale(d.source.value)) // 0.8
			//.append("title")
			//	.text(d => `${allValues[d.source.index]} \u{2194} ${allValues[d.target.index]}: ${d.source.value}`) ;
					
	const labels = labelGroup.selectAll("g")
		.data(chords.groups)
		.join("g")
		.attr("class", "labels")
		.attr("transform", d => {
			return `
				rotate(${((d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90)})
				translate(${labelRadius})
				${"rotate(90)"}
			`;
		})
		.on("click", handleNodeClick)
		.style("cursor", "pointer");
		
	const text = labels.append("text")
		.attr("dy", "0.35em")
		.attr("text-anchor", "middle")
		.text(d => d.index + 1)
		.style("font-family", "sans-serif")
		.style("font-size", "20px") // 10px
		.style("font-weight", "bold")
		.style("cursor", "default")
		.style("user-select", "none")
		.style("pointer-events", "none");
		
	labels.insert("circle", "text")
		.attr("fill", "white")
		.attr("stroke", d => getMarkSixColor(d.index))
		.attr("stroke-width", 2) // 1
		.attr("r", "20px"); // 10px
			
	svg.on("click", () => {
		const threshold = +document.getElementById('thresholdSlider').value;
		resetDiagram(threshold);
	});
}
	
function resetDiagram(threshold) {
	document.getElementById('thresholdSlider').value = threshold;
	//updateRangeValue(mid);
	updateRangeValue(threshold);
	
	d3.selectAll(".ribbon")
//		.transition()
//		.duration(200)
		.style("opacity", d => {
			return d.source.value >= threshold ? opacityScale(d.source.value) : 0 // 0.7
		})
		.style("pointer-events", d => {
			return d.source.value >= threshold ? "auto" : "none";
		})
		.style("stroke", d => d3.rgb(getMarkSixColor(d.source.index)).darker());
			
		d3.selectAll(".labels")
			.select("circle")
			.style("fill", "white");
				
	d3.selectAll(".group").style("opacity", 1);
	drawChordDiagram(threshold);
	selectedIndex = -1;
}

async function loadCSVData() {
	try {
		const response = await fetch('Mark_Six.csv');
		const data = await response.text();
			
		const rows = data.split('\n').filter(row => row.trim() !== '').slice(1);
			
		return rows.map(row => {
			const columns = row.split(',');
			return {
				date: columns[1],
				numbers: [3,4,5,6,7,8,9].map(i => columns[i]?.trim()),
				special: columns[9]?.trim()
			};
		});
	} catch (error) {
		console.log("Cound not load CSV:", error);
		return [];
	}
}
	
function countPairwiseNumbers() {
	allValues = [...new Set(markSixData.flatMap(d => d.numbers))].sort((a, b) => a - b);
	const size = allValues.length;
	const indexMap = new Map(allValues.map((v, i) => [v, i]));
	matrix = Array.from({length: size}, () => Array(size).fill(0));
		
	markSixData.forEach(obj => {
		const arr = obj.numbers;
		arr.forEach(sourceVal => {
			arr.forEach(targetVal => {
				if (sourceVal !== targetVal) {
					const i = indexMap.get(sourceVal);
					const j = indexMap.get(targetVal);
					matrix[i][j]++;
				}
			});
		});
	});
}
		
async function renderTopPairs() {
	if (!matrix) return;

	// Top 10 pairs
	const topPairs = await getTopPairs(10);

    const container = document.getElementById("top-pairs-container");
    container.innerHTML = "";
  
    topPairs.forEach(p => {
        const el = document.createElement("div");
        el.className = "pair-card";
        
        el.onclick = () => {
            if (activePair?.a === p.a && activePair?.b === p.b) {
              activePair = null;
              resetChords();
            } else {
              activePair = { a: p.a, b: p.b };
              highlightChord(p.a, p.b);
            }
        };

		el.innerHTML = `
            <div class="pair-left">
                <div class="pair-ball purple">${p.a}</div>
                <span class="pair-arrow">↔</span>
                <div class="pair-ball blue">${p.b}</div>
            </div>
            <div class="pair-right">
                <div class="pair-count">${p.cnt}</div>
                <span class="pair-text">times</span>
            </div>
        `;
		container.appendChild(el);
    });
}

async function getTopPairs(count = 9) {
	let pairs = [];
	
	for (let i = 0; i< matrix.length; i++) {
		for (let j = i + 1; j < matrix[i].length; j++) {
			if (matrix[i][j] > 0) {
				pairs.push({
					a: allValues[i],
					b: allValues[j],
					cnt: matrix[i][j]
				});
			}
		}
	}
	pairs.sort((a, b) => b.cnt - a.cnt);
		
	return pairs.slice(0, count);
}

function highlightChord(num1, num2) {
	const sourceIndex = allValues.indexOf(num1);
	const targetIndex = allValues.indexOf(num2);
	
	if (sourceIndex === -1 || targetIndex === -1) {
		console.log("Number not found:", num1, num2);
		return;
	}
	
	d3.selectAll(".ribbon")
		.style("opacity", d => {
			return (d.source.index === sourceIndex && d.target.index === targetIndex) ||
			(d.target.index === sourceIndex && d.source.index === targetIndex) ? 1 : 0.2; // 0.02
		})
		.style("stroke-width", d => {
			return ((d.source.index === sourceIndex && d.target.index === targetIndex) ||
			(d.target.index === sourceIndex && d.source.index === targetIndex)) ? 10 : strokeScale(d.source.value);
		});
}

function resetChords() {
	const threshold = +document.getElementById('thresholdSlider').value;
	resetDiagram(threshold);
}


  
// To fixed the bug that page 1 showing wrong panel by default
window.addEventListener('DOMContentLoaded', () => {
    // Find the currently active page
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) {
        const idx = Array.from(navBtns).indexOf(activeBtn);
        // Manually trigger a click event to initialize the panel.
        navBtns[idx].click();
    }
});

// ==============================
// Page 5: Randomness
// ==============================
async function startRandomnessPage() {
    // Load data
    const data = await d3.csv("Mark_Six.csv");

    // Count the number of times each number appears
    const numCounts = {};
    for (let n = 1; n <= 49; n++) numCounts[n] = 0;

    // Calculate the sum of the 6 numbers in each period.
    const sumList = [];

    data.forEach(row => {
        const nums = [
            +row["Winning Number 1"],
            +row["2"],
            +row["3"],
            +row["4"],
            +row["5"],
            +row["6"]
        ].filter(x => !isNaN(x));

        // Number of frequencies
        nums.forEach(n => {
            if (n >= 1 && n <= 49) numCounts[n]++;
        });

        // Total for each draw
        if (nums.length === 6) {
            const sum = nums.reduce((a, b) => a + b, 0);
            sumList.push(sum);
        }
    });

    // Left Individual statistics
    const values = Object.values(numCounts);
    const avg = d3.mean(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = d3.variance(values);
    const randomness = variance < 30 ? "✅ Approx Uniform" : "❌ Not Uniform";

    document.getElementById("avg-count").innerText = avg.toFixed(1);
    document.getElementById("min-count").innerText = min;
    document.getElementById("max-count").innerText = max;
    document.getElementById("variance").innerText = variance.toFixed(2);
    document.getElementById("random-result").innerText = randomness;

    // Right Sum statistics
    const sumMean = d3.mean(sumList);
    const sumMin = Math.min(...sumList);
    const sumMax = Math.max(...sumList);
    const sumStd = d3.deviation(sumList);
    // Reasonable range of standard deviation, Determine whether it is close to the normal range
    const normalCheck = sumStd > 25 && sumStd < 55 
        ? "✅ Approx Normal" 
        : "❌ Skewed";

    document.getElementById("sum-mean").innerText = sumMean.toFixed(1);
    document.getElementById("sum-min").innerText = sumMin;
    document.getElementById("sum-max").innerText = sumMax;
    document.getElementById("sum-std").innerText = sumStd.toFixed(2);
    document.getElementById("normal-result").innerText = normalCheck;

    // Draw the Chart
    drawIndividualChart(numCounts);
    drawSumChart(sumList);
}

// Left: Number of occurrences of numbers 1-49
function drawIndividualChart(counts) {
    const container = d3.select("#chart-individual");
    container.html("");

    // Floating tooltip
    const tooltip = d3.select("body").append("div")
        .attr("id", "chart-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("font-size", "14px")
        .style("z-index", 1000)
        .style("display", "none");
        
    const margin = { top:20, right:0, bottom:50, left:25 };
    const w = 800;
    const h = 450;

    const svg = container.append("svg")
        .attr("width", w)
        .attr("height", h);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const data = [];
    for (let n=1; n<=49; n++) {
        data.push({ num:n, count:counts[n] });
    }

    const x = d3.scaleBand()
        .domain(data.map(d => d.num))
        .range([0, innerW])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d=>d.count) + 5])
        .range([innerH, 0]);

    // bar with hover effect
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.num))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => innerH - y(d.count))
        .attr("fill", "#4285F4")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#1976D2");
            tooltip.style("display", "block")
                .html(`Number: ${d.num}<br>Frequency: ${d.count}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#4285F4");
            tooltip.style("display", "none");
        });

    // mean line
    const avg = d3.mean(data, d=>d.count);
    g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(avg))
        .attr("y2", y(avg))
        .attr("stroke", "red")
        .attr("stroke-width",2)
        .attr("stroke-dasharray","4,4");

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size",9);

    g.append("g")
        .call(d3.axisLeft(y));
}

// Left：Sum of 6 numbers
function drawSumChart(sumList) {
    const container = d3.select("#chart-sum");
    container.html("");

    // Floating tooltip
    const tooltip = d3.select("body").append("div")
        .attr("id", "chart-tooltip-sum")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("font-size", "14px")
        .style("z-index", 1000)
        .style("display", "none");


    const margin = { top:20, right:20, bottom:50, left:60 };
    const w = 700;
    const h = 450;

    const svg = container.append("svg")
        .attr("width", w)
        .attr("height", h);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([d3.min(sumList), d3.max(sumList)])
        .range([0, innerW]);

    const bins = d3.histogram()
        .domain(x.domain())
        .thresholds(20)
        (sumList);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d=>d.length) + 2])
        .range([innerH, 0]);

    // bar with hover effect
    g.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => innerH - y(d.length))
        .attr("fill", "#ff6b6b")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#e53935");
            tooltip.style("display", "block")
                .html(`Sum: ${d.x0} - ${d.x1}<br>Count: ${d.length}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#ff6b6b");
            tooltip.style("display", "none");
        });

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));
}
